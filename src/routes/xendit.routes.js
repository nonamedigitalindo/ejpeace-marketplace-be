const express = require("express");
const router = express.Router();
const xenditController = require("../controllers/xendit.controller");
const { validateXenditWebhook } = require("../middleware/xendit.middleware");

/**
 * Unified Xendit Webhook Callback Route
 * This single endpoint handles callbacks for both ticket and product purchases
 * The controller determines the transaction type from external_id
 */
router.post(
  "/callback",
  validateXenditWebhook,
  xenditController.handleUnifiedCallback
);

module.exports = router;
