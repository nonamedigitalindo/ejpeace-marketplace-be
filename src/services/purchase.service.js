const { getBaseURL } = require("../utils/url.util");

const PurchaseRepository = require("../models/purchase.repository");
const Purchase = require("../models/Purchase.model");
const CartRepository = require("../models/cart.repository");
const ProductRepository = require("../models/product.repository");
const UserRepository = require("../models/user.repository");
const TicketRepository = require("../models/ticket.repository");
const PaymentService = require("./payment.service");
const OrderAddressRepository = require("../models/orderAddress.repository");
const db = require("../config/db.config");

const createPurchaseFromCart = async (
  userId,
  cartItems,
  shippingAddress,
  voucherCode = null
) => {
  try {
    console.log("Creating purchase from cart for user:", userId);
    console.log("Cart items:", JSON.stringify(cartItems, null, 2));
    console.log("Shipping address:", JSON.stringify(shippingAddress, null, 2));

    // Validate userId
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Validate cartItems
    if (!Array.isArray(cartItems)) {
      throw new Error("Cart items must be an array");
    }

    // Validate shipping address
    if (!shippingAddress || typeof shippingAddress !== "object") {
      throw new Error("Shipping address is required");
    }

    const { full_name, phone, address_line1, city, postal_code } =
      shippingAddress;

    if (!full_name || !phone || !address_line1 || !city || !postal_code) {
      throw new Error(
        "Missing required address fields: full_name, phone, address_line1, city, postal_code"
      );
    }

    // Check if the cart items are already linked to a pending purchase
    // This handles the "Retry Payment" scenario
    const linkedPurchaseIds = [
      ...new Set(
        cartItems
          .map((item) => item.purchase_id)
          .filter((id) => id !== null && id !== undefined)
      ),
    ];

    if (linkedPurchaseIds.length === 1) {
      // All items are linked to the SAME purchase
      // Check if ALL items in the cart are linked (no new items mixed in)
      const allLinked = cartItems.every(
        (item) => item.purchase_id === linkedPurchaseIds[0]
      );

      if (allLinked) {
        const existingPurchaseId = linkedPurchaseIds[0];
        console.log(
          `Resuming existing purchase session: ${existingPurchaseId}`
        );

        const existingPurchase = await PurchaseRepository.findById(
          existingPurchaseId
        );

        // Only resume if the purchase is still in a valid state
        if (
          existingPurchase &&
          (existingPurchase.status === "pending" ||
            existingPurchase.status === "pending_payment")
        ) {
          // Verify total amount matches (optional safety check, but good for debugging)
          // If the user modified the cart (e.g. quantity), the total might be different
          // But since they are linked, they shouldn't be modifiable?
          // Actually, if we create a new purchase for mixed items, we overwrite links.

          return existingPurchase.toJSON();
        }
      }
    }

    // If we reach here, it means:
    // 1. Items are not linked (New Order)
    // 2. Items are mixed (some linked, some new) -> Create NEW purchase for ALL
    // 3. Items are linked to multiple different purchases -> Create NEW purchase for ALL
    // 4. Linked purchase is invalid/expired -> Create NEW purchase

    // We intentionally SKIP the check for "pending purchases with same product ID"
    // because that caused the bug where a new order for 1 item resumed an old order for 5 items.
    // We now allow creating a new purchase even if a pending one exists.
    // The old pending purchase will eventually be abandoned/cancelled.

    // Calculate total amount from cart items
    let totalAmount = 0;
    for (const item of cartItems) {
      // Validate item structure
      if (!item.product_id || !item.quantity) {
        throw new Error("Invalid cart item structure");
      }

      const product = await ProductRepository.findById(item.product_id);
      if (!product) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }

      // Validate quantity
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${item.product_id}`);
      }

      // Check product availability
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient quantity for product ${item.product_id}`);
      }

      // Use discounted price if available, otherwise use regular price
      const price = product.getDiscountedPrice();
      totalAmount += price * item.quantity;
    }

    // Apply voucher discount if provided
    let finalAmount = totalAmount;
    let appliedVoucher = null;
    let discountAmount = 0;

    if (voucherCode) {
      try {
        // Import voucher service
        const voucherService = require("./voucher.service");

        // Validate voucher - STRICT: Throw error if invalid
        const validation = await voucherService.validateVoucher(
          voucherCode,
          totalAmount
        );
        if (validation.valid) {
          appliedVoucher = validation.voucher;
          discountAmount = validation.discount_amount;
          finalAmount = validation.final_amount;
        } else {
          // Should theoretically be caught by validateVoucher throwing, but just in case
          throw new Error("Voucher invalid");
        }
      } catch (error) {
        console.error("Voucher validation failed:", error.message);
        throw new Error("Voucher usage limit has been reached or is invalid: " + error.message);
      }
    }

    console.log("Calculated total amount:", totalAmount);

    // Validate total amount
    if (totalAmount <= 0) {
      throw new Error("Total amount must be greater than zero");
    }

    // Create purchase record
    // Use the first product ID if available
    const firstProductId =
      cartItems.length > 0 ? cartItems[0].product_id : null;

    const purchaseData = {
      user_id: userId,
      product_id: firstProductId, // Add product_id to purchase record
      total_amount: finalAmount,
      status: "pending",
    };

    const purchaseId = await PurchaseRepository.create(purchaseData);

    console.log("Created purchase with ID:", purchaseId);

    // If voucher was applied, associate it with the purchase
    if (appliedVoucher) {
      console.log(`[createPurchaseFromCart] 🎟️ Associating voucher ID ${appliedVoucher.id} with purchase ${purchaseId}`);
      try {
        const VoucherRepository = require("../models/voucher.repository");
        const linkId = await VoucherRepository.associateWithPurchase(
          purchaseId,
          appliedVoucher.id,
          discountAmount
        );
        console.log(`[createPurchaseFromCart] ✅ Voucher linked successfully (link ID: ${linkId})`);
        // Increment usage removed to prevent double counting (moved to handleInvoiceCallback)
        // await VoucherRepository.incrementUsage(appliedVoucher.id);
      } catch (error) {
        console.error(`[createPurchaseFromCart] ❌ VOUCHER LINK FAILED: ${error.message}`);
        // Make this a hard failure so the issue is visible
        throw new Error(`Failed to associate voucher with purchase: ${error.message}`);
      }
    } else {
      console.log(`[createPurchaseFromCart] No voucher applied to purchase ${purchaseId}`);
    }

    // Create order address
    // Use the first product ID (already defined above)

    const addressData = {
      purchase_id: purchaseId,
      product_id: firstProductId,
      full_name: full_name,
      phone: phone,
      address_line1: address_line1,
      address_line2: shippingAddress.address_line2 || null,
      city: city,
      state: shippingAddress.state || null,
      postal_code: postal_code,
      country: shippingAddress.country || "Indonesia",
    };

    await OrderAddressRepository.create(addressData);

    // ✅ CRITICAL FIX: Link cart items to purchase IMMEDIATELY
    // This ensures webhook callback can fetch items by purchase_id
    // to properly reduce stock after payment
    console.log(
      `[createPurchaseFromCart] Linking ${cartItems.length} cart items to purchase ${purchaseId}`
    );
    for (const item of cartItems) {
      const linked = await linkCartItemToPurchase(item.id, purchaseId);
      console.log(
        `[createPurchaseFromCart] Linked cart item ${item.id} to purchase ${purchaseId}: ${linked}`
      );
    }
    console.log(
      `[createPurchaseFromCart] Successfully linked all cart items to purchase ${purchaseId}`
    );

    // Return purchase data
    const purchase = await PurchaseRepository.findById(purchaseId);
    return purchase.toJSON();
  } catch (error) {
    console.error("Failed to create purchase from cart:", error);
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to create purchase: " + error.message);
  }
};

