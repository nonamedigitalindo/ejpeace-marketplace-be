const TicketRepository = require("../models/ticket.repository");
const EventRepository = require("../models/event.repository");
const UserRepository = require("../models/user.repository");
const OrderAddressRepository = require("../models/orderAddress.repository");
const Ticket = require("../models/Ticket.model");
const BarcodeService = require("./barcode.service"); // Updated to BarcodeService
const PaymentService = require("./payment.service");
const NotificationService = require("./notification.service"); // Added notification service

const { getBaseURL } = require("../utils/url.util");

// Function to send ticket confirmation email with QR code
const sendTicketConfirmation = async (ticketData) => {
  try {
    console.log("📧 Preparing to send ticket confirmation email...");
    console.log("Ticket data:", JSON.stringify(ticketData, null, 2));

    // Get event details
    const event = await EventRepository.findById(ticketData.event_id);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get user details
    const user = await UserRepository.findById(ticketData.user_id);
    if (!user) {
      throw new Error("User not found");
    }

    // Format ticket price
    const formattedPrice = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(ticketData.price);

    // Format event dates
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const formattedStartDate = startDate.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedEndDate = endDate.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Create email subject
    const subject = `Konfirmasi Pembelian Tiket - ${event.title}`;

    // Create email content with QR code
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Konfirmasi Pembelian Tiket</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2c3e50;">🎉 Konfirmasi Pembelian Tiket</h2>
              
              <p>Halo ${ticketData.attendee_name},</p>
              
              <p>Terima kasih telah membeli tiket untuk acara berikut:</p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #2c3e50;">${event.title}</h3>
                  <p><strong>Deskripsi:</strong> ${event.description}</p>
                  <p><strong>Lokasi:</strong> ${event.location}</p>
                  <p><strong>Tanggal Mulai:</strong> ${formattedStartDate}</p>
                  <p><strong>Tanggal Selesai:</strong> ${formattedEndDate}</p>
                  <p><strong>Harga Tiket:</strong> ${formattedPrice}</p>
              </div>
              
              <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #2c3e50;">🎫 Detail Tiket</h3>
                  <p><strong>ID Tiket:</strong> ${ticketData.id}</p>
                  <p><strong>Nama Peserta:</strong> ${
                    ticketData.attendee_name
                  }</p>
                  <p><strong>Email Peserta:</strong> ${
                    ticketData.attendee_email
                  }</p>
                  ${
                    ticketData.attendee_phone
                      ? `<p><strong>No. HP:</strong> ${ticketData.attendee_phone}</p>`
                      : ""
                  }
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                  <h3 style="color: #2c3e50;">📱 QR Code untuk Check-in</h3>
                  <p>Gunakan QR Code berikut untuk check-in saat acara:</p>
                  ${
                    ticketData.qr_code_image
                      ? `<img src="${ticketData.qr_code_image}" 
                         alt="QR Code Tiket" 
                         style="max-width: 200px; height: auto; border: 1px solid #ddd; padding: 10px;">`
                      : "<p>QR Code tidak tersedia</p>"
                  }
                  <p><small>Tunjukkan QR Code ini saat check-in di acara</small></p>
              </div>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffeaa7; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #856404;">ℹ️ Informasi Penting</h4>
                  <ul style="padding-left: 20px;">
                      <li>Simpan email ini sebagai bukti pembelian tiket</li>
                      <li>Bawa QR Code saat check-in di lokasi acara</li>
                      <li>Tunjukkan QR Code kepada petugas keamanan</li>
                      <li>Jangan bagikan QR Code kepada orang lain</li>
                  </ul>
              </div>
              
              <p>Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.</p>
              
              <p>Salam,<br>Tim Peacetifal</p>
          </div>
      </body>
      </html>
    `;

    console.log("📧 Sending email to:", ticketData.attendee_email);
    console.log("📧 Email subject:", subject);
    console.log("📧 QR Code image present:", !!ticketData.qr_code_image);

    // Send email using NotificationService
    const emailResult = await NotificationService.sendEmail(
      ticketData.attendee_email,
      subject,
      htmlContent
    );

    if (emailResult.success) {
      console.log(
        `📧 Email konfirmasi tiket terkirim ke: ${ticketData.attendee_email}`
      );
    } else {
      console.error(
        `❌ Gagal mengirim email konfirmasi tiket: ${emailResult.error}`
      );
    }

    return emailResult;
  } catch (error) {
    console.error("Error sending ticket confirmation:", error);
    return { success: false, error: error.message };
  }
};

const getAllTicketsByUser = async (userId) => {
  try {
    const tickets = await TicketRepository.findByUserId(userId);
    return tickets.map((ticket) => ticket.toJSON());
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve tickets: " + error.message);
  }
};

const getTicketById = async (ticketId, userId) => {
  try {
    const ticket = await TicketRepository.findById(ticketId);
    if (!ticket) {
      return null;
    }

    // Check if ticket belongs to user
    if (ticket.user_id !== userId) {
      throw new Error("Unauthorized access to ticket");
    }

    return ticket.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve ticket: " + error.message);
  }
};

// New function to manually update ticket status (for debugging)
const updateTicketStatus = async (ticketId, newStatus) => {
  try {
    console.log("Manually updating ticket status:", ticketId, "to", newStatus);

    const updated = await TicketRepository.update(ticketId, {
      status: newStatus,
    });

    if (!updated) {
      throw new Error("Failed to update ticket status");
    }

    const updatedTicket = await TicketRepository.findById(ticketId);
    return updatedTicket.toJSON();
  } catch (error) {
    console.error("Failed to manually update ticket status:", error);
    throw new Error("Failed to update ticket status: " + error.message);
  }
};

const createTicket = async (ticketData, shippingAddress) => {
  try {
    // Validate that ticketData exists
    if (!ticketData) {
      throw new Error("Ticket data is required");
    }

    // Validate required fields
    if (!ticketData.user_id) {
      throw new Error("User ID is required");
    }

    if (!ticketData.event_id) {
      throw new Error("Event ID is required");
    }

    if (!ticketData.attendee_name) {
      throw new Error("Attendee name is required");
    }

    if (!ticketData.attendee_email) {
      throw new Error("Attendee email is required");
    }

    // Validate shipping address (OPTIONAL)
    let hasValidAddress = false;
    if (shippingAddress && typeof shippingAddress === "object") {
      const { full_name, phone, address_line1, city, postal_code } =
        shippingAddress;

      // Check if all required fields are present
      if (full_name && phone && address_line1 && city && postal_code) {
        hasValidAddress = true;
      }
    }

    // Check if event exists
    const event = await EventRepository.findById(ticketData.event_id);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if user exists
    const user = await UserRepository.findById(ticketData.user_id);
    if (!user) {
      throw new Error("User not found");
    }

    // Calculate ticket price from event (with discount if applicable)
    const ticketPrice = event.getDiscountedPrice();

    // Create ticket object without QR code initially
    const ticket = new Ticket({
      user_id: ticketData.user_id,
      event_id: ticketData.event_id,
      ticket_type: ticketData.ticket_type || "general",
      price: ticketPrice, // Use calculated price
      status: "pending",
      barcode: null, // No QR code yet
      attendee_name: ticketData.attendee_name,
      attendee_email: ticketData.attendee_email,
      attendee_phone: ticketData.attendee_phone,
    });

    // Validate ticket data
    const validationErrors = ticket.validate();
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }

    // Save ticket to database
    const ticketId = await TicketRepository.create({
      user_id: ticket.user_id,
      event_id: ticket.event_id,
      ticket_type: ticket.ticket_type,
      price: ticket.price,
      status: ticket.status,
      barcode: ticket.barcode, // null initially
      attendee_name: ticket.attendee_name,
      attendee_email: ticket.attendee_email,
      attendee_phone: ticket.attendee_phone,
    });

    // Create order address ONLY if valid address is provided
    if (hasValidAddress) {
      const { full_name, phone, address_line1, city, postal_code } =
        shippingAddress;
      const addressData = {
        ticket_id: ticketId,
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
    }

    // Return ticket data without QR code
    return {
      id: ticketId,
      user_id: ticket.user_id,
      event_id: ticket.event_id,
      ticket_type: ticket.ticket_type,
      price: ticket.price,
      status: ticket.status,
      barcode: null, // No QR code yet
      qr_code_image: null, // No QR code image yet
      attendee_name: ticket.attendee_name,
      attendee_email: ticket.attendee_email,
      attendee_phone: ticket.attendee_phone,
      created_at: ticket.created_at,
    };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to create ticket: " + error.message);
  }
};

// Add this function to update ticket price
const updateTicketPrice = async (ticketId, newPrice) => {
  try {
    // Update ticket price
    const updated = await TicketRepository.update(ticketId, {
      price: newPrice,
    });

    if (!updated) {
      throw new Error("Failed to update ticket price");
    }

    // Return updated ticket data
    const updatedTicket = await TicketRepository.findById(ticketId);
    return updatedTicket.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to update ticket price: " + error.message);
  }
};

const initiatePayment = async (ticketId, userId) => {
  try {
    // Get ticket details
    const ticket = await TicketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Verify ticket belongs to user
    if (ticket.user_id !== userId) {
      throw new Error("Unauthorized access to ticket");
    }

    // Create external ID for Xendit
    const externalId = `ticket_${ticketId}_${Date.now()}`;

    // Create invoice with Xendit
    const invoiceData = {
      externalId: externalId,
      amount: ticket.price,
      payerEmail: ticket.attendee_email,
      description: `Ticket purchase for event ID: ${ticket.event_id}`,
      successRedirectURL: `${getBaseURL()}/payment/success`,
      failureRedirectURL: `${getBaseURL()}/payment/failure`,
    };

    const invoice = await PaymentService.createInvoice(invoiceData);

    // Update ticket with payment ID
    const updated = await TicketRepository.update(ticketId, {
      payment_id: invoice.id,
      status: "pending_payment",
    });

    if (!updated) {
      throw new Error("Failed to update ticket with payment information");
    }

    // Return payment information
    return {
      ticket_id: ticketId,
      payment_id: invoice.id,
      invoice_url: invoice.invoiceUrl || null,
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
    console.log("💳 Processing payment callback...");
    console.log("Callback data:", JSON.stringify(callbackData, null, 2));

    // Process Xendit callback
    const paymentResult = await PaymentService.handlePaymentCallback(
      callbackData
    );

    console.log("💳 Payment result:", JSON.stringify(paymentResult, null, 2));

    // Find ticket by payment ID
    const ticket = await TicketRepository.findByPaymentId(
      paymentResult.invoiceId
    );
    if (!ticket) {
      throw new Error("Ticket not found for this payment");
    }

    // Update ticket status based on payment result
    let newStatus = "pending";
    let barcodeData = null;

    if (paymentResult.status === "PAID") {
      newStatus = "paid";
      console.log("💳 Payment PAID - Creating barcode and sending email...");

      // Create barcode record only after successful payment
      const barcode = await BarcodeService.createBarcode(
        ticket.id,
        ticket.user_id,
        ticket.event_id
      );
      barcodeData = barcode;

      console.log("🎫 Barcode created:", JSON.stringify(barcode, null, 2));

      // Send email/SMS with QR Code upon successful payment
      console.log("📧 Sending ticket confirmation email...");
      await sendTicketConfirmation({
        ...ticket,
        barcode: barcode.barcode_data,
        qr_code_image: barcode.qr_code_image,
      });
    } else if (paymentResult.status === "EXPIRED") {
      newStatus = "cancelled";
      console.log("💳 Payment EXPIRED - Updating ticket status to cancelled");
    } else if (paymentResult.status === "SETTLED") {
      // Treat SETTLED as PAID
      newStatus = "paid";
      console.log("💳 Payment SETTLED - Creating barcode and sending email...");

      // Create barcode record only after successful payment
      const barcode = await BarcodeService.createBarcode(
        ticket.id,
        ticket.user_id,
        ticket.event_id
      );
      barcodeData = barcode;

      console.log("🎫 Barcode created:", JSON.stringify(barcode, null, 2));

      // Send email/SMS with QR Code upon successful payment
      console.log("📧 Sending ticket confirmation email...");
      await sendTicketConfirmation({
        ...ticket,
        barcode: barcode.barcode_data,
        qr_code_image: barcode.qr_code_image,
      });
    }

    const updated = await TicketRepository.update(ticket.id, {
      status: newStatus,
    });

    if (!updated) {
      throw new Error("Failed to update ticket status");
    }

    return {
      ticket_id: ticket.id,
      status: newStatus,
      message: `Ticket status updated to ${newStatus}`,
      // Include barcode data only for paid tickets
      ...(paymentResult.status === "PAID" ||
        (paymentResult.status === "SETTLED" && {
          barcode: barcodeData,
        })),
    };
  } catch (error) {
    console.error("Failed to handle payment callback:", error);
    throw new Error("Failed to handle payment callback: " + error.message);
  }
};

// New function to handle Xendit invoice callback
const handleInvoiceCallback = async (callbackData) => {
  try {
    console.log("🧾 Processing invoice callback...");
    console.log(
      "Invoice callback data:",
      JSON.stringify(callbackData, null, 2)
    );

    // Validate callback data
    if (!callbackData || typeof callbackData !== "object") {
      throw new Error("Invalid callback data");
    }

    // Log the incoming callback data for debugging
    console.log(
      "Xendit Ticket Invoice Callback Received:",
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
        ticket_id: "test-ticket-id",
        status: "paid",
        message: "Test payload processed successfully",
        invoice_id: id,
        external_id: external_id,
      };
    }

    let ticketId = null;
    let ticket = null;

    // Try multiple approaches to find the ticket
    console.log("Attempting to find ticket using multiple approaches...");

    // Approach 1: Try to find by payment_id directly
    console.log("Approach 1: Finding ticket by payment_id:", id);
    ticket = await TicketRepository.findByPaymentId(id);
    if (ticket) {
      ticketId = ticket.id;
      console.log("Found ticket by payment_id:", ticketId);
      console.log("Ticket details:", JSON.stringify(ticket, null, 2));
    }

    // Approach 2: If not found, try to parse external_id for ticket information
    if (!ticketId) {
      console.log(
        "Approach 2: Parsing external_id for ticket information:",
        external_id
      );

      // Format 1: ticket_{ticketId}_{timestamp}
      const ticketIdMatch1 = external_id.match(/^ticket_(\d+)_\d+$/);

      // Format 2: ticket_{ticketId} (simpler format)
      const ticketIdMatch2 = external_id.match(/^ticket_(\d+)$/);

      // Format 3: invoice_{invoiceId} (Xendit's default format)
      const invoiceIdMatch = external_id.match(/^invoice_(.+)$/);

      if (ticketIdMatch1) {
        ticketId = ticketIdMatch1[1];
        console.log("Found ticket ID from format 1:", ticketId);
      } else if (ticketIdMatch2) {
        ticketId = ticketIdMatch2[1];
        console.log("Found ticket ID from format 2:", ticketId);
      } else if (invoiceIdMatch) {
        // If it's in Xendit's invoice format, check if it contains ticket info
        const invoiceId = invoiceIdMatch[1];
        console.log("Found invoice ID:", invoiceId);

        // Check if the invoice ID contains ticket information
        const ticketInInvoiceMatch = invoiceId.match(/ticket_(\d+)/);
        if (ticketInInvoiceMatch) {
          ticketId = ticketInInvoiceMatch[1];
          console.log("Found ticket ID from invoice ID:", ticketId);
        }
      }
    }

    // Approach 3: If we have a ticketId, try to get the ticket
    if (ticketId && !ticket) {
      console.log("Approach 3: Getting ticket by ID:", ticketId);
      ticket = await TicketRepository.findById(ticketId);
      if (!ticket) {
        console.log("Ticket not found with ID:", ticketId);
      } else {
        console.log("Found ticket by ID:", JSON.stringify(ticket, null, 2));
      }
    }

    // If we still haven't found the ticket, throw an error with detailed information
    if (!ticket) {
      // Get all tickets for debugging
      const allTickets = await TicketRepository.findAll();
      console.log(
        "All tickets in database:",
        JSON.stringify(
          allTickets.map((t) => ({
            id: t.id,
            payment_id: t.payment_id,
            status: t.status,
          })),
          null,
          2
        )
      );

      throw new Error(
        `Ticket not found for this invoice. ` +
          `External ID: ${external_id}, ` +
          `Payment ID: ${id}, ` +
          `Parsed Ticket ID: ${ticketId || "null"}. ` +
          `Check if the ticket was created and the payment was initiated.`
      );
    }

    console.log("Found ticket:", JSON.stringify(ticket, null, 2));
    console.log("Callback status:", status);
    console.log("Ticket current status:", ticket.status);
    console.log("Ticket payment_id:", ticket.payment_id);

    // Update ticket status based on invoice status
    let newStatus = "pending";
    let barcodeData = null;

    if (status === "PAID") {
      newStatus = "paid";
      console.log("🧾 Invoice PAID - Creating barcode and sending email...");
    } else if (status === "EXPIRED") {
      newStatus = "cancelled";
      console.log("🧾 Invoice EXPIRED - Updating ticket status to cancelled");
    } else if (status === "SETTLED") {
      // Treat SETTLED as PAID
      newStatus = "paid";
      console.log("🧾 Invoice SETTLED - Creating barcode and sending email...");
    } else {
      console.log("🧾 Invoice status not recognized:", status);
    }

    console.log("Updating ticket status from", ticket.status, "to", newStatus);

    const updated = await TicketRepository.update(ticket.id, {
      status: newStatus,
    });

    console.log("Ticket update result:", updated);

    if (!updated) {
      throw new Error("Failed to update ticket status");
    }

    // Only create barcode and send email if payment was successful
    if (status === "PAID" || status === "SETTLED") {
      console.log("Creating barcode and sending email...");

      // Create barcode record only after successful payment
      const barcode = await BarcodeService.createBarcode(
        ticket.id,
        ticket.user_id,
        ticket.event_id
      );
      barcodeData = barcode;

      console.log("🎫 Barcode created:", JSON.stringify(barcode, null, 2));

      // Send email/SMS with QR Code upon successful payment
      console.log("📧 Sending ticket confirmation email...");
      await sendTicketConfirmation({
        ...ticket,
        barcode: barcode.barcode_data,
        qr_code_image: barcode.qr_code_image,
      });
    }

    // Get updated ticket to return current status
    const updatedTicket = await TicketRepository.findById(ticket.id);
    console.log("Final ticket status:", updatedTicket.status);

    return {
      ticket_id: ticket.id,
      status: updatedTicket.status,
      message: `Ticket status updated to ${updatedTicket.status}`,
      // Include barcode data only for paid tickets
      ...(status === "PAID" ||
        (status === "SETTLED" && {
          barcode: barcodeData,
        })),
    };
  } catch (error) {
    console.error("Failed to handle invoice callback:", error);
    throw new Error("Failed to handle invoice callback: " + error.message);
  }
};

const checkInTicket = async (barcodeData) => {
  try {
    console.log("Processing check-in for barcode:", barcodeData);

    let ticketToCheckIn = null;
    let validBarcode = null;

    // CHECK: Is this a Purchase QR URL?
    // Format: ...?purchaseId=123
    let purchaseId = null;

    if (
      typeof barcodeData === "string" &&
      (barcodeData.includes("purchaseId=") || barcodeData.includes("purchase_"))
    ) {
      console.log("Resembles a Purchase QR/URL, attempting to parse...");

      // Try to extract ID from URL param
      const urlMatch = barcodeData.match(/purchaseId=(\d+)/);
      if (urlMatch) {
        purchaseId = urlMatch[1];
      } else {
        // Try to extract from string format "purchase_123"
        const strMatch = barcodeData.match(/purchase_(\d+)/);
        if (strMatch) {
          purchaseId = strMatch[1];
        }
      }
    }

    if (purchaseId) {
      console.log(
        `Detected Purchase ID: ${purchaseId}. Finding available tickets...`
      );

      // 1. Get Purchase to find Payment ID (Invoice ID)
      const PurchaseRepository = require("../models/purchase.repository");
      const purchase = await PurchaseRepository.findById(purchaseId);

      if (!purchase) {
        throw new Error("Purchase not found");
      }

      if (purchase.status !== "paid") {
        throw new Error("Purchase is not paid");
      }

      // 2. Get All Tickets for this Payment ID
      // We use payment_id because that's how tickets are linked to purchases/invoices
      if (!purchase.payment_id) {
        throw new Error("Purchase has no payment information");
      }

      const tickets = await TicketRepository.findAllByPaymentId(
        purchase.payment_id
      );

      if (!tickets || tickets.length === 0) {
        throw new Error("No tickets found for this purchase");
      }

      console.log(`Found ${tickets.length} tickets for purchase ${purchaseId}`);

      // 3. Find first ticket that is PAID and NOT checked_in
      // We also check if it has a barcode, though we can check in even without one if we validate the purchase
      ticketToCheckIn = tickets.find((t) => t.status === "paid");

      if (!ticketToCheckIn) {
        // Check if all are already checked in
        const allCheckedIn = tickets.every((t) => t.status === "checked_in");
        if (allCheckedIn) {
          throw new Error(
            "All tickets in this purchase are already checked in"
          );
        }
        throw new Error("No valid tickets available for check-in");
      }

      console.log(`Selected ticket ${ticketToCheckIn.id} for check-in`);

      // 4. Find the active barcode for this ticket to deactivate it
      const barcodeDataObj = await BarcodeService.getBarcodeByTicketId(
        ticketToCheckIn.id
      );
      if (barcodeDataObj && barcodeDataObj.status === "active") {
        validBarcode = barcodeDataObj;
      }
    } else {
      // STANDARD FLOW: Validate barcode text directly
      const validation = await BarcodeService.validateForCheckin(barcodeData);
      if (!validation.valid) {
        throw new Error(validation.reason);
      }
      validBarcode = validation.barcode;

      // Find ticket by ticket ID from barcode
      ticketToCheckIn = await TicketRepository.findById(validBarcode.ticket_id);
    }

    if (!ticketToCheckIn) {
      throw new Error("Ticket not found");
    }

    // Double check status (redundant for Purchase flow but good for safety)
    if (ticketToCheckIn.status === "checked_in") {
      throw new Error("Ticket is already checked in");
    }

    if (ticketToCheckIn.status !== "paid") {
      throw new Error(
        "Ticket is not valid for check-in (Status: " +
          ticketToCheckIn.status +
          ")"
      );
    }

    // Update ticket status to checked_in
    const ticketUpdated = await TicketRepository.update(ticketToCheckIn.id, {
      status: "checked_in",
    });

    if (!ticketUpdated) {
      throw new Error("Failed to check in ticket");
    }

    // Deactivate the barcode to prevent reuse (if a barcode record exists)
    if (validBarcode) {
      const barcodeDeactivated = await BarcodeService.deactivateBarcode(
        validBarcode.id
      );
      if (!barcodeDeactivated) {
        console.warn(
          `Failed to deactivate barcode ${validBarcode.id} for ticket ${ticketToCheckIn.id}`
        );
        // Don't throw here, as the ticket is already checked in
      }
    } else {
      // If we checked in via Purchase ID and no barcode existed/was found, that's okay,
      // effectively "consuming" one ticket spot.
      // Ideally we should find the barcode associated with this specific ticket and deactivate it.
      // We tried to find validBarcode above. If null, maybe it wasn't generated or already inactive.

      // Try to deactivate ANY active barcode for this ticket just in case
      try {
        const barcode = await BarcodeService.getBarcodeByTicketId(
          ticketToCheckIn.id
        );
        if (barcode && barcode.status === "active") {
          await BarcodeService.deactivateBarcode(barcode.id);
        }
      } catch (e) {
        console.warn("Error ensuring barcode deactivation:", e);
      }
    }

    return {
      success: true,
      ticket_id: ticketToCheckIn.id,
      message: "Ticket checked in successfully",
    };
  } catch (error) {
    throw new Error("Failed to check in ticket: " + error.message);
  }
};

module.exports = {
  getAllTicketsByUser,
  getTicketById,
  createTicket,
  updateTicketPrice, // Export the new function
  initiatePayment,
  handlePaymentCallback,
  handleInvoiceCallback, // Add the new function
  checkInTicket,
  sendTicketConfirmation, // Export the new function
  updateTicketStatus, // Add the new function for debugging
};
