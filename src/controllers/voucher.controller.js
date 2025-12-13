const voucherService = require("../services/voucher.service");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationErrorResponse,
  serviceUnavailableResponse,
} = require("../utils/response.util");

const createVoucher = async (req, res) => {
  try {
    const voucherData = req.body;

    // Validate that request body exists
    if (!voucherData || Object.keys(voucherData).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    const voucher = await voucherService.createVoucher(voucherData);

    return successResponse(res, "Voucher created successfully", voucher, 201);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to create voucher");
    }
    return errorResponse(res, "Failed to create voucher", error.message, 400);
  }
};

const getVoucherById = async (req, res) => {
  try {
    const { id } = req.params;

    const voucher = await voucherService.getVoucherById(id);

    if (!voucher) {
      return notFoundResponse(res, "Voucher not found");
    }

    return successResponse(res, "Voucher retrieved successfully", voucher);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve voucher");
    }
    return errorResponse(res, "Failed to retrieve voucher", error.message);
  }
};

const getVoucherByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const voucher = await voucherService.getVoucherByCode(code);

    if (!voucher) {
      return notFoundResponse(res, "Voucher not found");
    }

    return successResponse(res, "Voucher retrieved successfully", voucher);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve voucher");
    }
    return errorResponse(res, "Failed to retrieve voucher", error.message);
  }
};

const getAllVouchers = async (req, res) => {
  try {
    const vouchers = await voucherService.getAllVouchers();

    return successResponse(res, "Vouchers retrieved successfully", vouchers);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve vouchers");
    }
    return errorResponse(res, "Failed to retrieve vouchers", error.message);
  }
};

const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucherData = req.body;

    // Deep inspection of incoming data
    console.log("=== CONTROLLER DEBUG ===");
    console.log("Request params:", req.params);
    console.log(
      "Request body:",
      JSON.stringify(
        req.body,
        (key, value) => {
          if (value === undefined) return "***UNDEFINED***";
          if (value === null) return "***NULL***";
          return value;
        },
        2
      )
    );
    console.log("Voucher data keys:", Object.keys(voucherData));

    // Check each value in the incoming data
    Object.keys(voucherData).forEach((key) => {
      const value = voucherData[key];
      console.log(`Key: ${key}, Value: ${value}, Type: ${typeof value}`);
      if (value === undefined) {
        console.error(`UNDEFINED VALUE FOUND in request: key=${key}`);
      }
    });

    // Validate that request body exists
    if (!voucherData || Object.keys(voucherData).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    const voucher = await voucherService.updateVoucher(id, voucherData);

    return successResponse(res, "Voucher updated successfully", voucher);
  } catch (error) {
    console.error("Update voucher error:", error);
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to update voucher");
    }
    return errorResponse(res, "Failed to update voucher", error.message, 400);
  }
};

const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await voucherService.deleteVoucher(id);

    return successResponse(res, result.message);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to delete voucher");
    }
    return errorResponse(res, "Failed to delete voucher", error.message, 400);
  }
};

const validateVoucher = async (req, res) => {
  try {
    const { code, order_amount } = req.body;

    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Validate required fields
    if (!code) {
      return validationErrorResponse(res, ["Voucher code is required"]);
    }

    if (order_amount === undefined || isNaN(order_amount) || order_amount < 0) {
      return validationErrorResponse(res, ["Valid order amount is required"]);
    }

    const validation = await voucherService.validateVoucher(code, order_amount);

    if (!validation.valid) {
      return errorResponse(
        res,
        "Voucher validation failed",
        validation.error,
        400
      );
    }

    return successResponse(res, "Voucher is valid", validation);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to validate voucher");
    }
    return errorResponse(res, "Failed to validate voucher", error.message, 400);
  }
};

const applyVoucherToTicket = async (req, res) => {
  try {
    const { ticket_id, voucher_code } = req.body;

    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Validate required fields
    if (!ticket_id) {
      return validationErrorResponse(res, ["Ticket ID is required"]);
    }

    if (!voucher_code) {
      return validationErrorResponse(res, ["Voucher code is required"]);
    }

    const result = await voucherService.applyVoucherToTicket(
      ticket_id,
      voucher_code
    );

    return successResponse(res, "Voucher applied successfully", result);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to apply voucher");
    }
    return errorResponse(res, "Failed to apply voucher", error.message, 400);
  }
};

