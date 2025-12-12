const ticketService = require("../services/ticket.service");
const purchaseService = require("../services/purchase.service");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
} = require("../utils/response.util");

/**
 * Unified Xendit Callback Handler
 * This handler determines the transaction type based on external_id
 * and routes to the appropriate service (ticket or purchase)
 */
const handleUnifiedCallback = async (req, res) => {
  try {
    console.log("\n============= WEBHOOK RECEIVED =============");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Headers:", JSON.stringify(req.headers, null, 2));

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

    // Extract external_id to determine transaction type
    const externalId = callbackData.external_id || "";

    console.log(
      `[Unified Callback] Received callback with external_id: ${externalId}`
    );
    console.log(`[Unified Callback] Status: ${callbackData.status}`);
    console.log(`[Unified Callback] Payment ID: ${callbackData.id}`);

    // Determine transaction type based on external_id pattern
    let result;

    if (externalId.startsWith("ticket_") || externalId.includes("ticket")) {
      // This is a ticket purchase
      console.log("[Unified Callback] Routing to ticket service");
      result = await ticketService.handlePaymentCallback(callbackData);
    } else if (
      externalId.startsWith("purchase_") ||
      externalId.includes("purchase")
    ) {
      // This is a product purchase
      console.log("[Unified Callback] Routing to purchase service");
      result = await purchaseService.handleInvoiceCallback(callbackData);
    } else if (externalId === "invoice_123124123") {
      // This is a test payload from Xendit dashboard
      console.log(
        "[Unified Callback] Test payload detected, returning success"
      );
      return successResponse(res, "Test callback processed successfully", {
        external_id: externalId,
        message: "This is a test payload from Xendit",
      });
    } else {
      // Unknown transaction type
      console.warn(
        `[Unified Callback] Unknown external_id pattern: ${externalId}`
      );
      return errorResponse(
        res,
        "Unknown transaction type",
        `Unable to determine transaction type from external_id: ${externalId}`,
        400
      );
    }

    return successResponse(res, "Callback processed successfully", result);
  } catch (error) {
    console.error("[Unified Callback] Error processing callback:", error);
    return errorResponse(res, "Failed to process callback", error.message, 400);
  }
};

module.exports = {
  handleUnifiedCallback,
};
