const orderAddressService = require("../services/orderAddress.service");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  serviceUnavailableResponse,
  validationErrorResponse,
} = require("../utils/response.util");

// Get all order addresses (admin only)
const getAllOrderAddresses = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const orderAddresses = await orderAddressService.getAllOrderAddresses();
    return successResponse(
      res,
      "Order addresses retrieved successfully",
      orderAddresses
    );
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(
        res,
        "Failed to retrieve order addresses"
      );
    }
    return errorResponse(
      res,
      "Failed to retrieve order addresses",
      error.message
    );
  }
};

// Get all order addresses for the authenticated user
const getUserOrderAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    const orderAddresses = await orderAddressService.getUserOrderAddresses(
      userId
    );

    return successResponse(
      res,
      "User order addresses retrieved successfully",
      orderAddresses
    );
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(
        res,
        "Failed to retrieve order addresses"
      );
    }
    return errorResponse(
      res,
      "Failed to retrieve order addresses",
      error.message
    );
  }
};

// Get order address by purchase ID
const getOrderAddressByPurchaseId = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const userId = req.user.id;

    // Validate that purchaseId exists
    if (!purchaseId) {
      return validationErrorResponse(res, ["Purchase ID is required"]);
    }

    const orderAddress = await orderAddressService.getOrderAddressByPurchaseId(
      purchaseId,
      userId
    );

    if (!orderAddress) {
      return notFoundResponse(res, "Order address not found");
    }

    return successResponse(
      res,
      "Order address retrieved successfully",
      orderAddress
    );
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(
        res,
        "Failed to retrieve order address"
      );
    }
    if (error.message.includes("Unauthorized")) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Unauthorized access to order address.",
      });
    }
    return errorResponse(
      res,
      "Failed to retrieve order address",
      error.message
    );
  }
};

module.exports = {
  getAllOrderAddresses,
  getUserOrderAddresses,
  getOrderAddressByPurchaseId,
};
