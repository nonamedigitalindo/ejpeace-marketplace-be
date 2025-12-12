const VoucherRepository = require("../models/voucher.repository");
const Voucher = require("../models/Voucher.model");

const createVoucher = async (voucherData) => {
  try {
    // Validate that voucherData exists
    if (!voucherData) {
      throw new Error("Voucher data is required");
    }
    // Create voucher object
    const voucher = new Voucher(voucherData);

    // Validate voucher data
    const validationErrors = voucher.validate();
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }
    // Check if voucher code already exists
    const existingVoucher = await VoucherRepository.findByCode(voucher.code);
    if (existingVoucher) {
      throw new Error("Voucher with this code already exists");
    }
    // Create voucher
    const voucherId = await VoucherRepository.create({
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      max_usage: voucher.max_usage,
      min_order_value: voucher.min_order_value,
      valid_from: voucher.valid_from,
      valid_until: voucher.valid_until,
      is_active: voucher.is_active,
      voucher_type: voucher.voucher_type, // Add the new field
    });
    // Return voucher data
    const createdVoucher = await VoucherRepository.findById(voucherId);
    return createdVoucher.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to create voucher: " + error.message);
  }
};
const getVoucherById = async (id) => {
  try {
    const voucher = await VoucherRepository.findById(id);
    if (!voucher) {
      return null;
    }
    return voucher.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve voucher: " + error.message);
  }
};
const getVoucherByCode = async (code) => {
  try {
    const voucher = await VoucherRepository.findByCode(code);
    if (!voucher) {
      return null;
    }
    return voucher.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve voucher: " + error.message);
  }
};
const getAllVouchers = async () => {
  try {
    const vouchers = await VoucherRepository.findAll();
    return vouchers.map((voucher) => voucher.toJSON());
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve vouchers: " + error.message);
  }
};
const updateVoucher = async (id, voucherData) => {
  try {
    console.log("=== SERVICE DEBUG ===");
    console.log("ID:", id);
    console.log(
      "Voucher data received:",
      JSON.stringify(
        voucherData,
        (key, value) => {
          if (value === undefined) return "***UNDEFINED***";
          if (value === null) return "***NULL***";
          return value;
        },
        2
      )
    );
    // Check each value in the incoming data
    Object.keys(voucherData).forEach((key) => {
      const value = voucherData[key];
      console.log(
        `Service key: ${key}, Value: ${value}, Type: ${typeof value}`
      );
      if (value === undefined) {
        console.error(`UNDEFINED VALUE FOUND in service: key=${key}`);
      }
    });
    // Check if voucher exists
    const existingVoucher = await VoucherRepository.findById(id);
    if (!existingVoucher) {
      throw new Error("Voucher not found");
    }
    // Simple and clean approach - just pass the data as-is to the repository
    // The repository will handle filtering out undefined values
    const updated = await VoucherRepository.update(id, voucherData);
    if (!updated) {
      throw new Error("Failed to update voucher");
    }
    // Return updated voucher data
    const updatedVoucher = await VoucherRepository.findById(id);
    return updatedVoucher.toJSON();
  } catch (error) {
    console.error("Service error:", error);
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to update voucher: " + error.message);
  }
};
const deleteVoucher = async (id) => {
  try {
    // Check if voucher exists
    const existingVoucher = await VoucherRepository.findById(id);
    if (!existingVoucher) {
      throw new Error("Voucher not found");
    }
    // Delete voucher
    const deleted = await VoucherRepository.delete(id);
    if (!deleted) {
      throw new Error("Failed to delete voucher");
    }
    return { message: "Voucher deleted successfully" };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to delete voucher: " + error.message);
  }
};
const validateVoucher = async (code, orderAmount) => {
  try {
    // Find voucher by code
    const voucher = await VoucherRepository.findByCode(code);
    if (!voucher) {
      throw new Error("Voucher not found");
    }
    // Check if voucher is valid
    const validity = voucher.isValid();
    if (!validity.valid) {
      throw new Error(validity.reason);
    }
    // Check if order amount meets minimum requirement
    if (voucher.min_order_value && orderAmount < voucher.min_order_value) {
      throw new Error(
        `Minimum order value of ${voucher.min_order_value} is required to use this voucher`
      );
    }
    // Calculate discount
    const discountAmount = voucher.calculateDiscount(orderAmount);

    return {
      valid: true,
      voucher: voucher.toJSON(),
      discount_amount: discountAmount,
      final_amount: orderAmount - discountAmount,
    };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    return {
      valid: false,
      error: error.message,
    };
  }
};
const applyVoucherToTicket = async (ticket_id, voucher_code) => {
  try {
    // Get ticket service to get ticket details
    const ticketService = require("./ticket.service");
    const ticket = await ticketService.getTicketById(ticket_id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }
    // Validate voucher
    const validation = await validateVoucher(voucher_code, ticket.price);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    // Associate voucher with ticket
    const associationId = await VoucherRepository.associateWithTicket(
      ticket_id,
      validation.voucher.id,
      validation.discount_amount
    );
    // Increment voucher usage count
    await VoucherRepository.incrementUsage(validation.voucher.id);

    // Update ticket price
    const updatedTicket = await ticketService.updateTicketPrice(
      ticket_id,
      validation.final_amount
    );
    return {
      message: "Voucher applied successfully",
      ticket: updatedTicket,
      voucher: validation.voucher,
      discount_amount: validation.discount_amount,
      final_amount: validation.final_amount,
    };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to apply voucher: " + error.message);
  }
};
// Apply voucher to purchase
const applyVoucherToPurchase = async (purchase_id, voucher_code) => {
  try {
    // Get purchase service to get purchase details
    const purchaseService = require("./purchase.service");
    const purchase = await purchaseService.getPurchaseById(purchase_id);
    if (!purchase) {
      throw new Error("Purchase not found");
    }

    // Validate voucher
    const validation = await validateVoucher(
      voucher_code,
      purchase.total_amount
    );
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Associate voucher with purchase
    const associationId = await VoucherRepository.associateWithPurchase(
      purchase_id,
      validation.voucher.id,
      validation.discount_amount
    );

    // Increment voucher usage count
    await VoucherRepository.incrementUsage(validation.voucher.id);

    // Update purchase total amount
    const updatedPurchase = await purchaseService.updatePurchaseTotal(
      purchase_id,
      validation.final_amount
    );

    return {
      message: "Voucher applied successfully",
      purchase: updatedPurchase,
      voucher: validation.voucher,
      discount_amount: validation.discount_amount,
      final_amount: validation.final_amount,
    };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to apply voucher: " + error.message);
  }
};

// New claim voucher service method
const claimVoucher = async (voucherId, userId) => {
  try {
    // Check if voucher exists
    const voucher = await VoucherRepository.findById(voucherId);
    if (!voucher) {
      throw new Error("Voucher not found");
    }

    // Check if voucher is valid
    const validity = voucher.isValid();
    if (!validity.valid) {
      throw new Error(`Voucher is not valid: ${validity.reason}`);
    }

    // Check if user has already claimed this voucher
    const alreadyClaimed = await VoucherRepository.hasUserClaimedVoucher(
      voucherId,
      userId
    );
    if (alreadyClaimed) {
      throw new Error("Voucher already claimed by user");
    }

    // Create user voucher claim record
    const claimId = await VoucherRepository.claimVoucherForUser(
      voucherId,
      userId
    );

    // Increment voucher usage count
    await VoucherRepository.incrementUsage(voucherId);

    return {
      message: "Voucher claimed successfully",
      claim_id: claimId,
      voucher: voucher.toJSON(),
      user_id: userId,
      claimed_at: new Date(),
    };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to claim voucher: " + error.message);
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
};
