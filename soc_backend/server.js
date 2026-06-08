const express = require("express");
const fs = require("fs");
const path = require("path");
//const cors = require("cors");
const multer = require("multer");

const app = express();
//app.use(cors());

const DATA_DIR = path.join(__dirname, "Private");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "Private"));
  },
  filename: (req,file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({storage});

app.get("/api/analyses", (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR);

    const analyses = files
      .filter(f => f.endsWith(".json"))
      .map(file => {
        const content = fs.readFileSync(
          path.join(DATA_DIR, file),
          "utf-8"
        );
        return JSON.parse(content);
      });

    res.json(analyses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read data" });
  }
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  console.log("Uploaded:", req.file);
  res.json({success: true});
});

app.listen(3000, "0.0.0.0", () => {
  console.log("API running on port 3000");
});