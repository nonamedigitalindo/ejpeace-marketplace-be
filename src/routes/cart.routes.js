const express = require("express");
const router = express.Router();

// Import controllers
const cartController = require("../controllers/cart.controller");

// Import middleware
const { authenticate } = require("../middleware/auth.middleware");

// Protected routes (all cart routes require authentication)
// Add item to cart
router.post("/", authenticate, cartController.addItemToCart);

// Get user's cart items
router.get("/", authenticate, cartController.getCartItems);

// Get specific cart item by ID
router.get("/:id", authenticate, cartController.getCartItemById);

// Update cart item quantity
router.put("/:id", authenticate, cartController.updateCartItem);

// Remove item from cart
router.delete("/:id", authenticate, cartController.removeItemFromCart);

// Clear user's cart
router.delete("/", authenticate, cartController.clearUserCart);

module.exports = router;
