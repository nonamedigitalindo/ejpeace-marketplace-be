const XenditUtil = require("../utils/xendit.util");
const { errorResponse } = require("../utils/response.util");

/**
 * Middleware to validate Xendit webhook signatures
 * This ensures that incoming webhooks are genuinely from Xendit
 */
const validateXenditWebhook = (req, res, next) => {
  try {
    // Only validate signature if XENDIT_WEBHOOK_SECRET is configured
    const webhookSecret = process.env.XENDIT_WEBHOOK_SECRET;
    const callbackToken = process.env.XENDIT_CALLBACK_TOKEN;

    // If neither secret nor token is configured, log warning and allow
    if (!webhookSecret && !callbackToken) {
      console.warn(
        "XENDIT_WEBHOOK_SECRET and XENDIT_CALLBACK_TOKEN not configured - webhook validation disabled"
      );
      return next();
    }

    // 1. Try to validate using Xendit-Signature (Preferred)
    const signature = req.header("Xendit-Signature");
    if (signature && webhookSecret) {
      // Get raw body
      const rawBody = req.rawBody || JSON.stringify(req.body);

      // Validate the signature
      const isValid = XenditUtil.validateWebhookSignature(
        rawBody,
        signature,
        webhookSecret
      );

      if (!isValid) {
        return errorResponse(
          res,
          "Invalid Xendit signature",
          "Webhook signature validation failed",
          401
        );
      }
      return next();
    }

    // 2. Try to validate using x-callback-token (Fallback/Legacy)
    const tokenHeader = req.header("x-callback-token");
    if (tokenHeader && callbackToken) {
      // DEBUG LOGGING - REMOVE IN PRODUCTION
      console.log("--- Xendit Token Validation Debug ---");
      console.log(`Received Token Length: ${tokenHeader.length}`);
      console.log(`Env Token Length: ${callbackToken.length}`);
      // LOGGING FULL TOKEN TO RECOVER IT
      console.log(`>>> FULL RECEIVED TOKEN (COPY THIS): ${tokenHeader}`);
      console.log(`Env Token (First 5): ${callbackToken.substring(0, 5)}`);
      console.log(
        `Received Token (Last 5): ${tokenHeader.substring(
          tokenHeader.length - 5
        )}`
      );
      console.log(
        `Env Token (Last 5): ${callbackToken.substring(
          callbackToken.length - 5
        )}`
      );
      console.log(`Exact Match: ${tokenHeader === callbackToken}`);
      console.log("-------------------------------------");

      if (tokenHeader !== callbackToken) {
        return errorResponse(
          res,
          "Invalid callback token",
          "Webhook token validation failed",
          401
        );
      }
      return next();
    }

    // 3. If we are here, it means validation failed or headers missing
    // Allow if it's a test ping from Xendit Dashboard (optional check)
    const userAgent = req.header("user-agent");
    if (userAgent && userAgent.includes("Xendit")) {
      // You might want to be stricter here in production
      console.log("Received Xendit test ping without signature/token");
      // For now, we still enforce validation if secrets are set
    }

    return errorResponse(
      res,
      "Missing authentication headers",
      "Xendit-Signature or x-callback-token is required",
      401
    );
  } catch (error) {
    console.error("Error validating Xendit webhook:", error);
    return errorResponse(
      res,
      "Webhook validation error",
      "Failed to validate webhook signature",
      400
    );
  }
};

/**
 * Middleware to parse raw body for webhook signature validation
 * This preserves the raw body needed for signature verification
 */
const parseRawBody = (req, res, next) => {
  if (req.headers["content-type"] === "application/json") {
    // If body parser has already parsed the JSON, convert it back to string
    if (typeof req.body === "object" && req.body !== null) {
      req.rawBody = JSON.stringify(req.body);
    }
  } else {
    // For raw body, just assign it
    req.rawBody = req.body;
  }
  next();
};

module.exports = {
  validateXenditWebhook,
  parseRawBody,
};
