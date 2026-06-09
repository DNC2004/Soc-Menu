// Dependencies for the backend
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const app = express();

//const cors = require("cors");
//app.use(cors());

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

// Endpoint that returns all analysis JSON files
app.get("/api/analyses", (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR); // Reads the database

    const analyses = files // Keeps only JSON files 
      .filter(f => f.endsWith(".json"))
      .map(file => {
        const content = fs.readFileSync( // Reads the file contents
          path.join(DATA_DIR, file),
          "utf-8"
        );
        return JSON.parse(content);
      });

    res.json(analyses); // Sends it back to the frontend
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read data" });
  }
});

// Endpoint for file uploads
app.post("/api/upload", upload.single("file"), (req, res) => {
  console.log("INFO -- Uploaded:", req.file);
  res.json({success: true});
});

// Listen on port 3000 on all network interfaces
app.listen(3000, "0.0.0.0", () => {
  console.log("INFO -- API running on port 3000");
});