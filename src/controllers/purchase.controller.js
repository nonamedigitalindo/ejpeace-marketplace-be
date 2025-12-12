const purchaseService = require("../services/purchase.service");
const cartService = require("../services/cart.service");
const UserRepository = require("../models/user.repository");
const OrderAddressRepository = require("../models/orderAddress.repository");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  serviceUnavailableResponse,
  validationErrorResponse,
} = require("../utils/response.util");

const createPurchase = async (req, res) => {
  try {
    console.log("Creating purchase for user:", req.user.id);
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const userId = req.user.id; // Get user ID from authenticated user

    // Extract voucher code
    const { voucher_code } = req.body;

    // Extract shipping address (support both nested and flat structure)
    let shippingAddress = req.body.shipping_address;

    if (!shippingAddress) {
      // Fallback to flat structure (legacy support)
      const { voucher_code: _, ...rest } = req.body;
      shippingAddress = rest;
    }

    // Get user's cart items
    const cartItems = await cartService.getCartItems(userId);

    console.log("User cart items:", JSON.stringify(cartItems, null, 2));

    if (!cartItems || cartItems.length === 0) {
      console.log("Cart is empty for user:", userId);
      return validationErrorResponse(res, ["Cart is empty"]);
    }

    const purchase = await purchaseService.createPurchaseFromCart(
      userId,
      cartItems,
      shippingAddress,
      voucher_code // Pass voucher code to service
    );

    return successResponse(res, "Purchase created successfully", purchase, 201);
  } catch (error) {
    console.error("Failed to create purchase:", error);
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to create purchase");
    }
    return errorResponse(res, "Failed to create purchase", error.message, 400);
  }
};

const createPurchaseDirect = async (req, res) => {
  try {
    console.log("Creating direct purchase for user:", req.user.id);
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const userId = req.user.id; // Get user ID from authenticated user
    const { voucher_code, ...requestData } = req.body;

    // Extract purchase data and shipping address from request
    const { purchase_data, shipping_address } = requestData;

    // Validate that request body exists
    if (!requestData || Object.keys(requestData).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Validate purchase_data
    if (!purchase_data || typeof purchase_data !== "object") {
      return validationErrorResponse(res, ["Purchase data is required"]);
    }

    // Validate shipping_address
    if (!shipping_address || typeof shipping_address !== "object") {
      return validationErrorResponse(res, ["Shipping address is required"]);
    }

    const purchase = await purchaseService.createPurchaseDirect(
      userId,
      purchase_data,
      shipping_address,
      voucher_code // Pass voucher code to service
    );

    return successResponse(res, "Purchase created successfully", purchase, 201);
  } catch (error) {
    console.error("Failed to create direct purchase:", error);
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to create purchase");
    }
    return errorResponse(res, "Failed to create purchase", error.message, 400);
  }
};

const initiatePayment = async (req, res) => {
  try {
    const { purchase_id } = req.body;
    const userId = req.user.id; // Get user ID from authenticated user
    const userEmail = req.user.email; // Get user email from authenticated user

    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Validate purchase_id
    if (!purchase_id) {
      return validationErrorResponse(res, ["Purchase ID is required"]);
    }

    const paymentInfo = await purchaseService.initiatePayment(
      purchase_id,
      userId,
      userEmail
    );

    return successResponse(res, "Payment initiated successfully", paymentInfo);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to initiate payment");
    }
    return errorResponse(res, "Failed to initiate payment", error.message, 400);
  }
};

const handlePaymentCallback = async (req, res) => {
  try {
    // For webhook validation, we need to parse the raw body
    let callbackData;

    // If rawBody exists (from webhook validation middleware), parse it
    if (req.rawBody) {
      callbackData = JSON.parse(req.rawBody);
    } else {
      // Otherwise use the parsed body
      callbackData = req.body;
    }

    // Validate that request body exists
    if (!callbackData || Object.keys(callbackData).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    const result = await purchaseService.handlePaymentCallback(callbackData);

    return successResponse(
      res,
      "Payment callback processed successfully",
      result
    );
  } catch (error) {
    return errorResponse(
      res,
      "Failed to process payment callback",
      error.message,
      400
    );
  }
};

// New function to handle Xendit invoice callback
const handleInvoiceCallback = async (req, res) => {
  try {
    // For webhook validation, we need to parse the raw body
    let callbackData;

    // If rawBody exists (from webhook validation middleware), parse it
    if (req.rawBody) {
      callbackData = JSON.parse(req.rawBody);
    } else {
      // Otherwise use the parsed body
      callbackData = req.body;
    }

    // Validate that request body exists
    if (!callbackData || Object.keys(callbackData).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Process the invoice callback
    const result = await purchaseService.handleInvoiceCallback(callbackData);

    return successResponse(
      res,
      "Invoice callback processed successfully",
      result
    );
  } catch (error) {
    console.error("Invoice callback error:", error);
    return errorResponse(
      res,
      "Failed to process invoice callback",
      error.message,
      400
    );
  }
};

const getUserPurchases = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from authenticated user

    const purchases = await purchaseService.getUserPurchases(userId);

    return successResponse(res, "Purchases retrieved successfully", purchases);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve purchases");
    }
    return errorResponse(res, "Failed to retrieve purchases", error.message);
  }
};

