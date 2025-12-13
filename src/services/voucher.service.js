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

// ============ VOUCHER SCOPING FUNCTIONS ============

/**
 * Create voucher with product/event scoping
 * @param {Object} voucherData - Voucher data including product_ids, event_ids, apply_to_all
 */
const createVoucherWithScoping = async (voucherData) => {
  try {
    const { product_ids, event_ids, apply_to_all, ...baseData } = voucherData;

    // Create the base voucher first
    const voucherId = await VoucherRepository.create(baseData);

    // Set apply_to_all (defaults to true if not specified)
    const shouldApplyToAll = apply_to_all !== false &&
      (!product_ids || product_ids.length === 0) &&
      (!event_ids || event_ids.length === 0);

    await VoucherRepository.updateApplyToAll(voucherId, shouldApplyToAll);

    // Add product associations if provided and not apply_to_all
    if (!shouldApplyToAll && product_ids && product_ids.length > 0) {
      await VoucherRepository.addProductsToVoucher(voucherId, product_ids);
    }

    // Add event associations if provided and not apply_to_all
    if (!shouldApplyToAll && event_ids && event_ids.length > 0) {
      await VoucherRepository.addEventsToVoucher(voucherId, event_ids);
    }

    // Return created voucher with associations
    const createdVoucher = await getVoucherWithScoping(voucherId);
    return createdVoucher;
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to create voucher with scoping: " + error.message);
  }
};

/**
 * Get voucher by ID with product/event associations
 */
const getVoucherWithScoping = async (id) => {
  try {
    const voucher = await VoucherRepository.findById(id);
    if (!voucher) {
      return null;
    }

    const voucherJson = voucher.toJSON();

    // Get associated products and events
    const products = await VoucherRepository.getVoucherProducts(id);
    const events = await VoucherRepository.getVoucherEvents(id);

    return {
      ...voucherJson,
      products: products,
      events: events,
    };
  } catch (error) {
    throw new Error("Failed to get voucher with scoping: " + error.message);
  }
};

/**
 * Update voucher with product/event scoping
 */
const updateVoucherWithScoping = async (id, voucherData) => {
  try {
    const { product_ids, event_ids, apply_to_all, ...baseData } = voucherData;

    // Update base voucher data
    if (Object.keys(baseData).length > 0) {
      await VoucherRepository.update(id, baseData);
    }

    // Determine if voucher should apply to all
    const shouldApplyToAll = apply_to_all === true || apply_to_all === 1 || apply_to_all === "1";

    // Update apply_to_all
    if (apply_to_all !== undefined) {
      await VoucherRepository.updateApplyToAll(id, shouldApplyToAll);
    }

    // Update product associations
    if (product_ids !== undefined) {
      await VoucherRepository.removeAllProductsFromVoucher(id);
      if (!shouldApplyToAll && product_ids.length > 0) {
        await VoucherRepository.addProductsToVoucher(id, product_ids);
      }
    }

    // Update event associations
    if (event_ids !== undefined) {
      await VoucherRepository.removeAllEventsFromVoucher(id);
      if (!shouldApplyToAll && event_ids.length > 0) {
        await VoucherRepository.addEventsToVoucher(id, event_ids);
      }
    }

    return await getVoucherWithScoping(id);
  } catch (error) {
    throw new Error("Failed to update voucher with scoping: " + error.message);
  }
};

/**
 * Validate if voucher applies to given items (products or events)
 * @param {string} code - Voucher code
 * @param {number} orderAmount - Total order amount
 * @param {Array} productIds - Array of product IDs in cart
 * @param {Array} eventIds - Array of event IDs in tickets
 */
const validateVoucherForItems = async (code, orderAmount, productIds = [], eventIds = []) => {
  try {
    // First do basic voucher validation
    const voucher = await VoucherRepository.findByCode(code);
    if (!voucher) {
      throw new Error("Voucher not found");
    }

    // Check if voucher is valid
    const validity = voucher.isValid();
    if (!validity.valid) {
      throw new Error(validity.reason);
    }

    // Check minimum order value
    if (voucher.min_order_value && orderAmount < voucher.min_order_value) {
      throw new Error(
        `Minimum order value of ${voucher.min_order_value} is required`
      );
    }

    // Check voucher type and items
    const voucherType = voucher.voucher_type;
    const applyToAll = voucher.apply_to_all === 1 || voucher.apply_to_all === true;

    if (!applyToAll) {
      // Voucher is scoped - check if it applies to given items
      if (voucherType === "product") {
        if (productIds.length === 0) {
          throw new Error("This voucher can only be applied to products");
        }

        // Check if any product in cart is eligible
        let hasEligibleProduct = false;
        for (const productId of productIds) {
          const applies = await VoucherRepository.voucherAppliesToProduct(voucher.id, productId);
          if (applies) {
            hasEligibleProduct = true;
            break;
          }
        }

        if (!hasEligibleProduct) {
          throw new Error("This voucher does not apply to any products in your cart");
        }
      } else if (voucherType === "event") {
        if (eventIds.length === 0) {
          throw new Error("This voucher can only be applied to events");
        }

        // Check if any event is eligible
        let hasEligibleEvent = false;
        for (const eventId of eventIds) {
          const applies = await VoucherRepository.voucherAppliesToEvent(voucher.id, eventId);
          if (applies) {
            hasEligibleEvent = true;
            break;
          }
        }

        if (!hasEligibleEvent) {
          throw new Error("This voucher does not apply to any events in your order");
        }
      }
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
    return {
      valid: false,
      error: error.message,
    };
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
  getVoucherWithScoping,
  updateVoucherWithScoping,
  validateVoucherForItems,
};

