const express = require("express");
const router = express.Router();

// Import controllers
const ticketController = require("../controllers/ticket.controller");

// Import middleware
const { authenticate } = require("../middleware/auth.middleware");

// Protected routes (require authentication)
// Get all tickets for logged in user
router.get("/", authenticate, ticketController.getAllTickets);

// Get specific ticket by ID
router.get("/:id", authenticate, ticketController.getTicketById);

// Check ticket by payment ID (temporary for debugging)
router.get(
  "/check-payment/:paymentId",
  authenticate,
  ticketController.checkTicketByPaymentId
);

// Manually update ticket status (temporary for debugging)
router.post(
  "/update-status",
  authenticate,
  ticketController.updateTicketStatus
);

// Create a new ticket
router.post("/", authenticate, ticketController.createTicket);

// Initiate payment for a ticket
router.post("/payment", authenticate, ticketController.initiatePayment);

// Check in ticket using barcode (can be public or protected based on your needs)
router.post("/checkin", ticketController.checkInTicket);

module.exports = router;