const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Get user ID from authenticated user

    const purchase = await purchaseService.getPurchaseById(id, req.user);

    if (!purchase) {
      return notFoundResponse(res, "Purchase not found");
    }

    return successResponse(res, "Purchase retrieved successfully", purchase);
  } catch (error) {
    console.error("Failed to retrieve purchase:", error);
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve purchase");
    }
    return errorResponse(
      res,
      "Failed to retrieve purchase",
      error.message,
      400
    );
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await purchaseService.getPurchaseById(id, req.user);

    if (!purchase) {
      return errorResponse(res, "Purchase not found", null, 404);
    }

    // Construct path to invoice file
    const path = require("path");
    const fs = require("fs");

    // First, try to regenerate invoice to get the correct filename
    try {
      // Regenerate the invoice to get the proper filename
      const InvoiceService = require("../services/invoice.service");
      const CartRepository = require("../models/cart.repository");
      const UserRepository = require("../models/user.repository");
      const OrderAddressRepository = require("../models/orderAddress.repository");

      // Fetch required data
      // Get cart items by purchase ID (they should be linked after successful payment)
      const cartItems = await CartRepository.getCartItemsByPurchaseId(id);
      const user = await UserRepository.findById(req.user.id);
      // Get order address with product data
      const orderAddress = await OrderAddressRepository.findByPurchaseId(id);

      // Generate invoice
      const invoiceResult = await InvoiceService.generateInvoicePDF(
        purchase,
        cartItems,
        user,
        orderAddress
      );

      // Send the file with the correct filename
      return res.download(invoiceResult.filepath, invoiceResult.filename);
    } catch (genError) {
      console.error("Error generating invoice:", genError);
      return errorResponse(res, "Failed to generate invoice", null, 500);
    }
  } catch (error) {
    return errorResponse(res, "Failed to download invoice", error.message);
  }
};

const getPurchaseDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const requestUser = req.user || null; // Handle public access
    const purchase = await purchaseService.getPurchaseById(id, requestUser);

    if (!purchase) {
      return errorResponse(res, "Purchase not found", null, 404);
    }

    const CartRepository = require("../models/cart.repository");
    const ProductRepository = require("../models/product.repository");

    // Get cart items by purchase ID (linked after successful payment)
    // If no items found and purchase is not paid, try to get items from user's cart
    let items = await CartRepository.getCartItemsByPurchaseId(id);

    // If no items found by purchase ID and purchase is not paid,
    // get items from user's cart that belong to this purchase
    if (items.length === 0 && purchase.status !== "paid") {
      const userCartItems = await CartRepository.getCartItemsByUserId(
        purchase.user_id
      );
      // Filter items that belong to this purchase
      items = userCartItems.filter((item) => item.purchase_id == id);
    }

    // Get user data
    const user = await UserRepository.findById(purchase.user_id);

    // Get order address
    const address = await OrderAddressRepository.findByPurchaseId(id);

    // Check for QR code file
    const path = require("path");
    const fs = require("fs");
    const qrFilename = `qr_purchase_${id}.png`;
    const qrFilepath = path.join(__dirname, "../../uploads/qr", qrFilename);
    let qrUrl = null;

    // If QR code doesn't exist but purchase is paid, generate it
    if (!fs.existsSync(qrFilepath) && purchase.status === "paid") {
      try {
        const QRCodeService = require("../services/qrcode.service");
        const qrResult = await QRCodeService.generatePurchaseQR(id);
        qrUrl = qrResult.publicUrl;
      } catch (qrError) {
        console.error("Error generating QR code:", qrError);
      }
    } else if (fs.existsSync(qrFilepath)) {
      qrUrl = `/api/v1/uploads/qr/${qrFilename}`;
    }

    // Prepare customer data
    const customerData = {
      customer_name: user ? user.username : null,
      customer_email: user ? user.email : null,
      customer_phone: user ? user.phone : null,
    };

    // Prepare address data
    const addressData = address
      ? {
          full_name: address.full_name,
          phone: address.phone,
          address_line1: address.address_line1,
          address_line2: address.address_line2,
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: address.country,
        }
      : null;

    return successResponse(res, "Purchase detail retrieved", {
      ...purchase,
      ...customerData,
      address: addressData,
      items: items.map((item) => item.toJSON()),
      qr_url: qrUrl,
    });
  } catch (error) {
    return errorResponse(
      res,
      "Failed to retrieve purchase detail",
      error.message
    );
  }
};

module.exports = {
  createPurchase,
  createPurchaseDirect,
  initiatePayment,
  handlePaymentCallback,
  handleInvoiceCallback,
  getUserPurchases,
  getPurchaseById,
  downloadInvoice,
  getPurchaseDetail,
};
