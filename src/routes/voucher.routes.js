const express = require("express");
const router = express.Router();

// Import controllers
const voucherController = require("../controllers/voucher.controller");

// Import middleware
const { authenticate } = require("../middleware/auth.middleware");

// Admin routes (require authentication and admin role)
router.post("/", authenticate, voucherController.createVoucher);
router.put("/:id", authenticate, voucherController.updateVoucher);
router.delete("/:id", authenticate, voucherController.deleteVoucher);

// Public routes
router.get("/", voucherController.getAllVouchers);
router.get("/:id", voucherController.getVoucherById);
router.get("/code/:code", voucherController.getVoucherByCode);

// User routes (require authentication)
router.post("/validate", authenticate, voucherController.validateVoucher);
router.post(
  "/apply-to-ticket",
  authenticate,
  voucherController.applyVoucherToTicket
);

// New claim route
router.post("/:id/claim", authenticate, voucherController.claimVoucher);

// Apply voucher to purchase route
router.post(
  "/apply-to-purchase",
  authenticate,
  voucherController.applyVoucherToPurchase
);

// ============ VOUCHER SCOPING ROUTES ============

// Create voucher with product/event scoping
router.post("/scoped", authenticate, voucherController.createVoucherWithScoping);

// Get voucher with scoping (includes products/events)
router.get("/scoped/:id", voucherController.getVoucherWithScopingById);

// Update voucher with scoping
router.put("/scoped/:id", authenticate, voucherController.updateVoucherWithScoping);

// Validate voucher for specific items
router.post("/validate-for-items", authenticate, voucherController.validateVoucherForItems);

// Validate voucher usage (public endpoint)
router.post("/validate-usage", voucherController.validateVoucherUsage);

module.exports = router;