// Create a purchase directly without requiring cart items
const createPurchaseDirect = async (
  userId,
  purchaseData,
  shippingAddress,
  voucherCode = null
) => {
  try {

    // Validate userId
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Validate purchaseData
    if (!purchaseData || typeof purchaseData !== "object") {
      throw new Error("Purchase data is required");
    }

    // Validate shipping address
    if (!shippingAddress || typeof shippingAddress !== "object") {
      throw new Error("Shipping address is required");
    }

    const { full_name, phone, address_line1, city, postal_code } =
      shippingAddress;

    if (!full_name || !phone || !address_line1 || !city || !postal_code) {
      throw new Error(
        "Missing required address fields: full_name, phone, address_line1, city, postal_code"
      );
    }

    // Validate required purchase data fields
    if (
      purchaseData.total_amount === undefined ||
      isNaN(purchaseData.total_amount) ||
      purchaseData.total_amount <= 0
    ) {
      throw new Error("Valid total amount is required");
    }

    let totalAmount = parseFloat(purchaseData.total_amount);
    let description = purchaseData.description || "Product purchase";

    // Extract product_id for checking existing pending purchases
    const productId = purchaseData.product_id || null;

    // ========== REMOVED: CHECK FOR EXISTING PENDING PURCHASE ==========
    // Previously, this code would merge new purchases with existing pending ones,
    // causing quantity/amount duplication. Now we always create a fresh purchase.
    // Old pending purchases will expire naturally or can be manually cancelled.
    // ========== END REMOVED SECTION ==========

    // Apply voucher discount if provided
    let finalAmount = totalAmount;
    let appliedVoucher = null;
    let discountAmount = 0;

    if (voucherCode) {
      try {
        // Import voucher service
        const voucherService = require("./voucher.service");

        // Validate voucher - STRICT: Throw error if invalid
        const validation = await voucherService.validateVoucher(
          voucherCode,
          totalAmount
        );
        console.log("Voucher validation result:", validation);
        if (validation.valid) {
          appliedVoucher = validation.voucher;
          discountAmount = validation.discount_amount;
          finalAmount = validation.final_amount;
        } else {
          // Should theoretically be caught by validateVoucher throwing, but just in case
          throw new Error("Voucher invalid");
        }
      } catch (error) {
        console.error("Voucher validation failed:", error.message);
        throw new Error("Voucher usage limit has been reached or is invalid: " + error.message);
      }
    }

    const purchaseRecordData = {
      user_id: userId,
      product_id: productId,
      total_amount: finalAmount,
      status: "pending",
    };

    const purchaseId = await PurchaseRepository.create(purchaseRecordData);
    console.log('appliedVoucher', appliedVoucher)
    // If voucher was applied, associate it with the purchase
    if (appliedVoucher) {
      try {
        const VoucherRepository = require("../models/voucher.repository");
        const linkId = await VoucherRepository.associateWithPurchase(
          purchaseId,
          appliedVoucher.id,
          discountAmount
        );
        console.log(`[createPurchaseDirect] ✅ Voucher linked successfully (link ID: ${linkId})`);
        // Increment usage removed to prevent double counting (moved to handleInvoiceCallback)
        //  await VoucherRepository.incrementUsage(appliedVoucher.id);
      } catch (error) {
        console.error(`[createPurchaseDirect] ❌ VOUCHER LINK FAILED: ${error.message}`);
        throw new Error(`Failed to associate voucher with purchase: ${error.message}`);
      }
    } else {
      console.log(`[createPurchaseDirect] No voucher applied to purchase ${purchaseId}`);
    }

    // Create order address
    // For direct purchase, use product ID from purchase data (already declared above)

    const addressData = {
      purchase_id: purchaseId,
      product_id: productId,
      full_name: full_name,
      phone: phone,
      address_line1: address_line1,
      address_line2: shippingAddress.address_line2 || null,
      city: city,
      state: shippingAddress.state || null,
      postal_code: postal_code,
      country: shippingAddress.country || "Indonesia",
    };

    await OrderAddressRepository.create(addressData);

    // Return purchase data
    const purchase = await PurchaseRepository.findById(purchaseId);
    // if (appliedVoucher){

    // }
    return purchase.toJSON();
  } catch (error) {
    console.error("Failed to create direct purchase:", error);
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to create purchase: " + error.message);
  }
};

