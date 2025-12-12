const express = require("express");
const router = express.Router();

// Import controllers
const paymentCallbackController = require("../controllers/paymentCallback.controller");

// Import middleware
const {
  validateXenditWebhook,
  parseRawBody,
} = require("../middleware/xendit.middleware");
const { callbackRateLimit } = require("../middleware/rateLimit.middleware");

// Handle unified payment callback from Xendit (no authentication as it's a webhook)
// This endpoint handles both ticket and purchase callbacks
router.post(
  "/unified-callback",
  callbackRateLimit,
  parseRawBody,
  validateXenditWebhook,
  paymentCallbackController.handleUnifiedPaymentCallback
);

module.exports = router;
