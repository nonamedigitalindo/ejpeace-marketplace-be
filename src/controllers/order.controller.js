const orderService = require("../services/order.service");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  serviceUnavailableResponse,
  validationErrorResponse,
} = require("../utils/response.util");

/**
 * Get all orders (admin only)
 * Returns all purchases and tickets combined
 */
const getAllOrders = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const orders = await orderService.getAllOrders();
    return successResponse(res, "Orders retrieved successfully", orders);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve orders");
    }
    return errorResponse(res, "Failed to retrieve orders", error.message);
  }
};

/**
 * Get orders for the authenticated user
 * Returns only purchases and tickets belonging to the user
 */
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await orderService.getUserOrders(userId);
    return successResponse(res, "User orders retrieved successfully", orders);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve user orders");
    }
    return errorResponse(res, "Failed to retrieve user orders", error.message);
  }
};

/**
 * Get a specific order by ID
 * Works for both admin (any order) and users (their own orders)
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Validate that ID exists
    if (!id) {
      return validationErrorResponse(res, ["Order ID is required"]);
    }

    const order = await orderService.getOrderById(id, userId, isAdmin);

    if (!order) {
      return notFoundResponse(res, "Order not found");
    }

    return successResponse(res, "Order retrieved successfully", order);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve order");
    }
    if (error.message.includes("Unauthorized")) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Unauthorized access to order.",
      });
    }
    return errorResponse(res, "Failed to retrieve order", error.message);
  }
};

// Get product data related to order addresses
const getProductDataByOrderAddress = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const userId = req.user.id;

    // Validate that purchaseId exists
    if (!purchaseId) {
      return validationErrorResponse(res, ["Purchase ID is required"]);
    }

    const productData = await orderService.getProductDataByOrderAddress(
      purchaseId,
      userId
    );

    if (!productData) {
      return notFoundResponse(res, "Product data not found for this order");
    }

    return successResponse(
      res,
      "Product data retrieved successfully",
      productData
    );
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve product data");
    }
    if (error.message.includes("Unauthorized")) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Unauthorized access to product data.",
      });
    }
    return errorResponse(res, "Failed to retrieve product data", error.message);
  }
};

module.exports = {
  getAllOrders,
  getUserOrders,
  getOrderById,
  getProductDataByOrderAddress,
};
