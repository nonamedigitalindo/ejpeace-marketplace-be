const express = require("express");
const router = express.Router();

// Import controllers
const purchaseController = require("../controllers/purchase.controller");

// Import middleware
const {
  authenticate,
  authorizeAdmin,
} = require("../middleware/auth.middleware");

// Protected routes (all purchase routes require authentication)
// Create a new purchase from cart
router.post("/", authenticate, purchaseController.createPurchase);

// Create a new purchase directly (without cart)
router.post("/direct", authenticate, purchaseController.createPurchaseDirect);

// Initiate payment for a purchase
router.post("/pay", authenticate, purchaseController.initiatePayment);

// Get all purchases for the authenticated user
router.get("/", authenticate, purchaseController.getUserPurchases);

// Get a specific purchase by ID
router.get("/:id", authenticate, purchaseController.getPurchaseById);

// Get purchase detail with items (and QR code)
router.get("/:id/detail", purchaseController.getPurchaseDetail);

// Download invoice
router.get("/:id/invoice", authenticate, purchaseController.downloadInvoice);

module.exports = router;
