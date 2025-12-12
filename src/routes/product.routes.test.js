const express = require("express");
const router = express.Router();

// Import controllers
const productController = require("../controllers/product.controller");

// Import middleware
const {
  authenticate,
  authorizeAdmin,
} = require("../middleware/auth.middleware");

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "Test route working" });
});

// Public routes
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);

// Protected routes (admin only)
router.post("/", authenticate, authorizeAdmin, productController.createProduct);
router.put(
  "/:id",
  authenticate,
  authorizeAdmin,
  productController.updateProduct
);
router.delete(
  "/:id",
  authenticate,
  authorizeAdmin,
  productController.deleteProduct
);

module.exports = router;
