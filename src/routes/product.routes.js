const express = require("express");
const router = express.Router();

// Import controllers
const productController = require("../controllers/product.controller");

// Import middleware
const {
  authenticate,
  authorizeAdmin,
} = require("../middleware/auth.middleware");
const {
  createFlexibleUpload,
  handleMultipleFieldNames,
  handleUploadError,
} = require("../middleware/upload.middleware");

// Create flexible upload middleware
const upload = createFlexibleUpload();

// Public routes
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);

// Protected routes (admin only)
router.post(
  "/",
  authenticate,
  authorizeAdmin,
  upload.any(), // Use any() to accept any field name
  handleMultipleFieldNames,
  handleUploadError,
  productController.createProduct
);
router.put(
  "/:id",
  authenticate,
  authorizeAdmin,
  upload.any(), // Use any() to accept any field name
  handleMultipleFieldNames,
  handleUploadError,
  productController.updateProduct
);
router.delete(
  "/:id",
  authenticate,
  authorizeAdmin,
  productController.deleteProduct
);

module.exports = router;
