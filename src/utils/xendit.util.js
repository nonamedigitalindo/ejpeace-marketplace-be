const crypto = require("crypto");

/**
 * Xendit webhook signature validation utility
 * Validates that incoming webhooks are genuinely from Xendit
 */
class XenditUtil {
  /**
   * Validates Xendit webhook signature
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Xendit signature from Xendit-Signature header
   * @param {string} secret - Xendit webhook secret (should be stored in environment variables)
   * @returns {boolean} - Whether the signature is valid
   */
  static validateWebhookSignature(payload, signature, secret) {
    try {
      // Create HMAC SHA256 hash of payload using secret
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      // Compare signatures using timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error("Error validating Xendit webhook signature:", error);
      return false;
    }
  }

  /**
   * Validates Xendit callback data structure
   * @param {object} callbackData - Callback data from Xendit
   * @returns {boolean} - Whether the data structure is valid
   */
  static validateCallbackData(callbackData) {
    if (!callbackData || typeof callbackData !== "object") {
      return false;
    }

    // Required fields for Xendit callbacks
    const requiredFields = ["id", "external_id", "status"];
    return requiredFields.every((field) => field in callbackData);
  }

  /**
   * Sanitizes Xendit callback data to prevent injection attacks
   * @param {object} callbackData - Callback data from Xendit
   * @returns {object} - Sanitized callback data
   */
  static sanitizeCallbackData(callbackData) {
    if (!callbackData || typeof callbackData !== "object") {
      return {};
    }

    // Create a new object with only allowed fields
    const allowedFields = [
      "id",
      "external_id",
      "status",
      "paid_at",
      "payment_method",
      "amount",
      "fee_amount",
    ];

    const sanitizedData = {};
    for (const field of allowedFields) {
      if (field in callbackData) {
        // Ensure values are of expected types
        switch (field) {
          case "id":
          case "external_id":
          case "status":
          case "payment_method":
            sanitizedData[field] = String(callbackData[field]);
            break;
          case "amount":
          case "fee_amount":
            sanitizedData[field] = Number(callbackData[field]);
            break;
          case "paid_at":
            sanitizedData[field] = callbackData[field]
              ? new Date(callbackData[field])
              : null;
            break;
          default:
            sanitizedData[field] = callbackData[field];
        }
      }
    }

    return sanitizedData;
  }
}

module.exports = XenditUtil;
