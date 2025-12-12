const {
  handleUnifiedCallback,
} = require("../services/paymentCallback.service");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
} = require("../utils/response.util");

/**
 * Controller to handle unified payment callbacks for both tickets and purchases
 */

const handleUnifiedPaymentCallback = async (req, res) => {
  try {
    console.log(
      "\n============= WEBHOOK RECEIVED (PAYMENTS API) ============="
    );
    console.log("Timestamp:", new Date().toISOString());
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("URL:", req.url);

    // For webhook validation, we need to parse the raw body
    let callbackData;

    // If rawBody exists (from webhook validation middleware), parse it
    if (req.rawBody) {
      callbackData = JSON.parse(req.rawBody);
    } else {
      // Otherwise use the parsed body
      callbackData = req.body;
    }

    console.log("Callback Data:", JSON.stringify(callbackData, null, 2));

    // Validate that request body exists
    if (!callbackData || Object.keys(callbackData).length === 0) {
      console.error("❌ Request body is empty");
      return validationErrorResponse(res, ["Request body is required"]);
    }

    console.log(
      `[Payment Callback] Processing callback for external_id: ${callbackData.external_id}`
    );
    console.log(`[Payment Callback] Status: ${callbackData.status}`);
    console.log(`[Payment Callback] Payment ID: ${callbackData.id}`);

    // Process the unified callback
    const result = await handleUnifiedCallback(callbackData);

    console.log(`[Payment Callback] ✅ Successfully processed callback`);
    console.log(`[Payment Callback] Result:`, JSON.stringify(result, null, 2));

    return successResponse(
      res,
      "Unified callback processed successfully",
      result
    );
  } catch (error) {
    console.error("❌ [Payment Callback] Error:", error);
    console.error("❌ [Payment Callback] Stack:", error.stack);
    return errorResponse(
      res,
      "Failed to process unified callback",
      error.message,
      400
    );
  }
};

module.exports = {
  handleUnifiedPaymentCallback,
};
