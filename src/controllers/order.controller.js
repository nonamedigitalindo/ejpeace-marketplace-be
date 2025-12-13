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
 * Query params:
 *   - type: 'xlsx' to export as Excel file
 *   - start_date: Filter orders from this date (YYYY-MM-DD)
 *   - end_date: Filter orders until this date (YYYY-MM-DD)
 */const getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const { type, start_date, end_date } = req.query;
    const orders = await orderService.getAllOrdersFiltered(start_date, end_date);

    if (type === "xlsx") {
      // IMPORTANT: Add await if using ExcelJS
      const xlsxBuffer = await orderService.generateOrdersXLSX(orders);

      let filename = "orders";
      if (start_date && end_date) {
        filename += `_${start_date}_to_${end_date}`;
      } else if (start_date) {
        filename += `_from_${start_date}`;
      } else if (end_date) {
        filename += `_until_${end_date}`;
      }
      filename += ".xlsx";
      // 🔍 ADD THIS DEBUG LINE
      console.log("📊 Number of orders:", orders.length);
      console.log("📊 First order sample:", orders[0]);

      console.log("📦 Buffer size:", xlsxBuffer.length, "bytes");
      console.log("📦 Buffer type:", typeof xlsxBuffer);
      console.log("📦 Is Buffer:", Buffer.isBuffer(xlsxBuffer));
      console.log("📦 First 20 bytes:", xlsxBuffer.slice(0, 20));
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", xlsxBuffer.length);

      return res.send(xlsxBuffer);
    }

    return successResponse(res, "Orders retrieved successfully", orders);
  } catch (error) {
    console.error("Export error:", error); // Add logging
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
