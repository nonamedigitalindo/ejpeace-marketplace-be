const PurchaseRepository = require("../models/purchase.repository");
const TicketRepository = require("../models/ticket.repository");
const EventRepository = require("../models/event.repository");
const ProductRepository = require("../models/product.repository");
const db = require("../config/db.config");

/**
 * Get all orders (purchases and tickets) for admin view
 * Combines both product purchases and event tickets into a unified order list
 */
const getAllOrders = async () => {
  try {
    // Get all purchases
    const purchases = await PurchaseRepository.findAll();

    // Get all tickets
    const tickets = await TicketRepository.findAll();

    // Format purchases as orders
    const purchaseOrders = await Promise.all(
      purchases.map(async (purchase) => {
        // Get user info would be handled by the controller
        return {
          id: `P-${purchase.id}`,
          type: "product",
          user_id: purchase.user_id,
          amount: purchase.total_amount,
          status: purchase.status,
          payment_id: purchase.payment_id,
          created_at: purchase.created_at,
          updated_at: purchase.updated_at,
          completed_at: purchase.completed_at,
          details: await getPurchaseDetails(purchase.id),
        };
      })
    );

    // Format tickets as orders
    const ticketOrders = await Promise.all(
      tickets.map(async (ticket) => {
        // Get user info would be handled by the controller
        const event = await EventRepository.findById(ticket.event_id);
        return {
          id: `T-${ticket.id}`,
          type: "ticket",
          user_id: ticket.user_id,
          amount: ticket.price,
          status: ticket.status,
          payment_id: ticket.payment_id,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          completed_at: ticket.completed_at,
          details: {
            ticket_id: ticket.id,
            event_name: event ? event.title : "Unknown Event",
            event_id: ticket.event_id,
            ticket_type: ticket.ticket_type,
            attendee_name: ticket.attendee_name,
            attendee_email: ticket.attendee_email,
          },
        };
      })
    );

    // Combine and sort by creation date (newest first)
    const allOrders = [...purchaseOrders, ...ticketOrders];
    allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return allOrders;
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve orders: " + error.message);
  }
};

/**
 * Get orders for a specific user
 * Combines both product purchases and event tickets for that user
 */
const getUserOrders = async (userId) => {
  try {
    // Validate userId
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Get user's purchases
    const purchases = await PurchaseRepository.findByUserId(userId);

    // Get user's tickets
    const tickets = await TicketRepository.findByUserId(userId);

    // Format purchases as orders
    const purchaseOrders = await Promise.all(
      purchases.map(async (purchase) => {
        return {
          id: `P-${purchase.id}`,
          type: "product",
          user_id: purchase.user_id,
          amount: purchase.total_amount,
          status: purchase.status,
          payment_id: purchase.payment_id,
          created_at: purchase.created_at,
          updated_at: purchase.updated_at,
          completed_at: purchase.completed_at,
          details: await getPurchaseDetails(purchase.id),
        };
      })
    );

    // Format tickets as orders
    const ticketOrders = await Promise.all(
      tickets.map(async (ticket) => {
        const event = await EventRepository.findById(ticket.event_id);
        return {
          id: `T-${ticket.id}`,
          type: "ticket",
          user_id: ticket.user_id,
          amount: ticket.price,
          status: ticket.status,
          payment_id: ticket.payment_id,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          completed_at: ticket.completed_at,
          details: {
            ticket_id: ticket.id,
            event_name: event ? event.title : "Unknown Event",
            event_id: ticket.event_id,
            ticket_type: ticket.ticket_type,
            attendee_name: ticket.attendee_name,
            attendee_email: ticket.attendee_email,
          },
        };
      })
    );

    // Combine and sort by creation date (newest first)
    const userOrders = [...purchaseOrders, ...ticketOrders];
    userOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return userOrders;
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve user orders: " + error.message);
  }
};

/**
 * Get details for a specific purchase including cart items and address
 */
