const express = require("express");
const router = express.Router();

// Test endpoint to verify CORS is working
router.get("/cors-test", (req, res) => {
  res.json({
    success: true,
    message: "CORS is working!",
    timestamp: new Date().toISOString(),
    version: "v2024-12-01-16:25", // Update this timestamp when deploying
    headers: {
      origin: req.get("origin"),
      host: req.get("host"),
    },
  });
});

module.exports = router;
