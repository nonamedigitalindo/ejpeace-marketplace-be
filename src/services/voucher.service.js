const VoucherRepository = require("../models/voucher.repository");
const Voucher = require("../models/Voucher.model");
const ProductRepository = require("../models/product.repository");
const EventRepository = require("../models/event.repository");

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
/**
 * Validate a voucher against an order
 * 
 * CRITICAL: orderAmount must be the TOTAL ORDER SUBTOTAL, calculated as:
 * subtotal = Σ (item.quantity × item.unit_price)
 * 
 * ❌ WRONG: Passing single item price (e.g., ticket.price, product.price)
 * ✅ CORRECT: Passing total order amount (e.g., 4 tickets × 100k = 400k)
 * 
 * @param {string} code - Voucher code
 * @param {number} orderAmount - TOTAL ORDER SUBTOTAL (quantity × unit_price for all items)
 * @returns {Object} Validation result with discount calculation
 */
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
    // CRITICAL: min_order_value is checked against the TOTAL ORDER SUBTOTAL
    // NOT against individual item prices
    if (voucher.min_order_value && orderAmount < voucher.min_order_value) {
      throw new Error(
        `Minimum order value of ${voucher.min_order_value} is required to use this voucher. Your order total: ${orderAmount}`
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
/**
 * Apply voucher to a ticket purchase
 * 
 * CRITICAL: This function now requires the TOTAL ORDER AMOUNT to be passed
 * for proper minimum order validation.
 * 
 * The totalOrderAmount should be calculated as:
 * totalOrderAmount = Σ (ticket.quantity × ticket.price) for all tickets in order
 * 
 * @param {number} ticket_id - The ticket ID to apply voucher to
 * @param {string} voucher_code - The voucher code
 * @param {number} totalOrderAmount - TOTAL ORDER AMOUNT (all tickets × prices)
 */
const applyVoucherToTicket = async (ticket_id, voucher_code, totalOrderAmount = null) => {
  try {
    // Get ticket service to get ticket details
    const ticketService = require("./ticket.service");
    const ticket = await ticketService.getTicketById(ticket_id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // CRITICAL: Use totalOrderAmount if provided, otherwise use ticket price
    // For proper minimum order validation, totalOrderAmount SHOULD be provided
    // If not provided, we log a warning as this may cause incorrect validation
    let orderAmountForValidation = totalOrderAmount;
    if (!orderAmountForValidation || orderAmountForValidation <= 0) {
      console.warn(
        `[applyVoucherToTicket] WARNING: totalOrderAmount not provided for ticket ${ticket_id}. ` +
        `Using single ticket price ${ticket.price} which may cause incorrect minimum order validation. ` +
        `Please update frontend to pass total order amount.`
      );
      orderAmountForValidation = ticket.price;
    }

    // Validate voucher against the ORDER TOTAL, not individual item price
    const validation = await validateVoucher(voucher_code, orderAmountForValidation);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Calculate discount proportionally for this ticket if multiple tickets
    let discountForThisTicket = validation.discount_amount;
    if (totalOrderAmount && totalOrderAmount > ticket.price) {
      // Proportional discount: (ticket_price / total) × discount
      discountForThisTicket = (ticket.price / totalOrderAmount) * validation.discount_amount;
    }

    // Associate voucher with ticket
    const associationId = await VoucherRepository.associateWithTicket(
      ticket_id,
      validation.voucher.id,
      discountForThisTicket
    );
    // Increment voucher usage count
    await VoucherRepository.incrementUsage(validation.voucher.id);

    // Update ticket price with proportional discount
    const finalTicketPrice = Math.max(0, ticket.price - discountForThisTicket);
    const updatedTicket = await ticketService.updateTicketPrice(
      ticket_id,
      finalTicketPrice
    );
    return {
      message: "Voucher applied successfully",
      ticket: updatedTicket,
      voucher: validation.voucher,
      discount_amount: discountForThisTicket,
      final_amount: finalTicketPrice,
      // Include full order context
      order_total_discount: validation.discount_amount,
      order_final_amount: validation.final_amount,
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
 * 
 * CRITICAL: orderAmount must be the TOTAL ORDER SUBTOTAL:
 * subtotal = Σ (item.quantity × item.unit_price) for ALL items
 * 
 * @param {string} code - Voucher code
 * @param {number} orderAmount - TOTAL ORDER SUBTOTAL (not individual item price!)
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

    // CRITICAL: min_order_value checks TOTAL ORDER, not individual items
    if (voucher.min_order_value && orderAmount < voucher.min_order_value) {
      throw new Error(
        `Minimum order value of ${voucher.min_order_value} is required. Your order total: ${orderAmount}`
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

/**
 * Validate voucher usage with product/event price lookup from database
 * @param {string} code - Voucher code
 * @param {Array} productIds - Array of product IDs
 * @param {Array} eventIds - Array of event IDs
 */
const validateVoucherUsage = async (code, productIds = [], eventIds = []) => {
  try {
    // Find voucher by code
    const voucher = await VoucherRepository.findByCode(code);
    if (!voucher) {
      return {
        valid: false,
        error: "Voucher not found",
      };
    }

    // Check if voucher is active
    if (!voucher.is_active) {
      return {
        valid: false,
        error: "Voucher is not active",
      };
    }

    // Check valid_from date
    const now = new Date();
    if (now < new Date(voucher.valid_from)) {
      return {
        valid: false,
        error: "Voucher is not yet valid",
      };
    }

    // Check valid_until date
    if (now > new Date(voucher.valid_until)) {
      return {
        valid: false,
        error: "Voucher has expired",
      };
    }

    // Check usage limit (used_count vs max_usage)
    if (voucher.max_usage !== null && voucher.used_count >= voucher.max_usage) {
      return {
        valid: false,
        error: "Voucher usage limit reached",
      };
    }

    // Fetch prices from database and check scoping
    let totalAmount = 0;
    const eligibleProductIds = [];
    const eligibleEventIds = [];

    const voucherType = voucher.voucher_type;
    const applyToAll = voucher.apply_to_all === 1 || voucher.apply_to_all === true;

    // Process products
    for (const productId of productIds) {
      const product = await ProductRepository.findById(productId);
      if (product) {
        const price = parseFloat(product.price) || 0;

        if (applyToAll || voucherType !== "product") {
          // If apply_to_all or not a product voucher, all products are eligible
          totalAmount += price;
          eligibleProductIds.push(productId);
        } else {
          // Check if this specific product is in voucher scope
          const applies = await VoucherRepository.voucherAppliesToProduct(voucher.id, productId);
          if (applies) {
            totalAmount += price;
            eligibleProductIds.push(productId);
          }
        }
      }
    }

    // Process events
    for (const eventId of eventIds) {
      const event = await EventRepository.findById(eventId);
      if (event) {
        const price = parseFloat(event.price) || 0;

        if (applyToAll || voucherType !== "event") {
          // If apply_to_all or not an event voucher, all events are eligible
          totalAmount += price;
          eligibleEventIds.push(eventId);
        } else {
          // Check if this specific event is in voucher scope
          const applies = await VoucherRepository.voucherAppliesToEvent(voucher.id, eventId);
          if (applies) {
            totalAmount += price;
            eligibleEventIds.push(eventId);
          }
        }
      }
    }

    // Check if there are any eligible items for scoped vouchers
    if (!applyToAll) {
      if (voucherType === "product" && eligibleProductIds.length === 0) {
        return {
          valid: false,
          error: "This voucher does not apply to any products in your cart",
        };
      }
      if (voucherType === "event" && eligibleEventIds.length === 0) {
        return {
          valid: false,
          error: "This voucher does not apply to any events in your order",
        };
      }
    }

    // Check minimum order value
    if (voucher.min_order_value && totalAmount < voucher.min_order_value) {
      return {
        valid: false,
        error: `Minimum order value of ${voucher.min_order_value} is required`,
      };
    }

    // Calculate discount
    const discountAmount = voucher.calculateDiscount(totalAmount);
    const remainingUsage = voucher.max_usage !== null
      ? voucher.max_usage - voucher.used_count
      : null;

    return {
      valid: true,
      voucher: voucher.toJSON(),
      total_amount: totalAmount,
      discount_amount: discountAmount,
      final_amount: totalAmount - discountAmount,
      remaining_usage: remainingUsage,
      eligible_product_ids: eligibleProductIds,
      eligible_event_ids: eligibleEventIds,
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
  validateVoucherUsage,
};

