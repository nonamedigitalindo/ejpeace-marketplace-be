const express = require("express");
const router = express.Router();

// Import controllers
const indexController = require("../controllers/index.controller");

// Import other route files
const userRoutes = require("./user.routes");
const productRoutes = require("./product.routes");
const eventRoutes = require("./event.routes");
const ticketRoutes = require("./ticket.routes");
const cartRoutes = require("./cart.routes");
const authRoutes = require("./auth.routes");
const purchaseRoutes = require("./purchase.routes");
const voucherRoutes = require("./voucher.routes");
const orderRoutes = require("./order.routes");
const orderAddressRoutes = require("./orderAddress.routes");
const xenditRoutes = require("./xendit.routes");
const invoiceRoutes = require("./invoice.routes");
const paymentCallbackRoutes = require("./paymentCallback.routes");
const debugRoutes = require("./debug.routes");
const testRoutes = require("./test.routes");

// Main route
router.get("/", indexController.index);
router.get("/welcome", indexController.welcome);

// API routes with v1 prefix
router.use("/v1/auth", authRoutes);
router.use("/v1/users", userRoutes);
router.use("/v1/products", productRoutes);
router.use("/v1/events", eventRoutes);
router.use("/v1/tickets", ticketRoutes);
router.use("/v1/cart", cartRoutes);
router.use("/v1/purchases", purchaseRoutes);
router.use("/v1/vouchers", voucherRoutes);
router.use("/v1/orders", orderRoutes);
router.use("/v1/order-addresses", orderAddressRoutes);
router.use("/v1/xendit", xenditRoutes);
router.use("/v1/invoices", invoiceRoutes);
router.use("/v1/payments", paymentCallbackRoutes);
router.use("/v1/debug", debugRoutes);
router.use("/v1/test", testRoutes);

module.exports = router;