const getPurchaseDetails = async (purchaseId) => {
  try {
    // Get the purchase
    const purchase = await PurchaseRepository.findById(purchaseId);
    if (!purchase) {
      return null;
    }

    // Get cart items for this purchase
    const cartItemsQuery = `
      SELECT 
        c.product_id,
        p.name as product_name,
        p.description as product_description,
        c.quantity,
        p.price as unit_price,
        (c.quantity * p.price) as total_price
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.purchase_id = ?
    `;

    const [cartItems] = await db.execute(cartItemsQuery, [purchaseId]);

    // Get address for this purchase
    const addressQuery = `
      SELECT 
        full_name,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country
      FROM order_addresses
      WHERE purchase_id = ?
    `;

    const [addressRows] = await db.execute(addressQuery, [purchaseId]);
    const address = addressRows.length > 0 ? addressRows[0] : null;

    return {
      purchase_id: purchase.id,
      total_amount: purchase.total_amount,
      status: purchase.status,
      items: cartItems,
      address: address,
    };
  } catch (error) {
    console.error("Error getting purchase details:", error);
    return null;
  }
};

/**
 * Get order by ID
 * Supports both purchase and ticket orders
 */
const getOrderById = async (orderId, userId = null, isAdmin = false) => {
  try {
    // Validate order ID
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    // Parse the order ID to determine type
    const [type, id] = orderId.split("-");

    if (type === "P") {
      // Purchase order
      const purchase = await PurchaseRepository.findById(id);
      if (!purchase) {
        throw new Error("Order not found");
      }

      // Check permissions
      if (!isAdmin && purchase.user_id !== userId) {
        throw new Error("Unauthorized access to order");
      }

      return {
        id: `P-${purchase.id}`,
        type: "product",
        user_id: purchase.user_id,
        amount: purchase.total_amount,
        status: purchase.status,
        payment_id: purchase.payment_id,
        created_at: purchase.created_at,
        updated_at: purchase.updated_at,
        completed_at: purchase.completed_at,
        details: await getPurchaseDetails(purchase.id),
      };
    } else if (type === "T") {
      // Ticket order
      const ticket = await TicketRepository.findById(id);
      if (!ticket) {
        throw new Error("Order not found");
      }

      // Check permissions
      if (!isAdmin && ticket.user_id !== userId) {
        throw new Error("Unauthorized access to order");
      }

      const event = await EventRepository.findById(ticket.event_id);
      return {
        id: `T-${ticket.id}`,
        type: "ticket",
        user_id: ticket.user_id,
        amount: ticket.price,
        status: ticket.status,
        payment_id: ticket.payment_id,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        completed_at: ticket.completed_at,
        details: {
          ticket_id: ticket.id,
          event_name: event ? event.title : "Unknown Event",
          event_id: ticket.event_id,
          ticket_type: ticket.ticket_type,
          attendee_name: ticket.attendee_name,
          attendee_email: ticket.attendee_email,
        },
      };
    } else {
      throw new Error("Invalid order ID format");
    }
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve order: " + error.message);
  }
};

// Get product data related to order addresses
const getProductDataByOrderAddress = async (purchaseId, userId) => {
  try {
    // Validate purchaseId and userId
    if (!purchaseId) {
      throw new Error("Purchase ID is required");
    }

    if (!userId) {
      throw new Error("User ID is required");
    }

    // First, verify that the purchase belongs to the user
    const purchase = await PurchaseRepository.findById(purchaseId);
    if (!purchase) {
      throw new Error("Purchase not found");
    }

    if (purchase.user_id !== userId) {
      throw new Error("Unauthorized access to purchase");
    }

    // Get product data from order_addresses table
    const orderAddressQuery = `
      SELECT 
        oa.product_id,
        p.name as product_name,
        p.description as product_description,
        p.price as product_price,
        p.category as product_category,
        p.size as product_size,
        p.image as product_image
      FROM order_addresses oa
      JOIN products p ON oa.product_id = p.id
      WHERE oa.purchase_id = ? AND oa.product_id IS NOT NULL
    `;

    const [orderAddressRows] = await db.execute(orderAddressQuery, [
      purchaseId,
    ]);

    // Get cart items for this purchase (they should be linked after successful payment)
    const cartItemsQuery = `
      SELECT 
        c.product_id,
        p.name as product_name,
        p.description as product_description,
        p.price as product_price,
        p.category as product_category,
        p.size as product_size,
        p.image as product_image,
        c.quantity
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.purchase_id = ? AND p.deleted_at IS NULL
    `;

    const [cartItems] = await db.execute(cartItemsQuery, [purchaseId]);

    return {
      order_address_products: orderAddressRows,
      cart_items: cartItems,
      purchase_id: purchaseId,
    };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve product data: " + error.message);
  }
};

module.exports = {
  getAllOrders,
  getUserOrders,
  getOrderById,
  getProductDataByOrderAddress,
};
