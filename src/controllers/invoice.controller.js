const { generateInvoicePDF } = require("../services/invoice.service");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  serviceUnavailableResponse,
  validationErrorResponse,
} = require("../utils/response.util");

/**
 * Download invoice PDF for a purchase
 */
const downloadPurchaseInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Get user ID from authenticated user

    // Validate that ID is provided
    if (!id) {
      return validationErrorResponse(res, ["Purchase ID is required"]);
    }

    // Validate that ID is a number
    const purchaseId = parseInt(id);
    if (isNaN(purchaseId)) {
      return validationErrorResponse(res, ["Invalid purchase ID"]);
    }

    // Get purchase details
    const purchaseService = require("../services/purchase.service");
    const purchase = await purchaseService.getPurchaseById(purchaseId, userId);

    if (!purchase) {
      return notFoundResponse(res, "Purchase not found");
    }

    // Fetch required data for invoice generation
    const CartRepository = require("../models/cart.repository");
    const UserRepository = require("../models/user.repository");
    const OrderAddressRepository = require("../models/orderAddress.repository");

    const cartItems = await CartRepository.getCartItemsByPurchaseId(purchaseId);
    const user = await UserRepository.findById(userId);
    const orderAddress = await OrderAddressRepository.findByPurchaseId(
      purchaseId
    );

    // Generate the invoice PDF
    const { filepath, filename } = await generateInvoicePDF(
      purchase,
      cartItems,
      user,
      orderAddress
    );

    // Set headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Send the PDF file
    res.sendFile(filepath);
  } catch (error) {
    console.error("Error downloading invoice:", error);

    if (error.message.includes("Purchase not found")) {
      return notFoundResponse(res, "Purchase not found");
    }

    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to generate invoice");
    }

    return errorResponse(res, "Failed to download invoice", error.message);
  }
};

module.exports = {
  downloadPurchaseInvoice,
};
