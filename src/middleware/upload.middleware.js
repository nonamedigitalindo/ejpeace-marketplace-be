const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { errorResponse } = require("../utils/response.util");

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Uploads directory - now we ensure it exists
    console.log("Upload destination:", uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename =
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname);
    console.log("Generated filename:", filename);
    cb(null, filename);
  },
});

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  // Log request details for debugging
  console.log("=== Upload Debug Info ===");
  console.log("Headers:", req.headers);
  console.log("Content-Type:", req.headers["content-type"]);
  console.log("Fields in request body:", Object.keys(req.body || {}));
  console.log("Files object structure:", req.files);
  console.log("File field name:", file.fieldname);
  console.log("File original name:", file.originalname);
  console.log("File mime type:", file.mimetype);

  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  console.log("File upload attempt:", {
    originalname: file.originalname,
    mimetype: file.mimetype,
    extname: path.extname(file.originalname),
    isValid: mimetype && extname,
  });

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Create a more flexible upload middleware that accepts any field name and file size
const createFlexibleUpload = () => {
  return multer({
    storage: storage,
    // Remove file size limit completely
    limits: {},
    fileFilter: fileFilter,
  });
};

// Custom middleware to handle multiple field names and normalize files
const handleMultipleFieldNames = (req, res, next) => {
  console.log("=== Handle Multiple Field Names Debug ===");

  // Check if files were processed by multer
  if (req.files) {
    console.log("Raw files object:", req.files);
    console.log("Type of files object:", typeof req.files);

    // If files is an array, it's already in the correct format
    if (Array.isArray(req.files)) {
      console.log("Files is already an array");
    }
    // If files is an object with different field names, normalize it
    else if (typeof req.files === "object" && !Array.isArray(req.files)) {
      console.log("Files is an object, checking field names");

      // Look for common image field names
      const imageFieldNames = ["images", "image"];
      let foundFiles = null;

      // Check for our preferred field names first
      for (const fieldName of imageFieldNames) {
        if (req.files[fieldName]) {
          console.log(`Found files under field name '${fieldName}'`);
          foundFiles = req.files[fieldName];
          break;
        }
      }

      // If we didn't find our preferred names, use whatever field name was provided
      if (!foundFiles) {
        // Get the first available field
        const firstFieldName = Object.keys(req.files)[0];
        if (firstFieldName) {
          console.log(`Using files from field name '${firstFieldName}'`);
          foundFiles = req.files[firstFieldName];
        }
      }

      // Set the normalized files
      if (foundFiles) {
        req.files = foundFiles;
      }
    }
  } else {
    console.log("No files object found in request");
  }

  console.log("Normalized files:", req.files);
  next();
};

// Middleware to handle upload errors
const handleUploadError = (error, req, res, next) => {
  console.log("=== Upload Error Debug ===");
  console.log("Upload error:", error);
  console.log("Request headers:", req.headers);
  console.log("Request body:", req.body);
  console.log("Request files:", req.files);

  if (error instanceof multer.MulterError) {
    console.log("Multer error code:", error.code);
    console.log("Multer error field:", error.field);

    if (error.code === "LIMIT_FILE_SIZE") {
      // Even though we removed the limit, this might still be triggered in some cases
      // Let's allow the upload to continue
      console.log("Ignoring file size limit - will continue processing");
      return next();
    }
    // Handle "Unexpected field" error by being more flexible
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      // Instead of returning an error, let's continue and let our middleware handle it
      console.log(
        "Ignoring unexpected field error - will handle in normalization"
      );
      return next();
    }
    return errorResponse(res, "Upload error", error.message, 400);
  } else if (error) {
    return errorResponse(res, "Invalid file", error.message, 400);
  }
  next();
};

module.exports = {
  createFlexibleUpload,
  handleMultipleFieldNames,
  handleUploadError,
};