const initiatePayment = async (purchaseId, userId, userEmail) => {
  try {
    // Validate parameters
    if (!purchaseId || !userId || !userEmail) {
      throw new Error("Purchase ID, User ID, and User Email are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      throw new Error("Invalid email format");
    }

    // Get purchase details
    const purchase = await PurchaseRepository.findById(purchaseId);
    if (!purchase) {
      throw new Error("Purchase not found");
    }

    // Verify purchase belongs to user
    if (purchase.user_id !== userId) {
      throw new Error("Unauthorized access to purchase");
    }

    // Verify purchase status is pending or pending_payment
    if (
      purchase.status !== "pending" &&
      purchase.status !== "pending_payment"
    ) {
      throw new Error("Purchase is not in a valid state for payment");
    }

    // If purchase is already pending_payment, check if we can just return the existing invoice
    if (purchase.status === "pending_payment" && purchase.payment_id) {
      console.log(
        `Purchase ${purchaseId} is already pending payment. Checking for existing invoice.`
      );
      try {
        // Try to retrieve the invoice from Xendit to ensure it's still active
        // For now, we'll assume if we have a payment_id, we might be able to reuse it
        // But to be safe and simple, let's create a NEW invoice if the previous one is old
        // OR just return the existing invoice URL if we stored it (we don't store URL in DB currently, only ID)

        // BETTER APPROACH: If it's pending_payment, we should probably just create a new invoice
        // to be safe, OR if we had the URL we could return it.
        // Since we don't store the invoice URL in the purchase table (only payment_id),
        // let's create a new invoice to ensure the user gets a fresh link.
        // Xendit allows multiple invoices for same external ID usually, or we update the external ID.

        console.log("Regenerating invoice for pending_payment purchase...");
      } catch (e) {
        console.warn(
          "Error checking existing invoice, proceeding to create new one"
        );
      }
    }

    // Create external ID for Xendit
    // Append timestamp to ensure uniqueness even for retries
    const externalId = `purchase_${purchaseId}_${Date.now()}`;

    // Create invoice with Xendit
    const invoiceData = {
      externalId: externalId,
      amount: parseFloat(purchase.total_amount), // Ensure amount is a number
      payerEmail: userEmail,
      description: `Product purchase #${purchaseId}`,
      successRedirectURL: `${getBaseURL()}/payment/success`,
      failureRedirectURL: `${getBaseURL()}/payment/failure`,
    };

    const invoice = await PaymentService.createInvoice(invoiceData);

    // Update purchase with payment ID and external ID
    const updated = await PurchaseRepository.update(purchaseId, {
      payment_id: invoice.id,
      external_id: externalId, // Simpan external_id juga
      status: "pending_payment",
    });

    if (!updated) {
      throw new Error("Failed to update purchase with payment information");
    }

    // Return payment information
    return {
      purchase_id: purchaseId,
      payment_id: invoice.id,
      invoice_url: invoice.invoiceUrl,
      status: invoice.status,
    };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to initiate payment: " + error.message);
  }
};

const handlePaymentCallback = async (callbackData) => {
  try {
    console.log(
      "[HANDLE_PAYMENT_CALLBACK] Received callback data:",
      JSON.stringify(callbackData, null, 2)
    );
    // Validate callback data
    if (!callbackData || typeof callbackData !== "object") {
      throw new Error("Invalid callback data");
    }

    // Process Xendit callback
    const paymentResult = await PaymentService.handlePaymentCallback(
      callbackData
    );

    // Validate payment result
    if (!paymentResult.invoiceId) {
      throw new Error("Invalid payment result");
    }

    // Find purchase by payment ID
    console.log(
      "[HANDLE_PAYMENT_CALLBACK] Looking for purchase with payment_id:",
      paymentResult.invoiceId
    );
    const purchase = await PurchaseRepository.findByPaymentId(
      paymentResult.invoiceId
    );
    if (!purchase) {
      throw new Error("Purchase not found for this payment");
    }
    console.log(
      "[HANDLE_PAYMENT_CALLBACK] Found purchase:",
      JSON.stringify(purchase, null, 2)
    );

    // Check if purchase is already paid to prevent double processing
    if (purchase.status === "paid") {
      console.log("Purchase already paid, skipping duplicate processing");
      return {
        purchase_id: purchase.id,
        status: "paid",
        message: "Purchase already processed",
      };
    }

    // Update purchase status based on payment result
    let newStatus = "pending";
    if (paymentResult.status === "PAID") {
      newStatus = "paid";
    } else if (paymentResult.status === "EXPIRED") {
      newStatus = "cancelled";
    }

    const updated = await PurchaseRepository.update(purchase.id, {
      status: newStatus,
      product_id: purchase.product_id, // Preserve product_id when updating status
      completed_at: paymentResult.status === "PAID" ? new Date() : null,
    });

    if (!updated) {
      throw new Error("Failed to update purchase status");
    }

    // If payment is successful, update product quantities
    if (paymentResult.status === "PAID") {
      // Get cart items for this user to update product quantities
      const cartItems = await CartRepository.getCartItemsByUserId(
        purchase.user_id
      );

      // Validate cart items exist
      if (cartItems && Array.isArray(cartItems)) {
        // Link cart items to the purchase now that payment is successful
        for (const item of cartItems) {
          await linkCartItemToPurchase(item.id, purchase.id);
        }

        for (const item of cartItems) {
          // Validate item structure
          if (!item.product_id || !item.quantity) {
            console.warn("Invalid cart item structure:", item);
            continue;
          }

          const product = await ProductRepository.findById(item.product_id);
          if (product && product.quantity >= item.quantity) {
            // Update product quantity
            await ProductRepository.update(item.product_id, {
              name: product.name,
              description: product.description,
              price: product.price,
              category: product.category,
              size: product.size,
              quantity: product.quantity - item.quantity,
            });
          }
        }
      }

      // Increment voucher usage if voucher was applied to this purchase
      try {
        const VoucherRepository = require("../models/voucher.repository");
        const [voucherRows] = await db.execute(
          "SELECT voucher_id FROM purchase_vouchers WHERE purchase_id = ?",
          [purchase.id]
        );

        if (voucherRows.length > 0) {
          const voucherId = voucherRows[0].voucher_id;
          await VoucherRepository.incrementUsage(voucherId);
          console.log(`[PAYMENT_CALLBACK] Incremented usage for voucher ${voucherId}`);
        }
      } catch (voucherError) {
        console.warn("[PAYMENT_CALLBACK] Could not increment voucher usage:", voucherError.message);
      }

      // NOTE: We no longer clear the cart here because it should only be cleared
      // after the invoice and email have been successfully sent in handleInvoiceCallback
      // This ensures the user can still see their cart items if they check their cart
      // before the payment confirmation process is fully complete
    }

    return {
      purchase_id: purchase.id,
      status: newStatus,
      message: `Purchase status updated to ${newStatus}`,
    };
  } catch (error) {
    throw new Error("Failed to handle payment callback: " + error.message);
  }
};

// New function to handle Xendit invoice callback
const handleInvoiceCallback = async (callbackData) => {
  try {
    console.log(
      "[HANDLE_INVOICE_CALLBACK] Received callback data:",
      JSON.stringify(callbackData, null, 2)
    );
    // Validate callback data
    if (!callbackData || typeof callbackData !== "object") {
      throw new Error("Invalid callback data");
    }

    // Log the incoming callback data for debugging
    console.log(
      "Xendit Invoice Callback Received:",
      JSON.stringify(callbackData, null, 2)
    );

    // Extract relevant information from the callback
    const {
      id,
      external_id,
      status,
      amount,
      paid_amount,
      paid_at,
      payer_email,
      payment_method,
      payment_channel,
    } = callbackData;

    // Validate required fields
    if (!id || !external_id || !status) {
      throw new Error("Missing required fields in callback data");
    }

    // Handle Xendit Test Payload (from Dashboard "Test and Save")
    if (external_id === "invoice_123124123") {
      console.log("Received Xendit Test Payload. Returning success.");
      return {
        purchase_id: "test-purchase-id",
        status: "paid",
        message: "Test payload processed successfully",
        invoice_id: id,
        external_id: external_id,
      };
    }

    let purchaseId = null;
    let purchase = null;

    // Try multiple approaches to find the purchase
    console.log("Attempting to find purchase using multiple approaches...");

    // Approach 1: Try to find by payment_id directly
    console.log("Approach 1: Finding purchase by payment_id:", id);
    purchase = await PurchaseRepository.findByPaymentId(id);
    if (purchase) {
      purchaseId = purchase.id;
      console.log("Found purchase by payment_id:", purchaseId);
      console.log("Purchase details:", JSON.stringify(purchase, null, 2));
    }

    // Approach 2: If not found, try to parse external_id for purchase information
    if (!purchaseId) {
      console.log(
        "Approach 2: Parsing external_id for purchase information:",
        external_id
      );

      // Format 1: purchase_{purchaseId}_{timestamp} (digits only)
      const purchaseIdMatch1 = external_id.match(/^purchase_(\d+)_\d+$/);

      // Format 2: purchase_{purchaseId} (simpler format)
      const purchaseIdMatch2 = external_id.match(/^purchase_(\d+)$/);

      // Format 3: purchase_{purchaseId}_{anything} (flexible format for various suffixes)
      // This handles formats like: purchase_653_178/24332K5G1
      const purchaseIdMatch3 = external_id.match(/^purchase_(\d+)_/);

      // Format 4: invoice_{invoiceId} (Xendit's default format)
      const invoiceIdMatch = external_id.match(/^invoice_(.+)$/);

      // Format 5: Just the purchase ID (in case it's sent directly)
      const directPurchaseIdMatch = external_id.match(/^(\d+)$/);

      if (purchaseIdMatch1) {
        purchaseId = purchaseIdMatch1[1];
        console.log("Found purchase ID from format 1 (digits timestamp):", purchaseId);
      } else if (purchaseIdMatch2) {
        purchaseId = purchaseIdMatch2[1];
        console.log("Found purchase ID from format 2 (simple):", purchaseId);
      } else if (purchaseIdMatch3) {
        purchaseId = purchaseIdMatch3[1];
        console.log("Found purchase ID from format 3 (flexible):", purchaseId);
      } else if (invoiceIdMatch) {
        // If it's in Xendit's invoice format, check if it contains purchase information
        const invoiceId = invoiceIdMatch[1];
        console.log("Found invoice ID:", invoiceId);

        // Check if the invoice ID contains purchase information
        const purchaseInInvoiceMatch = invoiceId.match(/purchase_(\d+)/);
        if (purchaseInInvoiceMatch) {
          purchaseId = purchaseInInvoiceMatch[1];
          console.log("Found purchase ID from invoice ID:", purchaseId);
        }
      } else if (directPurchaseIdMatch) {
        // If external_id is just a number, treat it as purchase ID
        purchaseId = directPurchaseIdMatch[1];
        console.log("Found purchase ID as direct number:", purchaseId);
      }
    }

    // Approach 3: If we have a purchaseId, try to get the purchase
    if (purchaseId && !purchase) {
      console.log("Approach 3: Getting purchase by ID:", purchaseId);
      purchase = await PurchaseRepository.findById(purchaseId);
      if (!purchase) {
        console.log("Purchase not found with ID:", purchaseId);
      }
    }

    // If we still haven't found the purchase, throw an error with detailed information
    if (!purchase) {
      // Get all purchases for debugging
      const allPurchases = await PurchaseRepository.findAll();
      console.log(
        "All purchases in database:",
        JSON.stringify(
          allPurchases.map((p) => ({
            id: p.id,
            payment_id: p.payment_id,
            external_id: p.external_id,
            status: p.status,
          })),
          null,
          2
        )
      );

      throw new Error(
        `Purchase not found for this invoice. ` +
        `External ID: ${external_id}, ` +
        `Payment ID: ${id}, ` +
        `Parsed Purchase ID: ${purchaseId || "null"}. ` +
        `Check if the purchase was created and the payment was initiated.`
      );
    }

    // START TRANSACTION
    const connection = await db.getConnection();
    await connection.beginTransaction();

    let newStatus = "pending"; // Declare newStatus here for wider scope
    let cartItems = []; // Declare cartItems here for wider scope

    try {
      // 🔒 LOCK ROW: Get purchase with lock to prevent race conditions
      console.log(`[Invoice Callback] 🔒 Locking purchase row ${purchase.id}...`);
      const [lockedRows] = await connection.execute(
        "SELECT * FROM purchases WHERE id = ? FOR UPDATE",
        [purchase.id]
      );

      if (lockedRows.length === 0) {
        await connection.rollback();
        throw new Error(`Purchase ${purchase.id} not found during lock`);
      }

      const lockedPurchase = lockedRows[0];

      // ✅ IDEMPOTENCY CHECK: Check if already paid
      if (lockedPurchase.status === "paid") {
        await connection.commit();
        console.log(
          "⚠️  [Invoice Callback] Purchase already paid (idempotent check), skipping."
        );
        return {
          purchase_id: lockedPurchase.id,
          status: "paid",
          message: "Purchase already processed - duplicate webhook ignored",
        };
      }

      // 🔍 STRICT VOUCHER VALIDATION (BEFORE PAYMENT)
      // Check if voucher limit is reached BEFORE we attempt to process payment
      const VoucherRepository = require("../models/voucher.repository");
      const [voucherRows] = await connection.execute(
        "SELECT voucher_id FROM purchase_vouchers WHERE purchase_id = ?",
        [lockedPurchase.id]
      );

      let voucherIdToCheck = null;
      console.log(`[Invoice Callback] 🔍 Checking purchase_vouchers for purchase ${lockedPurchase.id}...`);
      console.log(`[Invoice Callback] Found ${voucherRows.length} voucher link(s)`);
      if (voucherRows.length > 0) {
        voucherIdToCheck = voucherRows[0].voucher_id;
        console.log(`[Invoice Callback] 🎟️ Voucher ID to increment: ${voucherIdToCheck}`);

        // Lock and check voucher
        const [vRows] = await connection.execute(
          "SELECT id, used_count, max_usage FROM vouchers WHERE id = ? FOR UPDATE",
          [voucherIdToCheck]
        );

        if (vRows.length > 0) {
          const voucher = vRows[0];
          if (voucher.max_usage && voucher.used_count >= voucher.max_usage) {
            console.error(`[Invoice Callback] ❌ Voucher ${voucher.id} limit exceeded (Used: ${voucher.used_count}, Max: ${voucher.max_usage})`);
            const error = new Error("Voucher usage limit has been reached");
            error.code = "VOUCHER_LIMIT_EXCEEDED";
            throw error;
          }
        }
      } else {
        console.log(`[Invoice Callback] ⚠️ No voucher linked to this purchase`);
      }

      // Determine new status
      if (status === "PAID" || status === "SUCCESS") {
        newStatus = "paid";
      } else if (status === "EXPIRED") {
        newStatus = "cancelled";
      } else if (status === "SETTLED") {
        newStatus = "paid";
      }

      console.log(
        `[Invoice Callback] Updating purchase ${lockedPurchase.id} to status: ${newStatus}`
      );

      // UPDATE STATUS (Transactional)
      await PurchaseRepository.updateStatusWithConnection(
        lockedPurchase.id,
        newStatus,
        connection
      );

      // If payment is successful, process stock and vouchers
      if (newStatus === "paid") {
        console.log(`[Invoice Callback] Payment successful - Processing items...`);

        // 1. Get Cart Items
        cartItems = await CartRepository.getCartItemsByPurchaseId(lockedPurchase.id);

        // Fallback 1: Order Addresses
        if (!cartItems || cartItems.length === 0) {
          try {
            const OrderAddressRepository = require("../models/orderAddress.repository");
            const orderAddress = await OrderAddressRepository.findByPurchaseId(lockedPurchase.id);
            if (orderAddress && orderAddress.product_id) {
              const product = await ProductRepository.findById(orderAddress.product_id);
              if (product) {
                const totalAmount = parseFloat(lockedPurchase.total_amount);
                const productPrice = parseFloat(product.price);
                const quantity = Math.max(1, Math.floor(totalAmount / productPrice));
                cartItems = [{
                  product_id: orderAddress.product_id,
                  quantity: quantity,
                  product_name: product.name,
                  product_category: product.category
                }];
                console.log(`[Invoice Callback] Used order_addresses fallback.`);
              }
            }
          } catch (err) {
            console.warn(`[Invoice Callback] order_addresses fallback failed: ${err.message}`);
          }
        }

        // Fallback 2: User Cart
        if (!cartItems || cartItems.length === 0) {
          // Note: This relies on user's current cart state, which is risky but kept as last resort
          const userCartItems = await CartRepository.getCartItemsByUserId(lockedPurchase.user_id);
          if (userCartItems && userCartItems.length > 0) {
            cartItems = userCartItems;
            console.log(`[Invoice Callback] Used user cart fallback.`);
          }
        }

        // 2. Reduce Stock (Transactional)
        if (cartItems && cartItems.length > 0) {
          for (const item of cartItems) {
            if (!item.product_id || !item.quantity) continue;

            // Get current product state (could also lock product row here if strict consistency needed)
            const product = await ProductRepository.findById(item.product_id);
            if (product) {
              // Ticket Creation Logic (kept non-transactional for now as it involves many external calls/emails)
              // Ideally tickets should be created within transaction too, but let's focus on stock/voucher first.
              // We will keep the ticket creation logic OUTSIDE this block or assume it handles its own errors safely.
              // For this refactor, I will ONLY reduce stock transactionally.

              // STRICT STOCK REDUCTION
              // Use updateQuantityWithConnection which returns false if stock is insufficient
              // If it returns false, we MUST throw an error to ROLLBACK the entire transaction
              const stockReduced = await ProductRepository.updateQuantityWithConnection(
                item.product_id,
                item.quantity,
                connection
              );

              if (stockReduced) {
                console.log(`[Invoice Callback] 📉 Stock reduced for product ${item.product_id}`);
              } else {
                console.error(`[Invoice Callback] ❌ Insufficient stock for product ${item.product_id} (Requested: ${item.quantity})`);
                const error = new Error(`Insufficient stock for product ${item.product_id}`);
                error.code = "INSUFFICIENT_STOCK";
                throw error;
              }
            }
          }
        }

        // 3. Handle Direct Purchase Stock Reduction (Transactional)
        if ((!cartItems || cartItems.length === 0) && lockedPurchase.product_id) {
          const product = await ProductRepository.findById(lockedPurchase.product_id);
          if (product) {
            const totalAmount = parseFloat(lockedPurchase.total_amount);
            const productPrice = parseFloat(product.price);
            const quantity = Math.floor(totalAmount / productPrice);

            const stockReduced = await ProductRepository.updateQuantityWithConnection(
              lockedPurchase.product_id,
              quantity,
              connection
            );

            if (stockReduced) {
              console.log(`[Invoice Callback] 📉 Direct purchase stock reduced`);
            } else {
              console.error(`[Invoice Callback] ❌ Insufficient stock for direct purchase (Product: ${lockedPurchase.product_id})`);
              const error = new Error(`Insufficient stock for product ${lockedPurchase.product_id}`);
              error.code = "INSUFFICIENT_STOCK";
              throw error;
            }
          }
        }

        // 4. Increment Voucher Usage (Transactional)
        // We already checked limits above, but this call includes the strict check again for safety
        if (voucherIdToCheck) {
          // STRICT VOUCHER INCREMENT
          const voucherUpdated = await VoucherRepository.incrementUsageWithConnection(voucherIdToCheck, connection);

          if (voucherUpdated) {
            console.log(`[Invoice Callback] 🎟️ Voucher ${voucherIdToCheck} usage incremented`);
          } else {
            // This technically shouldn't happen if the check above passed and row was locked,
            // unless max_usage was reduced by admin concurrently? But we locked row, so it's safe.
            // Or if incrementUsageWithConnection logic differs.
            console.error(`[Invoice Callback] ❌ Voucher ${voucherIdToCheck} usage limit reached (at increment step)`);
            const error = new Error(`Voucher usage limit reached for voucher ${voucherIdToCheck}`);
            error.code = "VOUCHER_LIMIT_EXCEEDED";
            throw error;
          }
        }
      }

      await connection.commit();
      console.log(`[Invoice Callback] ✅ Transaction committed successfully`);
    } catch (error) {
      await connection.rollback();
      console.error(`[Invoice Callback] ❌ Transaction failed, rolled back: ${error.message}`);

      // CRITICAL: Handle specific failures by marking order status
      // We must do this AFTER rollback, in a new persistent operation
      if (error.code === "VOUCHER_LIMIT_EXCEEDED") {
        try {
          console.log("[Invoice Callback] marking order as failed_voucher_limit...");
          await PurchaseRepository.update(purchase.id, {
            status: "failed_voucher_limit", // Custom status for manual review/user notification
            completed_at: null
          });
        } catch (updateErr) {
          console.error("[Invoice Callback] Failed to mark order as failed_voucher_limit:", updateErr.message);
        }
      } else if (error.code === "INSUFFICIENT_STOCK") {
        // Optional: You could also mark insufficient_stock here if desired, 
        // simply logging it for now as strict requirement was mainly about voucher used_count
      }

      throw error;
    } finally {
      connection.release();
    }

    // Post-Transaction: Ticket Creation & Emails (Non-critical to be in same DB transaction, but good to be after commit)
    // We need to re-fetch items or use the `cartItems` from above to generate tickets
    // Since we are now outside the transaction, we can proceed with non-transactional tasks
    if (newStatus === "paid") {
      // Re-run ticket logic here if needed, or keeping it strictly stock/voucher focused as requested.
      // The original code had ticket creation mixed in. I should preserve it.
      // To preserve it without bloating the transaction block, I will iterate cartItems again here.

      // Helper function for ticket creation to keep the main flow clean
      const _handleTicketCreation = async (item, purchase, product) => {
        console.log(
          `[Invoice Callback] 🎫 Found ticket product: ${product.name}`
        );

        // Parse EventID from description
        const eventIdMatch =
          product.description &&
          product.description.match(/\[EventID:\s*(\d+)\]/i);

        if (eventIdMatch) {
          const eventId = parseInt(eventIdMatch[1]);
          console.log(
            `[Invoice Callback] 🎟️ Creating ticket for Event ID: ${eventId}`
          );

          try {
            // Import BarcodeService (ticket.service causes circular dependency)
            const BarcodeService = require("./barcode.service");

            // Get user details for ticket
            const user = await UserRepository.findById(purchase.user_id);

            // Create ticket for each quantity
            for (let i = 0; i < item.quantity; i++) {
              // Create ticket record
              const ticketData = {
                user_id: purchase.user_id,
                event_id: eventId,
                ticket_type: product.size || "general", // Use product size as ticket type if available
                price: product.getDiscountedPrice(),
                status: "paid",
                payment_id: purchase.payment_id,
                attendee_name: user.username || user.email,
                attendee_email: user.email,
                attendee_phone: user.phone || null,
              };

              // Create ticket in database using top-level import
              const ticketId = await TicketRepository.create(ticketData);

              console.log(
                `[Invoice Callback] ✅ Created ticket ${ticketId} for Event ${eventId}`
              );

              // Generate barcode/QR code for the ticket
              const barcode = await BarcodeService.createBarcode(
                ticketId,
                purchase.user_id,
                eventId
              );

              console.log(
                `[Invoice Callback] 🎫 Generated barcode for ticket ${ticketId}`
              );

              // Send ticket confirmation email directly using NotificationService
              // to avoid circular dependency with ticket.service
              try {
                const NotificationService = require("./notification.service");
                const EventRepository = require("../models/event.repository");

                const event = await EventRepository.findById(eventId);

                if (event && user) {
                  const formattedPrice = new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(ticketData.price);

                  const startDate = new Date(event.start_date);
                  const formattedStartDate = startDate.toLocaleDateString(
                    "id-ID",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );

                  const emailHtml = `
                      <!DOCTYPE html>
                      <html>
                      <head><meta charset="UTF-8"><title>Konfirmasi Tiket</title></head>
                      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                          <h2>🎉 Konfirmasi Pembelian Tiket</h2>
                          <p>Halo ${ticketData.attendee_name},</p>
                          <p>Terima kasih telah membeli tiket untuk:</p>
                          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>${event.title}</h3>
                            <p><strong>Lokasi:</strong> ${event.location}</p>
                            <p><strong>Tanggal:</strong> ${formattedStartDate}</p>
                            <p><strong>Harga:</strong> ${formattedPrice}</p>
                          </div>
                          <div style="text-align: center; margin: 30px 0;">
                            <p><strong>ID Tiket:</strong> ${ticketId}</p>
                            ${barcode.qr_code_image
                      ? `<img src="${barcode.qr_code_image}" alt="QR Code" style="max-width: 200px;">`
                      : ""
                    }
                          </div>
                          <p>Salam,<br>Tim Peacetifal</p>
                        </div>
                      </body>
                      </html>
                    `;

                  await NotificationService.sendEmail(
                    ticketData.attendee_email,
                    `Konfirmasi Tiket - ${event.title}`,
                    emailHtml
                  );
                }
              } catch (emailError) {
                console.error(
                  `[Invoice Callback] ⚠️ Failed to send email for ticket ${ticketId}:`,
                  emailError.message
                );
                // Continue even if email fails
              }

              console.log(
                `[Invoice Callback] 📧 Processed confirmation for ticket ${ticketId}`
              );
            }
          } catch (ticketError) {
            console.error(
              `[Invoice Callback] ❌ Failed to create ticket for Event ${eventId}:`,
              ticketError.message
            );
            // Continue processing other items even if ticket creation fails
          }
        } else {
          console.warn(
            `[Invoice Callback] ⚠️ Ticket product "${product.name}" missing [EventID: X] in description`
          );
        }
      };

      if (cartItems && cartItems.length > 0) {
        for (const item of cartItems) {
          const product = await ProductRepository.findById(item.product_id);
          if (product && product.category && product.category.toLowerCase() === "ticket") {
            _handleTicketCreation(item, purchase, product).catch(err => console.error("Ticket creation error:", err));
          }
        }
      }
    }


    // --- NEW: Generate QR & Invoice & Send Email ---
    if (newStatus === "paid") {
      try {
        const QRCodeService = require("./qrcode.service");
        const InvoiceService = require("./invoice.service");
        const NotificationService = require("./notification.service");
        const UserRepository = require("../models/user.repository");

        console.log("[Invoice Callback] 🔄 Generating QR and Invoice...");

        // 1. Generate QR Code
        const qrResult = await QRCodeService.generatePurchaseQR(purchase.id);

        // 2. Fetch data for Invoice
        // Now that we've linked cart items to the purchase, we can get them by purchase ID
        const cartItemsForInvoice =
          await CartRepository.getCartItemsByPurchaseId(purchase.id);
        console.log(
          "[Invoice Callback] Cart items for invoice:",
          JSON.stringify(cartItemsForInvoice, null, 2)
        );
        console.log(
          `[Invoice Callback] Found ${cartItemsForInvoice.length} cart items linked to purchase ${purchase.id}`
        );

        // Log each item's product details
        cartItemsForInvoice.forEach((item, index) => {
          console.log(`[Invoice Callback] Item ${index + 1}:`, {
            product_id: item.product_id,
            product_name: item.product_name,
            product_size: item.product_size,
            product_category: item.product_category,
            quantity: item.quantity,
            product_price: item.product_price,
          });
        });

        const userForInvoice = await UserRepository.findById(purchase.user_id);

        // 3. Fetch order address for customer info
        const OrderAddressRepository = require("../models/orderAddress.repository");
        const orderAddress = await OrderAddressRepository.findByPurchaseId(
          purchase.id
        );

        // Create updated purchase object with correct status
        const updatedPurchase = {
          ...purchase,
          status: newStatus,
        };

        // 4. Generate Invoice PDF with order address
        const invoiceResult = await InvoiceService.generateInvoicePDF(
          updatedPurchase,
          cartItemsForInvoice,
          userForInvoice,
          orderAddress
        );

        // 4. Send Email with Invoice and QR Code
        if (userForInvoice && userForInvoice.email) {
          // Create HTML content for the email with QR code
          const customerName =
            orderAddress?.full_name ||
            userForInvoice.username ||
            userForInvoice.email;
          const customerEmail = orderAddress?.email || userForInvoice.email;

          // Prepare product items for email display
          let emailProductRows = "";

          // Priority 1: Use cart items (for cart checkout flow)
          if (cartItemsForInvoice && cartItemsForInvoice.length > 0) {
            emailProductRows = cartItemsForInvoice
              .map((item) => {
                let productDisplayName = item.product_name || "Product";
                if (item.product_size) {
                  productDisplayName += ` (${item.product_size})`;
                }
                if (item.product_category) {
                  productDisplayName += ` - ${item.product_category}`;
                }

                return `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${productDisplayName}</td>
                    <td style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity
                  }</td>
                    <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Rp ${item.product_price.toLocaleString(
                    "id-ID"
                  )}</td>
                    <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Rp ${(
                    item.product_price * item.quantity
                  ).toLocaleString("id-ID")}</td>
                  </tr>
                `;
              })
              .join("");
          }
          // Priority 2: Query product from database using orderAddress.product_id or purchase.product_id
          else {
            try {
              const productId = orderAddress?.product_id || purchase.product_id;
              if (productId) {
                const product = await ProductRepository.findById(productId);
                if (product) {
                  let productDisplayName = product.name || "Product";
                  if (product.size) {
                    productDisplayName += ` (${product.size})`;
                  }
                  if (product.category) {
                    productDisplayName += ` - ${product.category}`;
                  }

                  const productPrice = product.getDiscountedPrice();
                  emailProductRows = `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${productDisplayName}</td>
                      <td style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">1</td>
                      <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Rp ${productPrice.toLocaleString(
                    "id-ID"
                  )}</td>
                      <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Rp ${productPrice.toLocaleString(
                    "id-ID"
                  )}</td>
                    </tr>
                  `;
                } else {
                  // Product not found
                  emailProductRows = `
                    <tr>
                      <td colspan="4" style="padding: 8px; text-align: center; color: #999;">Product ID: ${productId} (Not Found)</td>
                    </tr>
                  `;
                }
              } else {
                // No product_id available
                emailProductRows = `
                  <tr>
                    <td colspan="4" style="padding: 8px; text-align: center; color: #999;">Product information unavailable</td>
                  </tr>
                `;
              }
            } catch (error) {
              console.error(
                "[Invoice Callback] Error fetching product for email:",
                error
              );
              emailProductRows = `
                <tr>
                  <td colspan="4" style="padding: 8px; text-align: center; color: #999;">Error loading product details</td>
                </tr>
              `;
            }
          }

          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><title>Konfirmasi Pembayaran</title></head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>✅ Pembayaran Berhasil</h2>
                <p>Halo ${customerName},</p>
                <p>Terima kasih atas pembelian Anda. Pembayaran untuk pesanan #${purchase.id
            } telah berhasil dikonfirmasi.</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>Detail Pesanan:</h3>
                  <p><strong>ID Pesanan:</strong> ${purchase.id}</p>
                  <p><strong>Total Pembayaran:</strong> Rp ${purchase.total_amount.toLocaleString(
              "id-ID"
            )}</p>
                  <p><strong>Status:</strong> ${newStatus}</p>
                </div>
                
                <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>Item yang Dibeli:</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr>
                        <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Produk</th>
                        <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Jumlah</th>
                        <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Harga</th>
                        <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${emailProductRows}
                    </tbody>
                  </table>
                </div>
                
                ${qrResult.publicUrl
              ? `
                <div style="text-align: center; margin: 30px 0;">
                  <p><strong>QR Code:</strong></p>
                  <img src="http://212.85.27.163:3000${qrResult.publicUrl}" alt="QR Code" style="max-width: 200px;">
                  <p><small>Gunakan QR Code ini untuk verifikasi pembelian Anda</small></p>
                </div>
                `
              : ""
            }
                
                <p>Invoice pembelian telah dilampirkan dalam email ini.</p>
                <p>Anda juga dapat melihat detail pembelian dan mengunduh invoice melalui dashboard profil Anda.</p>
                
                <br>
                <p>Salam,<br>Tim Peacetifal</p>
              </div>
            </body>
            </html>
          `;

          // Send email with both invoice attachment and QR code in content
          await NotificationService.sendEmail(
            customerEmail,
            `Konfirmasi Pembayaran - Pesanan #${purchase.id}`,
            emailHtml,
            [
              {
                filename: invoiceResult.filename, // Use actual generated filename
                path: invoiceResult.filepath,
              },
            ]
          );

          console.log(
            `[Invoice Callback] 📧 Invoice and QR Code sent to ${customerEmail}`
          );

          // NOW clear user's cart after invoice and email are successfully sent
          await CartRepository.clearUserCart(purchase.user_id);
          console.log(
            `[Invoice Callback] 🗑️ Cleared cart for user ${purchase.user_id}`
          );
        }
      } catch (extraError) {
        console.error(
          "[Invoice Callback] ⚠️ Error generating QR/Invoice/Email:",
          extraError
        );
      }
    }

    return {
      purchase_id: purchase.id,
      status: newStatus,
      message: `Purchase status updated to ${newStatus}`,
    };
  } catch (error) {
    console.error("Failed to handle invoice callback:", error);
    throw new Error("Failed to handle invoice callback: " + error.message);
  }
};

