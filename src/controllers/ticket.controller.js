const getAllTickets = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from authenticated user
    const tickets = await ticketService.getAllTicketsByUser(userId);

    return successResponse(res, "Tickets retrieved successfully", tickets);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve tickets");
    }
    return errorResponse(res, "Failed to retrieve tickets", error.message);
  }
};

const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Get user ID from authenticated user

    const ticket = await ticketService.getTicketById(id, userId);

    if (!ticket) {
      return notFoundResponse(res, "Ticket not found");
    }

    return successResponse(res, "Ticket retrieved successfully", ticket);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve ticket");
    }
    return errorResponse(res, "Failed to retrieve ticket", error.message);
  }
};

// Temporary endpoint to check ticket by payment ID (for debugging)
const checkTicketByPaymentId = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Import ticket repository directly
    const TicketRepository = require("../models/ticket.repository");

    const ticket = await TicketRepository.findByPaymentId(paymentId);

    if (!ticket) {
      return notFoundResponse(res, "Ticket not found with this payment ID");
    }

    return successResponse(res, "Ticket found", ticket);
  } catch (error) {
    return errorResponse(res, "Failed to check ticket", error.message);
  }
};

// Temporary endpoint to manually update ticket status (for debugging)
const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId, status } = req.body;

    // Validate request body
    if (!ticketId || !status) {
      return validationErrorResponse(res, [
        "Ticket ID and status are required",
      ]);
    }

    // Import ticket service directly
    const ticketService = require("../services/ticket.service");

    const updatedTicket = await ticketService.updateTicketStatus(
      ticketId,
      status
    );

    return successResponse(
      res,
      "Ticket status updated successfully",
      updatedTicket
    );
  } catch (error) {
    return errorResponse(res, "Failed to update ticket status", error.message);
  }
};

const createTicket = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from authenticated user
    const ticketData = req.body; // Get ticket data from request body

    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Add user ID to ticket data
    ticketData.user_id = userId;

    const ticket = await ticketService.createTicket(ticketData);

    return successResponse(res, "Ticket created successfully", ticket, 201);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to create ticket");
    }
    return errorResponse(res, "Failed to create ticket", error.message, 400);
  }
};

const initiatePayment = async (req, res) => {
  try {
    const { ticket_id } = req.body;
    const userId = req.user.id; // Get user ID from authenticated user

    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Validate ticket_id
    if (!ticket_id) {
      return validationErrorResponse(res, ["Ticket ID is required"]);
    }

    const paymentInfo = await ticketService.initiatePayment(ticket_id, userId);

    return successResponse(res, "Payment initiated successfully", paymentInfo);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to initiate payment");
    }
    return errorResponse(res, "Failed to initiate payment", error.message, 400);
  }
};

const checkInTicket = async (req, res) => {
  try {
    const { barcode } = req.body;

    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Validate barcode
    if (!barcode) {
      return validationErrorResponse(res, ["Barcode is required"]);
    }

    const result = await ticketService.checkInTicket(barcode);

    return successResponse(res, result.message, {
      ticket_id: result.ticket_id,
    });
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to check in ticket");
    }
    return errorResponse(res, "Failed to check in ticket", error.message, 400);
  }
};

module.exports = {
  getAllTickets,
  getTicketById,
  checkTicketByPaymentId, // Add the new function
  createTicket,
  initiatePayment,
  checkInTicket,
  updateTicketStatus, // Add the new function
};
