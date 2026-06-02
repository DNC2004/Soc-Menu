const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());

const DATA_DIR = path.join(__dirname, "Private");

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

app.listen(3000, () => {
  console.log("API running on http://localhost:3000");
});