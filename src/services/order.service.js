const PurchaseRepository = require("../models/purchase.repository");
const TicketRepository = require("../models/ticket.repository");
const EventRepository = require("../models/event.repository");
const ProductRepository = require("../models/product.repository");
const db = require("../config/db.config");
const XLSX = require("xlsx");
const ExcelJS = require('exceljs');

/**
 * Consolidate duplicate orders for the same user, product, and status
 * This merges multiple orders into a single order with combined quantity and amount
 */
const consolidateOrders = (orders) => {
  const consolidatedMap = new Map();

  for (const order of orders) {
    // Only consolidate pending product orders (not paid/completed ones)
    if (order.type !== "product" || order.status !== "pending") {
      // For non-pending orders or tickets, use unique key to keep them separate
      const uniqueKey = `unique_${order.id}`;
      consolidatedMap.set(uniqueKey, order);
      continue;
    }

    // Get product_id from details
    const productId = order.details?.items?.[0]?.product_id;
    if (!productId) {
      // No product_id, keep as separate order
      const uniqueKey = `unique_${order.id}`;
      consolidatedMap.set(uniqueKey, order);
      continue;
    }

    // Create a key for consolidation: user_id + product_id + status
    const key = `${order.user_id}_${productId}_${order.status}`;

    if (consolidatedMap.has(key)) {
      // Merge with existing order
      const existing = consolidatedMap.get(key);

      // Add up the amounts
      const existingAmount = parseFloat(existing.amount) || 0;
      const newAmount = parseFloat(order.amount) || 0;
      existing.amount = (existingAmount + newAmount).toFixed(2);

      // Merge the IDs (keep oldest, but track all merged IDs)
      if (!existing.merged_order_ids) {
        existing.merged_order_ids = [existing.id];
      }
      existing.merged_order_ids.push(order.id);

      // Update quantity in details.items
      if (existing.details?.items?.[0] && order.details?.items?.[0]) {
        const existingQty = existing.details.items[0].quantity || 0;
        const newQty = order.details.items[0].quantity || 0;
        existing.details.items[0].quantity = existingQty + newQty;
        existing.details.items[0].total_price =
          (parseFloat(existing.details.items[0].total_price) || 0) +
          (parseFloat(order.details.items[0].total_price) || 0);
      }

      // Update the product_name with new quantity
      if (existing.details?.items?.[0]) {
        const item = existing.details.items[0];
        existing.product_name = `${item.product_name} (x${item.quantity})`;
      }

      // Update total_amount in details
      existing.details.total_amount = existing.amount;

      // Use the newest created_at for better visibility, but keep oldest ID
      if (new Date(order.created_at) > new Date(existing.created_at)) {
        existing.updated_at = order.created_at;
      }
    } else {
      // First occurrence, add to map
      consolidatedMap.set(key, { ...order });
    }
  }

  return Array.from(consolidatedMap.values());
};


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
        const details = await getPurchaseDetails(purchase.id);

        // Extract product names from details.items
        let productName = '-';
        if (details?.items && details.items.length > 0) {
          productName = details.items.map(item =>
            `${item.product_name} (x${item.quantity})`
          ).join(', ');
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
          product_name: productName,
          details: details,
        };
      })
    );

    // Format tickets as orders
    const ticketOrders = await Promise.all(
      tickets.map(async (ticket) => {
        const event = await EventRepository.findById(ticket.event_id);
        const eventName = event ? event.title : "Unknown Event";

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
          product_name: eventName,
          details: {
            ticket_id: ticket.id,
            event_name: eventName,
            event_id: ticket.event_id,
            ticket_type: ticket.ticket_type,
            attendee_name: ticket.attendee_name,
            attendee_email: ticket.attendee_email,
          },
        };
      })
    );

    // Combine and sort by creation date (newest first)
    let allOrders = [...purchaseOrders, ...ticketOrders];
    allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Consolidate duplicate pending orders (same user, same product, pending status)
    allOrders = consolidateOrders(allOrders);

    // Re-sort after consolidation
    allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // START: Batch fetch user info
    const userIds = [...new Set(allOrders.map(o => o.user_id).filter(id => id))];

    if (userIds.length > 0) {
      const UserRepository = require("../models/user.repository");
      const users = await UserRepository.findByIds(userIds);
      const userMap = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

      allOrders.forEach(order => {
        if (order.user_id && userMap[order.user_id]) {
          order.username = userMap[order.user_id].username;
          order.user_email = userMap[order.user_id].email;
        } else {
          order.username = "Unknown";
          order.user_email = "No email";
        }
      });
    }
    // END: Batch fetch user info

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
    let userOrders = [...purchaseOrders, ...ticketOrders];
    userOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Consolidate duplicate pending orders (same user, same product, pending status)
    userOrders = consolidateOrders(userOrders);

    // Re-sort after consolidation
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

    let [cartItems] = await db.execute(cartItemsQuery, [purchaseId]);

    // Fallback: If no cart items but purchase has product_id (direct purchase/Buy Now flow)
    if (cartItems.length === 0 && purchase.product_id) {
      const product = await ProductRepository.findById(purchase.product_id);
      if (product) {
        // CRITICAL: Use STORED quantity from purchase record, NOT calculated from total_amount
        // This ensures voucher discount NEVER affects displayed quantity
        // Using purchase.quantity as the single source of truth
        let quantity = purchase.quantity;

        // For display purposes, fallback to 1 if not stored (legacy data)
        // This is safer than calculating from total_amount which includes discounts
        if (!quantity || quantity <= 0) {
          console.warn(`[getPurchaseDetails] Warning: No stored quantity for purchase ${purchaseId}, defaulting to 1`);
          quantity = 1;
        }

        const productPrice = parseFloat(product.price);
        const totalAmount = parseFloat(purchase.total_amount);

        cartItems = [{
          product_id: purchase.product_id,
          product_name: product.name,
          product_description: product.description,
          quantity: quantity,
          unit_price: productPrice,
          total_price: totalAmount,
        }];
      }
    }

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
    // Note: order_addresses might not have product_id in the schema, 
    // so we only fetch address fields and rely on cart items for product details
    const orderAddressQuery = `
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
      order_address_products: orderAddressRows, // Kept property name for compatibility but now it only contains address info
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

/**
 * Get all orders with optional date filtering
 * @param {string} startDate - Optional start date (YYYY-MM-DD)
 * @param {string} endDate - Optional end date (YYYY-MM-DD)
 */
const getAllOrdersFiltered = async (startDate = null, endDate = null) => {
  try {
    // Get all orders first
    const allOrders = await getAllOrders();

    // If no date filters, return all orders
    if (!startDate && !endDate) {
      return allOrders;
    }

    // Filter by date range
    return allOrders.filter((order) => {
      const orderDate = new Date(order.created_at);

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end date
        return orderDate >= start && orderDate <= end;
      } else if (startDate) {
        const start = new Date(startDate);
        return orderDate >= start;
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return orderDate <= end;
      }
      return true;
    });
  } catch (error) {
    throw new Error("Failed to filter orders: " + error.message);
  }
};

/**
 * Generate XLSX buffer from orders data
 * @param {Array} orders - Array of order objects
 * @returns {Buffer} - XLSX file buffer
 */

const generateOrdersXLSX = async (orders) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Orders');

  // Define columns with proper formatting
  worksheet.columns = [
    { header: 'Order ID', key: 'orderId', width: 12 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'User ID', key: 'userId', width: 10 },
    { header: 'Amount (Rp)', key: 'amount', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Payment ID', key: 'paymentId', width: 25 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Updated At', key: 'updatedAt', width: 20 },
    { header: 'Completed At', key: 'completedAt', width: 20 },
    { header: 'Customer Name', key: 'customerName', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'Items', key: 'items', width: 50 },
    { header: 'Attendee Email', key: 'attendeeEmail', width: 25 },
    { header: 'Ticket Type', key: 'ticketType', width: 15 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

  // Add data
  orders.forEach((order) => {
    const rowData = {
      orderId: order.id,
      type: order.type === "product" ? "Product" : "Ticket",
      userId: order.user_id,
      amount: parseFloat(order.amount) || 0,
      status: order.status,
      paymentId: order.payment_id || "-",
      createdAt: order.created_at ? new Date(order.created_at).toLocaleString("id-ID") : "-",
      updatedAt: order.updated_at ? new Date(order.updated_at).toLocaleString("id-ID") : "-",
      completedAt: order.completed_at ? new Date(order.completed_at).toLocaleString("id-ID") : "-",
    };

    if (order.type === "product" && order.details) {
      rowData.customerName = order.details.address?.full_name || "-";
      rowData.phone = order.details.address?.phone || "-";
      rowData.address = order.details.address ?
        `${order.details.address.address_line1 || ""}, ${order.details.address.city || ""}, ${order.details.address.postal_code || ""}` : "-";
      rowData.items = order.details.items?.map(item => `${item.product_name} (x${item.quantity})`).join("; ") || "-";
    } else if (order.type === "ticket" && order.details) {
      rowData.customerName = order.details.attendee_name || "-";
      rowData.phone = "-";
      rowData.address = "-";
      rowData.items = order.details.event_name || "-";
      rowData.attendeeEmail = order.details.attendee_email || "-";
      rowData.ticketType = order.details.ticket_type || "-";
    }

    worksheet.addRow(rowData);
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = {
  getAllOrders,
  getUserOrders,
  getOrderById,
  getProductDataByOrderAddress,
  getAllOrdersFiltered,
  generateOrdersXLSX,
};

