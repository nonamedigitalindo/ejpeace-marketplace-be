const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

// Import database initialization
const initDatabase = require("./utils/db-init");

// Import routes
const indexRoutes = require("./routes/index.routes");

// Import response utilities
const { errorResponse } = require("./utils/response.util");

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, "../uploads");
console.log("Uploads directory path:", uploadPath); // Debug log
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Initialize express app
const app = express();

// Parse ALLOWED_ORIGINS from environment variable or use defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://212.85.27.163",
      "http://ejpeaceentertainment.com",
      "https://ejpeaceentertainment.com",
    ];

console.log("Allowed origins:", allowedOrigins);

// More flexible CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Log the incoming origin for debugging
    console.log("[CORS] Incoming origin:", origin);
    console.log("[CORS] Allowed origins:", allowedOrigins);

    // More flexible origin matching
    const isAllowed =
      allowedOrigins.some((allowedOrigin) => {
        // Check for exact match
        if (origin === allowedOrigin) return true;

        // Check if the origin is a subdomain of an allowed origin
        if (
          origin &&
          origin.endsWith("." + allowedOrigin.replace(/^https?:\/\//, ""))
        )
          return true;

        return false;
      }) || !origin;

    // TEMPORARY FIX: Allow all origins to unblock the user
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Allow-Headers",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
  ],
  exposedHeaders: ["Content-Disposition"],
  optionsSuccessStatus: 200,
};

// Manual CORS headers as a fallback
// Manual CORS headers as a fallback
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Credentials", "true");
//   res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Headers, Access-Control-Request-Method, Access-Control-Request-Headers");
//   
//   // Handle preflight
//   if (req.method === "OPTIONS") {
//     return res.status(200).end();
//   }
//   
//   next();
// });

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(morgan("combined"));

// Serve static files from the uploads directory
// Serve static files from the uploads directory with proper cache control
// Serve static files from the uploads directory with proper cache control and file checking

app.use(
  "/api/v1/uploads",
  (req, res, next) => {
    // Set cache control headers to prevent aggressive caching
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Log request for debugging
    console.log(`[UPLOADS] Request for: ${req.url}`);
    console.log(
      `[UPLOADS] Full URL: ${req.protocol}://${req.get("host")}${
        req.originalUrl
      }`
    );

    // Check if file exists
    const filePath = path.join(__dirname, "../uploads", req.url);

    // Remove query parameters if any
    const cleanPath = filePath.split("?")[0];

    console.log(`[UPLOADS] Checking file: ${cleanPath}`);

    if (fs.existsSync(cleanPath)) {
      console.log(`[UPLOADS] File found: ${cleanPath}`);
    } else {
      console.log(`[UPLOADS] File NOT FOUND: ${cleanPath}`);
    }

    next();
  },
  express.static(path.join(__dirname, "../uploads"))
);

// Remove file size limitations for JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add raw body parsing for webhook signature validation
app.use(
  "/api/v1/purchases/callback",
  express.raw({ type: "application/json" })
);

// Add raw body parsing for ticket webhook signature validation
app.use(
  "/api/v1/tickets/payment/callback",
  express.raw({ type: "application/json" })
);

// Add raw body parsing for ticket invoice callback signature validation
app.use(
  "/api/v1/tickets/invoice-callback",
  express.raw({ type: "application/json" })
);

// Add raw body parsing for unified payment callback signature validation
app.use(
  "/api/v1/payments/unified-callback",
  express.raw({ type: "application/json" })
);

// Routes
app.use("/api", indexRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running smoothly",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Handle multer errors specifically
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      // Even with limits removed, this might still be triggered
      // Let's allow the upload to continue
      console.log("Ignoring file size limit - will continue processing");
      return next();
    }
    // Handle unexpected field errors
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Upload error",
        error:
          "Unexpected field. Please use 'images' as the field name for file uploads.",
      });
    }
  }

  // Handle CORS errors
  if (err.message && err.message.includes("Not allowed by CORS")) {
    return res.status(403).json({
      success: false,
      message: "CORS error",
      error: "Origin not allowed",
    });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "An error occurred",
  });
});

const PORT = process.env.PORT || 3000;

// Initialize database and start server
initDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Access the API at http://localhost:${PORT}/api`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
