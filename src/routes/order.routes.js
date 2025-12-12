const express = require("express");
const router = express.Router();

// Import controllers
const orderController = require("../controllers/order.controller");

// Import middleware
const { authenticate } = require("../middleware/auth.middleware");

// Protected routes (require authentication)
// Get all orders (admin only)
router.get("/all", authenticate, orderController.getAllOrders);

// Get orders for the authenticated user
router.get("/", authenticate, orderController.getUserOrders);

// Get a specific order by ID
router.get("/:id", authenticate, orderController.getOrderById);

// Get product data related to order addresses
router.get(
  "/:purchaseId/product-data",
  authenticate,
  orderController.getProductDataByOrderAddress
);

module.exports = router;
