const express = require("express");
const router = express.Router();

// Simple test functions
const testFunction = (req, res) => {
  res.json({ message: "Test function working" });
};

// Test route
router.post("/test", testFunction);

module.exports = router;