const getUserPurchases = async (userId) => {
  try {
    // Validate userId
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Import ProductRepository
    const ProductRepository = require("../models/product.repository");

    const purchases = await PurchaseRepository.findByUserId(userId);

    // Enhance each purchase with product data
    const enhancedPurchases = await Promise.all(
      purchases.map(async (purchase) => {
        const purchaseData = purchase.toJSON();

        // Get product data based on purchase.product_id
        if (purchaseData.product_id) {
          const product = await ProductRepository.findById(
            purchaseData.product_id
          );
          if (product) {
            purchaseData.product = product.toJSON();
          }
        }

        return purchaseData;
      })
    );

    return enhancedPurchases;
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve purchases: " + error.message);
  }
};

const getPurchaseById = async (purchaseId, user) => {
  try {
    // Validate parameters
    if (!purchaseId) {
      throw new Error("Purchase ID is required");
    }

    const userId = user ? user.id : null;
    const userRole = user ? user.role : "public";

    console.log(
      `[getPurchaseById] Getting purchase ${purchaseId} for user ${userId} (Role: ${userRole})`
    );
    const purchase = await PurchaseRepository.findById(purchaseId);
    if (!purchase) {
      console.log(`[getPurchaseById] Purchase ${purchaseId} not found`);
      return null;
    }

    console.log(
      `[getPurchaseById] Found purchase:`,
      JSON.stringify(purchase, null, 2)
    );

    // Verify purchase belongs to user OR user is admin OR access is public
    // If user is null, we allow public access (as per requirement)
    if (user && purchase.user_id !== userId && user.role !== "admin") {
      console.log(
        `[getPurchaseById] Unauthorized access - purchase user_id ${purchase.user_id} does not match request user_id ${userId}`
      );
      throw new Error("Unauthorized access to purchase");
    }

    const purchaseData = purchase.toJSON();

    // Get product data based on purchase.product_id
    if (purchaseData.product_id) {
      console.log(
        `[getPurchaseById] Fetching product data for product_id: ${purchaseData.product_id}`
      );
      const product = await ProductRepository.findById(purchaseData.product_id);
      if (product) {
        purchaseData.product = product.toJSON();
        console.log(
          `[getPurchaseById] Added product data:`,
          JSON.stringify(purchaseData.product, null, 2)
        );
      } else {
        console.log(
          `[getPurchaseById] Product ${purchaseData.product_id} not found`
        );
      }
    }

    console.log(
      `[getPurchaseById] Returning purchase data:`,
      JSON.stringify(purchaseData, null, 2)
    );
    return purchaseData;
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    console.error("[getPurchaseById] Error retrieving purchase:", error);
    throw new Error("Failed to retrieve purchase: " + error.message);
  }
};

