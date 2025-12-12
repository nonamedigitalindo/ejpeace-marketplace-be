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

        // Validate voucher
        const validation = await voucherService.validateVoucher(
          voucherCode,
          totalAmount
        );
        if (validation.valid) {
          appliedVoucher = validation.voucher;
          discountAmount = validation.discount_amount;
          finalAmount = validation.final_amount;
        }
      } catch (error) {
        console.warn("Failed to apply voucher:", error.message);
        // Continue without voucher if validation fails
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
      try {
        const VoucherRepository = require("../models/voucher.repository");
        await VoucherRepository.associateWithPurchase(
          purchaseId,
          appliedVoucher.id,
          discountAmount
        );
        // Increment voucher usage count
        await VoucherRepository.incrementUsage(appliedVoucher.id);
      } catch (error) {
        console.warn(
          "Failed to associate voucher with purchase:",
          error.message
        );
      }
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
    console.log(
      "[CREATE_PURCHASE_DIRECT] Starting purchase creation for user:",
      userId
    );
    console.log(
      "[CREATE_PURCHASE_DIRECT] Purchase data received:",
      JSON.stringify(purchaseData, null, 2)
    );
    // Log incoming data for debugging
    console.log(
      "Incoming purchaseData:",
      JSON.stringify(purchaseData, null, 2)
    );
    console.log(
      "Incoming shippingAddress:",
      JSON.stringify(shippingAddress, null, 2)
    );
    console.log("Creating direct purchase for user:", userId);
    console.log("Purchase data:", JSON.stringify(purchaseData, null, 2));
    console.log("Shipping address:", JSON.stringify(shippingAddress, null, 2));

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

    // Apply voucher discount if provided
    let finalAmount = totalAmount;
    let appliedVoucher = null;
    let discountAmount = 0;

    if (voucherCode) {
      try {
        // Import voucher service
        const voucherService = require("./voucher.service");

        // Validate voucher
        const validation = await voucherService.validateVoucher(
          voucherCode,
          totalAmount
        );
        if (validation.valid) {
          appliedVoucher = validation.voucher;
          discountAmount = validation.discount_amount;
          finalAmount = validation.final_amount;
        }
      } catch (error) {
        console.warn("Failed to apply voucher:", error.message);
        // Continue without voucher if validation fails
      }
    }

    console.log("Calculated total amount:", totalAmount);

    // Create purchase record
    console.log(
      "[CREATE_PURCHASE_DIRECT] Extracting product_id from purchaseData:",
      JSON.stringify(purchaseData, null, 2)
    );
    const productId = purchaseData.product_id || null;
    console.log("[CREATE_PURCHASE_DIRECT] Extracted productId:", productId);

    const purchaseRecordData = {
      user_id: userId,
      product_id: productId,
      total_amount: finalAmount,
      status: "pending",
    };

    const purchaseId = await PurchaseRepository.create(purchaseRecordData);

    console.log("Created purchase with ID:", purchaseId);

    // If voucher was applied, associate it with the purchase
    if (appliedVoucher) {
      try {
        const VoucherRepository = require("../models/voucher.repository");
        await VoucherRepository.associateWithPurchase(
          purchaseId,
          appliedVoucher.id,
          discountAmount
        );
        // Increment voucher usage count
        await VoucherRepository.incrementUsage(appliedVoucher.id);
      } catch (error) {
        console.warn(
          "Failed to associate voucher with purchase:",
          error.message
        );
      }
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

      // Format 1: purchase_{purchaseId}_{timestamp}
      const purchaseIdMatch1 = external_id.match(/^purchase_(\d+)_\d+$/);

      // Format 2: purchase_{purchaseId} (simpler format)
      const purchaseIdMatch2 = external_id.match(/^purchase_(\d+)$/);

      // Format 3: invoice_{invoiceId} (Xendit's default format)
      const invoiceIdMatch = external_id.match(/^invoice_(.+)$/);

      // Format 4: Just the purchase ID (in case it's sent directly)
      const directPurchaseIdMatch = external_id.match(/^(\d+)$/);

      if (purchaseIdMatch1) {
        purchaseId = purchaseIdMatch1[1];
        console.log("Found purchase ID from format 1:", purchaseId);
      } else if (purchaseIdMatch2) {
        purchaseId = purchaseIdMatch2[1];
        console.log("Found purchase ID from format 2:", purchaseId);
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

    // Check if purchase is already paid to prevent double processing
    if (purchase.status === "paid") {
      console.log(
        "⚠️  [Invoice Callback] Purchase already paid, skipping duplicate processing"
      );
      console.log(
        `    Purchase ID: ${purchase.id}, Status: ${purchase.status}`
      );
      console.log(`    This is likely a duplicate webhook callback.`);
      return {
        purchase_id: purchase.id,
        status: "paid",
        message: "Purchase already processed - duplicate webhook ignored",
      };
    }

    // Update purchase status based on invoice status
    let newStatus = "pending";
    if (status === "PAID" || status === "SUCCESS") {
      newStatus = "paid";
    } else if (status === "EXPIRED") {
      newStatus = "cancelled";
    } else if (status === "SETTLED") {
      newStatus = "paid"; // Treat SETTLED as paid
    }

    console.log(
      `[Invoice Callback] Updating purchase ${purchase.id} to status: ${newStatus}`
    );

    const updated = await PurchaseRepository.update(purchase.id, {
      status: newStatus,
      product_id: purchase.product_id, // Preserve product_id when updating status
      completed_at:
        status === "PAID" || status === "SUCCESS" || status === "SETTLED"
          ? new Date()
          : null,
    });

    if (!updated) {
      console.error(
        `[Invoice Callback] ❌ Failed to update purchase ${purchase.id}`
      );
      throw new Error("Failed to update purchase status");
    }

    console.log(
      `[Invoice Callback] ✅ Successfully updated purchase ${purchase.id} to ${newStatus}`
    );

    // Declare cartItems outside if block for wider scope
    let cartItems = [];

    // If payment is successful, update product quantities and generate tickets
    if (status === "PAID" || status === "SUCCESS" || status === "SETTLED") {
      console.log(
        `[Invoice Callback] Payment successful - Processing cart items for purchase ${purchase.id}`
      );

      // ✅ CRITICAL FIX: Get cart items by purchase_id (not user_id)
      // This ensures we only process items for THIS specific purchase
      // Cart items are already linked to purchase during creation
      cartItems = await CartRepository.getCartItemsByPurchaseId(purchase.id);

      console.log(
        `[Invoice Callback] Found ${cartItems.length} cart items for purchase ${purchase.id}`
      );

      // Validate cart items exist
      if (cartItems && Array.isArray(cartItems)) {
        for (const item of cartItems) {
          // Validate item structure
          if (!item.product_id || !item.quantity) {
            console.warn("Invalid cart item structure:", item);
            continue;
          }

          const product = await ProductRepository.findById(item.product_id);
          if (!product) {
            console.warn(`Product ${item.product_id} not found`);
            continue;
          }

          console.log(
            `[Invoice Callback] Processing product: ${product.name}, Category: ${product.category}`
          );

          // Check if this is a Ticket product
          if (product.category && product.category.toLowerCase() === "ticket") {
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
                              ${
                                barcode.qr_code_image
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
          }

          // Always update quantity for all products (including tickets)
          try {
            if (product.quantity >= item.quantity) {
              await ProductRepository.update(item.product_id, {
                name: product.name,
                description: product.description,
                price: product.price,
                category: product.category,
                size: product.size,
                quantity: product.quantity - item.quantity,
              });

              console.log(
                `[Invoice Callback] 📦 Updated quantity for product ${
                  product.name
                } (ID: ${item.product_id}) from ${product.quantity} to ${
                  product.quantity - item.quantity
                }`
              );
            } else {
              console.warn(
                `[Invoice Callback] ⚠️ Insufficient stock for product ${product.name} (ID: ${item.product_id}). Current: ${product.quantity}, Required: ${item.quantity}`
              );
            }
          } catch (stockError) {
            console.error(
              `[Invoice Callback] ❌ Failed to update stock for product ${item.product_id}:`,
              stockError.message
            );
            // Continue processing other items
          }
        }
      }
    }

    // ✅ FALLBACK: Handle direct purchase without cart items (Buy Now flow)
    if (newStatus === "paid") {
      // If no cart items found, this might be a direct purchase
      // Use purchase.product_id to reduce stock
      if (!cartItems || cartItems.length === 0) {
        console.log(
          `[Invoice Callback] ⚠️ No cart items found - checking for direct purchase`
        );

        if (purchase.product_id) {
          console.log(
            `[Invoice Callback] 📦 Processing direct purchase for product_id: ${purchase.product_id}`
          );

          try {
            const product = await ProductRepository.findById(
              purchase.product_id
            );

            if (product) {
              // Calculate actual quantity purchased from total_amount / price
              const productPrice = parseFloat(product.price);
              const totalAmount = parseFloat(purchase.total_amount);
              const purchasedQuantity = Math.floor(totalAmount / productPrice);

              console.log(
                `[Invoice Callback] 📊 Calculated quantity: ${totalAmount} / ${productPrice} = ${purchasedQuantity}`
              );

              if (product.quantity >= purchasedQuantity) {
                await ProductRepository.update(purchase.product_id, {
                  name: product.name,
                  description: product.description,
                  price: product.price,
                  category: product.category,
                  size: product.size,
                  quantity: product.quantity - purchasedQuantity,
                });

                console.log(
                  `[Invoice Callback] ✅ Direct purchase: Reduced stock for product "${
                    product.name
                  }" from ${product.quantity} to ${
                    product.quantity - purchasedQuantity
                  }`
                );
              } else {
                console.warn(
                  `[Invoice Callback] ⚠️ Insufficient stock for product ${product.id}`
                );
              }
            } else {
              console.warn(
                `[Invoice Callback] ⚠️ Product ${purchase.product_id} not found`
              );
            }
          } catch (error) {
            console.error(
              `[Invoice Callback] ❌ Error reducing stock for direct purchase:`,
              error
            );
          }
        } else {
          console.warn(
            `[Invoice Callback] ⚠️ No product_id in purchase - cannot reduce stock`
          );
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
                    <td style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">${
                      item.quantity
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
                <p>Terima kasih atas pembelian Anda. Pembayaran untuk pesanan #${
                  purchase.id
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
                
                ${
                  qrResult.publicUrl
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

module.exports = {
  createPurchaseFromCart,
  createPurchaseDirect,
  initiatePayment,
  handlePaymentCallback,
  handleInvoiceCallback,
  getUserPurchases,
  getPurchaseById,
  updatePurchaseTotal,
};