// New claim voucher controller
const claimVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validate that voucher ID exists
    if (!id) {
      return validationErrorResponse(res, ["Voucher ID is required"]);
    }

    const result = await voucherService.claimVoucher(id, userId);

    return successResponse(res, "Voucher claimed successfully", result);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to claim voucher");
    }
    if (error.message.includes("not found")) {
      return notFoundResponse(res, "Voucher not found");
    }
    if (error.message.includes("already claimed")) {
      return errorResponse(res, "Voucher already claimed", error.message, 400);
    }
    if (error.message.includes("not eligible")) {
      return unauthorizedResponse(
        res,
        "User not eligible to claim this voucher"
      );
    }
    return errorResponse(res, "Failed to claim voucher", error.message, 400);
  }
};

const applyVoucherToPurchase = async (req, res) => {
  try {
    const { purchase_id, voucher_code } = req.body;

    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Validate required fields
    if (!purchase_id) {
      return validationErrorResponse(res, ["Purchase ID is required"]);
    }

    if (!voucher_code) {
      return validationErrorResponse(res, ["Voucher code is required"]);
    }

    const result = await voucherService.applyVoucherToPurchase(
      purchase_id,
      voucher_code
    );

    return successResponse(res, "Voucher applied successfully", result);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to apply voucher");
    }
    return errorResponse(res, "Failed to apply voucher", error.message, 400);
  }
};

// ============ VOUCHER SCOPING CONTROLLERS ============

/**
 * Create voucher with product/event scoping
 * Accepts product_ids, event_ids, apply_to_all in request body
 */
const createVoucherWithScoping = async (req, res) => {
  try {
    const voucherData = req.body;

    if (!voucherData || Object.keys(voucherData).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    const voucher = await voucherService.createVoucherWithScoping(voucherData);
    return successResponse(res, "Voucher created successfully", voucher, 201);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to create voucher");
    }
    return errorResponse(res, "Failed to create voucher", error.message, 400);
  }
};

/**
 * Get voucher by ID with product/event associations
 */
const getVoucherWithScopingById = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await voucherService.getVoucherWithScoping(id);

    if (!voucher) {
      return notFoundResponse(res, "Voucher not found");
    }

    return successResponse(res, "Voucher retrieved successfully", voucher);
  } catch (error) {
    return errorResponse(res, "Failed to retrieve voucher", error.message);
  }
};

/**
 * Update voucher with product/event scoping
 */
const updateVoucherWithScoping = async (req, res) => {
  try {
    const { id } = req.params;
    const voucherData = req.body;

    if (!voucherData || Object.keys(voucherData).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    const voucher = await voucherService.updateVoucherWithScoping(id, voucherData);
    return successResponse(res, "Voucher updated successfully", voucher);
  } catch (error) {
    return errorResponse(res, "Failed to update voucher", error.message, 400);
  }
};

/**
 * Validate voucher for specific items
 * Checks if voucher applies to given product_ids or event_ids
 */
const validateVoucherForItems = async (req, res) => {
  try {
    const { code, order_amount, product_ids, event_ids } = req.body;

    if (!code) {
      return validationErrorResponse(res, ["Voucher code is required"]);
    }

    if (order_amount === undefined || isNaN(order_amount) || order_amount < 0) {
      return validationErrorResponse(res, ["Valid order amount is required"]);
    }

    const validation = await voucherService.validateVoucherForItems(
      code,
      order_amount,
      product_ids || [],
      event_ids || []
    );

    if (!validation.valid) {
      return errorResponse(res, "Voucher validation failed", validation.error, 400);
    }

    return successResponse(res, "Voucher is valid for items", validation);
  } catch (error) {
    return errorResponse(res, "Failed to validate voucher", error.message, 400);
  }
};

module.exports = {
  createVoucher,
  getVoucherById,
  getVoucherByCode,
  getAllVouchers,
  updateVoucher,
  deleteVoucher,
  validateVoucher,
  applyVoucherToTicket,
  applyVoucherToPurchase,
  claimVoucher,
  // Voucher scoping exports
  createVoucherWithScoping,
  getVoucherWithScopingById,
  updateVoucherWithScoping,
  validateVoucherForItems,
};

