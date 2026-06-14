// Dependencies for the backend
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const app = express();

//const cors = require("cors");
//app.use(cors());

// Cache Vars for fetching reports
let cache = null;
let cacheTime = 0;
const CACHE_TIMEOUT = 300000; // Max Time until the server goes fetching for reports (5 minutes)

// Database path
const DATA_DIR = path.join(__dirname, "Private");

// Configure how uploaded files are stored
const storage = multer.diskStorage({
  destination: (req, file, cb) => { // Saves uploaded files in the Private directory
    cb(null, path.join(__dirname, "Private"));
  },
  filename: (req,file, cb) => { 
    cb(null, file.originalname);
  }
});

const upload = multer({storage});

// Helper function to load data from the database in a more eficient way
async function loadAnalyses() {
  const files = await fs.promises.readdir(DATA_DIR); // Gets the files from the designated directory
  const jsonFiles = files.filter( f => f.endsWith(".json")); // Checks for only the ones in json, report file type

  const analyses = await Promise.all(
    jsonFiles.map(async file => {
      const content = await fs.promises.readFile(path.join(DATA_DIR, file), "utf-8");
      return JSON.parse(content);
    })
  );
  return analyses
}

// Endpoint that returns all analysis JSON files
app.get("/api/analyses", async (req, res) => {
  try {
    if (cache && Date.now() - cacheTime < CACHE_TIMEOUT){
      console.log("INFO -- No new reports, loading the ones in cache")
      return res.json(cache); // If there is cache the server doesnt need to go fetch reports
    }

    console.log("INFO -- New reports/no cache found fetching data")
    const analyses = await loadAnalyses()
    cache = analyses;
    cacheTime = Date.now();
    res.json(analyses); // Sends it back to the frontend

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read data" });
  }
});

// Endpoint for file uploads
app.post("/api/upload", upload.single("file"), (req, res) => {
  console.log("INFO -- Uploaded:", req.file);
  cache = null
  res.json({success: true});
});

// Listen on port 3000 on all network interfaces
app.listen(3000, "0.0.0.0", () => {
  console.log("INFO -- API running on port 3000");
});