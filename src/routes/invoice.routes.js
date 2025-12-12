const express = require("express");
const router = express.Router();

// Import controllers
const invoiceController = require("../controllers/invoice.controller");

// Import middleware
const { authenticate } = require("../middleware/auth.middleware");

// Protected route - download invoice PDF for a purchase
router.get(
  "/purchases/:id",
  authenticate,
  invoiceController.downloadPurchaseInvoice
);

module.exports = router;
