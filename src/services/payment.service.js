const { Xendit } = require("xendit-node");
const XenditUtil = require("../utils/xendit.util");

// Initialize Xendit client correctly
// Only initialize if XENDIT_SECRET_KEY is available and not a placeholder
let xenditClient = null;
let xenditConfigured = false;

// Check if Xendit key is properly configured (not empty and not a placeholder)
if (
  process.env.XENDIT_SECRET_KEY &&
  process.env.XENDIT_SECRET_KEY.trim() !== "" &&
  process.env.XENDIT_SECRET_KEY !== "your_development_secret_key_here" &&
  !process.env.XENDIT_SECRET_KEY.includes(
    "xnd_public_development_hqRSvGzV3n8mS9SQZ_kiojcZOQOdLlYeE6isDU9c75IX539dTmwPgpRNU2QE7QE"
  )
) {
  try {
    xenditClient = new Xendit({ secretKey: process.env.XENDIT_SECRET_KEY });
    xenditConfigured = true;
    console.log("Xendit client initialized successfully");
  } catch (error) {
    console.warn("Failed to initialize Xendit client:", error.message);
    xenditClient = null;
    xenditConfigured = false;
  }
} else {
  console.warn(
    "XENDIT_SECRET_KEY not found or is placeholder in environment variables. Xendit integration will be disabled."
  );
}

class PaymentService {
  // Create invoice for payment using actual Xendit SDK
  static async createInvoice(invoiceData) {
    // Validate invoice data
    if (!invoiceData || typeof invoiceData !== "object") {
      throw new Error("Invalid invoice data");
    }

    // Validate required fields
    if (!invoiceData.externalId || !invoiceData.amount) {
      throw new Error("External ID and amount are required");
    }

    // Validate amount is a positive number
    if (isNaN(invoiceData.amount) || invoiceData.amount <= 0) {
      throw new Error("Amount must be a positive number");
    }

    // Validate email format if provided
    if (invoiceData.payerEmail && !this.isValidEmail(invoiceData.payerEmail)) {
      throw new Error("Invalid email format");
    }

    // Return simulated response if Xendit is not configured
    if (!xenditConfigured || !xenditClient) {
      console.warn("Xendit not configured, returning simulated response");
      return {
        id: `simulated_invoice_${Date.now()}`,
        invoiceUrl: "http://localhost:3000/simulated-payment",
        status: "PENDING",
        externalId: invoiceData.externalId,
      };
    }

    try {
      const { Invoice } = xenditClient;
      // Fix the parameter structure for Xendit SDK
      const invoice = await Invoice.createInvoice({
        data: {
          externalId: invoiceData.externalId,
          amount: invoiceData.amount,
          payerEmail: invoiceData.payerEmail,
          description: invoiceData.description,
          successRedirectUrl: invoiceData.successRedirectURL,
          failureRedirectUrl: invoiceData.failureRedirectURL,
        },
      });

      // Log the invoice response for debugging
      console.log("Xendit invoice response:", JSON.stringify(invoice, null, 2));

      return {
        id: invoice.id,
        invoiceUrl:
          invoice.invoice_url ||
          invoice.invoiceUrl ||
          invoice.link ||
          invoice.url,
        status: invoice.status,
        externalId: invoice.external_id || invoice.externalId,
      };
    } catch (error) {
      console.error("Xendit invoice creation error:", error);
      // If we get an authentication error, fall back to simulated response
      if (error.status === 401) {
        console.warn(
          "Xendit authentication failed, returning simulated response"
        );
        return {
          id: `simulated_invoice_${Date.now()}`,
          invoiceUrl: "http://localhost:3000/simulated-payment",
          status: "PENDING",
          externalId: invoiceData.externalId,
        };
      }
      throw new Error("Failed to create payment invoice: " + error.message);
    }
  }

  // Get invoice status using actual Xendit SDK
  static async getInvoiceStatus(invoiceId) {
    // Validate invoice ID
    if (!invoiceId || typeof invoiceId !== "string") {
      throw new Error("Valid invoice ID is required");
    }

    // Return simulated response if Xendit is not configured
    if (!xenditConfigured || !xenditClient) {
      console.warn("Xendit not configured, returning simulated response");
      return {
        id: invoiceId,
        status: "PENDING",
        paidAt: null,
        externalId: `simulated_external_id_${Date.now()}`,
      };
    }

    try {
      const { Invoice } = xenditClient;
      // Fix the parameter structure for Xendit SDK
      const invoice = await Invoice.getInvoice({
        data: {
          invoiceId: invoiceId,
        },
      });

      return {
        id: invoice.id,
        status: invoice.status,
        paidAt: invoice.paid_at,
        externalId: invoice.external_id,
      };
    } catch (error) {
      console.error("Xendit invoice status error:", error);
      // If we get an authentication error, fall back to simulated response
      if (error.status === 401) {
        console.warn(
          "Xendit authentication failed, returning simulated response"
        );
        return {
          id: invoiceId,
          status: "PENDING",
          paidAt: null,
          externalId: `simulated_external_id_${Date.now()}`,
        };
      }
      throw new Error("Failed to get payment status: " + error.message);
    }
  }

  // Handle payment callback (process actual Xendit callback data)
  static async handlePaymentCallback(callbackData) {
    try {
      // Validate callback data structure
      if (!XenditUtil.validateCallbackData(callbackData)) {
        throw new Error("Invalid callback data structure");
      }

      // Sanitize callback data to prevent injection attacks
      const sanitizedData = XenditUtil.sanitizeCallbackData(callbackData);

      // Process the actual callback data from Xendit
      return {
        invoiceId: sanitizedData.id,
        status: sanitizedData.status,
        externalId: sanitizedData.external_id,
        paidAt: sanitizedData.paid_at,
      };
    } catch (error) {
      console.error("Payment callback processing error:", error);
      throw new Error("Failed to process payment callback: " + error.message);
    }
  }

  // Helper method to validate email format
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = PaymentService;