// Update purchase total amount
const updatePurchaseTotal = async (purchaseId, newTotalAmount) => {
  try {
    // Validate parameters
    if (!purchaseId) {
      throw new Error("Purchase ID is required");
    }

    if (
      newTotalAmount === undefined ||
      isNaN(newTotalAmount) ||
      newTotalAmount < 0
    ) {
      throw new Error("Valid new total amount is required");
    }

    // Update purchase with new total amount
    const updated = await PurchaseRepository.update(purchaseId, {
      total_amount: newTotalAmount,
    });

    if (!updated) {
      throw new Error("Failed to update purchase total amount");
    }

    // Return updated purchase data
    const purchase = await PurchaseRepository.findById(purchaseId);
    return purchase.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to update purchase total: " + error.message);
  }
};

// New function to link cart items to a purchase
const linkCartItemToPurchase = async (cartItemId, purchaseId) => {
  try {
    console.log(
      `[linkCartItemToPurchase] Linking cart item ${cartItemId} to purchase ${purchaseId}`
    );
    const query = `
      UPDATE cart
      SET purchase_id = ?
      WHERE id = ?
    `;

    console.log(
      `[linkCartItemToPurchase] Executing query with purchaseId: ${purchaseId}, cartItemId: ${cartItemId}`
    );
    const [result] = await db.execute(query, [purchaseId, cartItemId]);
    console.log(`[linkCartItemToPurchase] Query executed successfully`);
    console.log(
      `[linkCartItemToPurchase] Affected rows: ${result.affectedRows}`
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error linking cart item to purchase:", error);
    return false;
  }
};

/**
 * Simulate payment success for testing when Xendit is not configured
 * This function manually processes a purchase as PAID:
 * - Reduces product stock
 * - Increments voucher usage if applicable
 * - Updates purchase status to 'paid'
 */
const simulatePaymentSuccess = async (purchaseId) => {
  try {
    console.log(`[SIMULATE_PAYMENT] Starting simulation for purchase ${purchaseId}`);

    // Get purchase
    const purchase = await PurchaseRepository.findById(purchaseId);
    if (!purchase) {
      throw new Error("Purchase not found");
    }

    // Check if already paid
    if (purchase.status === "paid") {
      return {
        success: true,
        message: "Purchase already paid",
        purchase_id: purchaseId,
      };
    }

    // Get cart items linked to this purchase
    let cartItems = await CartRepository.getCartItemsByPurchaseId(purchaseId);

    // If no items linked, try to get from user's cart and link them
    if (cartItems.length === 0) {
      console.log(`[SIMULATE_PAYMENT] No linked items found, checking user cart`);
      const userCartItems = await CartRepository.getCartItemsByUserId(purchase.user_id);

      if (userCartItems && userCartItems.length > 0) {
        // Link cart items to purchase
        for (const item of userCartItems) {
          await linkCartItemToPurchase(item.id, purchaseId);
        }
        cartItems = userCartItems;
      }
    }

    console.log(`[SIMULATE_PAYMENT] Found ${cartItems.length} cart items`);

    // Use handleInvoiceCallback to ensure consistent, strict transactional logic
    // Construct a synthetic Xendit-like callback payload

    // Ensure we have an external_id to match. If purchase doesn't have one, we might need a workaround,
    // but typically purchases have external_id.
    const externalId = purchase.external_id || `purchase_${purchase.id}_simulation`;

    const simulationPayload = {
      id: `sim_inv_${Date.now()}`,
      external_id: externalId,
      status: "PAID",
      amount: purchase.total_amount,
      paid_amount: purchase.total_amount,
      paid_at: new Date().toISOString(),
      payer_email: "simulation@test.com",
      description: "Simulated Payment via Admin/Dev Tool"
    };

    console.log(`[SIMULATE_PAYMENT] Delegating to handleInvoiceCallback with payload:`, simulationPayload);

    // Call handleInvoiceCallback
    // detailed result is returned by handleInvoiceCallback
    const result = await handleInvoiceCallback(simulationPayload);

    return {
      success: true,
      message: "Payment simulation completed via strict transactional flow",
      data: result
    };
  } catch (error) {
    console.error("[SIMULATE_PAYMENT] Error:", error);
    throw new Error("Failed to simulate payment: " + error.message);
  }
};

module.exports = {
  createPurchaseFromCart,
  createPurchaseDirect,
  initiatePayment,
  handlePaymentCallback,
  handleInvoiceCallback,
  getUserPurchases,
  getPurchaseById,
  updatePurchaseTotal,
  simulatePaymentSuccess,
};
