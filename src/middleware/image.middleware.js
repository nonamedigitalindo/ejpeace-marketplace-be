const fs = require("fs");
const path = require("path");

// Middleware to validate image paths
const validateImagePaths = (req, res, next) => {
  // This middleware can be used to validate image paths if needed
  next();
};

// Function to check if image file exists
const imageExists = (imagePath) => {
  if (!imagePath) return false;

  try {
    // Extract the filename from the path
    const urlParts = imagePath.split("/");
    const filename = urlParts[urlParts.length - 1];

    // Construct the full path to the uploads directory
    const uploadsPath = path.join(__dirname, "../../uploads");
    const fullPath = path.join(uploadsPath, filename);

    // Check if file exists
    return fs.existsSync(fullPath);
  } catch (error) {
    console.error("Error checking image existence:", error);
    return false;
  }
};

module.exports = {
  validateImagePaths,
  imageExists,
};
