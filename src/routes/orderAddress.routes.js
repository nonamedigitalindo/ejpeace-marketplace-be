const express = require("express");
const router = express.Router();

// Import controllers
const orderAddressController = require("../controllers/orderAddress.controller");

// Import middleware
const {
  authenticate,
  authorizeAdmin,
} = require("../middleware/auth.middleware");

// Protected routes (require authentication)
// Get all order addresses (admin only)
router.get(
  "/all",
  authenticate,
  authorizeAdmin,
  orderAddressController.getAllOrderAddresses
);

// Get all order addresses for the authenticated user
router.get(
  "/my-addresses",
  authenticate,
  orderAddressController.getUserOrderAddresses
);

// Get order address by purchase ID
router.get(
  "/:purchaseId",
  authenticate,
  orderAddressController.getOrderAddressByPurchaseId
);

module.exports = router;
