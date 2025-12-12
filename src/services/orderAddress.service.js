const OrderAddressRepository = require("../models/orderAddress.repository");
const PurchaseRepository = require("../models/purchase.repository");
const db = require("../config/db.config");

// Get all order addresses
const getAllOrderAddresses = async () => {
  try {
    const orderAddresses = await OrderAddressRepository.findAll();
    return orderAddresses;
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve order addresses: " + error.message);
  }
};

// Get all order addresses for a specific user
const getUserOrderAddresses = async (userId) => {
  try {
    // Validate userId
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Get all purchases for the user
    const userPurchases = await PurchaseRepository.findByUserId(userId);

    // Extract purchase IDs
    const purchaseIds = userPurchases.map((purchase) => purchase.id);

    // If user has no purchases, return empty array
    if (purchaseIds.length === 0) {
      return [];
    }

    // Create placeholders for the IN clause
    const placeholders = purchaseIds.map(() => "?").join(",");

    // Get order addresses for all user's purchases with product and purchase data
    const query = `
      SELECT 
        oa.id, 
        oa.purchase_id, 
        oa.ticket_id, 
        oa.product_id, 
        oa.full_name, 
        oa.phone, 
        oa.address_line1, 
        oa.address_line2, 
        oa.city, 
        oa.state, 
        oa.postal_code, 
        oa.country, 
        oa.created_at, 
        oa.updated_at,
        p.name as product_name,
        p.description as product_description,
        p.price as product_price,
        p.category as product_category,
        p.size as product_size,
        p.quantity as product_quantity,
        p.image as product_image,
        pur.total_amount as purchase_total_amount,
        pur.status as purchase_status,
        pur.payment_id as purchase_payment_id,
        pur.user_id as purchase_user_id
      FROM order_addresses oa
      LEFT JOIN products p ON oa.product_id = p.id
      LEFT JOIN purchases pur ON oa.purchase_id = pur.id
      WHERE oa.purchase_id IN (${placeholders})
      ORDER BY oa.created_at DESC
    `;

    const [rows] = await db.execute(query, purchaseIds);

    // Transform the data to match frontend expectations
    const transformedData = rows.map((row) => ({
      ...row,
      product: {
        id: row.product_id,
        name: row.product_name,
        description: row.product_description,
        price: row.product_price,
        category: row.product_category,
        size: row.product_size,
        quantity: row.product_quantity,
        // Handle both single image (string) and multiple images (array)
        // Parse JSON if it's a string representation of an array
        images: (() => {
          let productImages = null;
          if (row.product_image) {
            if (Array.isArray(row.product_image)) {
              productImages = row.product_image;
            } else if (typeof row.product_image === "string") {
              try {
                // Try to parse as JSON array
                productImages = JSON.parse(row.product_image);
                // Ensure it's an array
                if (!Array.isArray(productImages)) {
                  productImages = [productImages];
                }
              } catch (e) {
                // If parsing fails, treat as single image string
                productImages = [row.product_image];
              }
            } else {
              productImages = [row.product_image];
            }
          }
          return productImages;
        })(),
      },
      purchase: {
        id: row.purchase_id,
        user_id: row.purchase_user_id,
        product_id: row.product_id,
        total_amount: row.purchase_total_amount,
        status: row.purchase_status,
        payment_id: row.purchase_payment_id,
      },
    }));

    return transformedData;
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error(
      "Failed to retrieve user order addresses: " + error.message
    );
  }
};

// Get order address by purchase ID
const getOrderAddressByPurchaseId = async (purchaseId, userId) => {
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

    // Get order address
    const orderAddress = await OrderAddressRepository.findByPurchaseId(
      purchaseId
    );
    return orderAddress;
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve order address: " + error.message);
  }
};

module.exports = {
  getAllOrderAddresses,
  getUserOrderAddresses,
  getOrderAddressByPurchaseId,
};
