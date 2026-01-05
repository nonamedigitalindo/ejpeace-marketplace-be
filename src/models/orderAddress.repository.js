const db = require("../config/db.config");

class OrderAddressRepository {
  // Create a new order address
  static async create(addressData) {
    const {
      purchase_id,
      ticket_id,
      product_id,
      quantity, // CRITICAL: Store quantity at checkout
      full_name,
      phone,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
    } = addressData;
    const createdAt = new Date();
    const updatedAt = new Date();

    const query = `
      INSERT INTO order_addresses (purchase_id, ticket_id, product_id, quantity, full_name, phone, address_line1, address_line2, city, state, postal_code, country, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [
        purchase_id || null,
        ticket_id || null,
        product_id || null,
        quantity || 1, // Default to 1 if not provided
        full_name,
        phone,
        address_line1,
        address_line2 || null,
        city,
        state || null,
        postal_code,
        country || "Indonesia",
        createdAt,
        updatedAt,
      ]);
      return result.insertId;
    } catch (error) {
      // If it's a connection error, return a special error
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new Error("Database connection failed");
      }
      throw error;
    }
  }

  // Find order address by purchase ID with product and purchase data
  static async findByPurchaseId(purchaseId) {
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
        pur.payment_id as purchase_payment_id
      FROM order_addresses oa
      LEFT JOIN products p ON oa.product_id = p.id
      LEFT JOIN purchases pur ON oa.purchase_id = pur.id
      WHERE oa.purchase_id = ?
    `;

    try {
      const [rows] = await db.execute(query, [purchaseId]);
      if (rows.length === 0) return null;

      // Log for debugging
      console.log(
        "Order address with product data:",
        JSON.stringify(rows[0], null, 2)
      );

      // Parse images JSON if it exists
      const orderAddressData = { ...rows[0] };
      if (orderAddressData.product_image) {
        try {
          orderAddressData.product_image = JSON.parse(
            orderAddressData.product_image
          );
        } catch (e) {
          // If parsing fails, keep as string
          orderAddressData.product_image = [orderAddressData.product_image];
        }
      }

      return orderAddressData;
    } catch (error) {
      // If it's a connection error, return null
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while finding order address by purchase ID"
        );
        return null;
      }
      throw error;
    }
  }

  // Update order address
  static async update(purchaseId, addressData) {
    const {
      full_name,
      phone,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      product_id,
    } = addressData;
    const updatedAt = new Date();

    const query = `
      UPDATE order_addresses
      SET full_name = ?, phone = ?, address_line1 = ?, address_line2 = ?, city = ?, state = ?, postal_code = ?, country = ?, product_id = ?, updated_at = ?
      WHERE purchase_id = ?
    `;

    try {
      const [result] = await db.execute(query, [
        full_name,
        phone,
        address_line1,
        address_line2 || null,
        city,
        state || null,
        postal_code,
        country || "Indonesia",
        product_id || null,
        updatedAt,
        purchaseId,
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      // If it's a connection error, return false
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while updating order address"
        );
        return false;
      }
      throw error;
    }
  }

  // Get all order addresses with product and purchase data
  static async findAll() {
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
        pur.payment_id as purchase_payment_id
      FROM order_addresses oa
      LEFT JOIN products p ON oa.product_id = p.id
      LEFT JOIN purchases pur ON oa.purchase_id = pur.id
      ORDER BY oa.created_at DESC
    `;

    try {
      const [rows] = await db.execute(query);
      return rows.map((row) => {
        // Parse images JSON if it exists
        const orderAddressData = { ...row };
        if (orderAddressData.product_image) {
          try {
            orderAddressData.product_image = JSON.parse(
              orderAddressData.product_image
            );
          } catch (e) {
            // If parsing fails, keep as string
            orderAddressData.product_image = [orderAddressData.product_image];
          }
        }
        return orderAddressData;
      });
    } catch (error) {
      // If it's a connection error, return empty array
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while fetching all order addresses"
        );
        return [];
      }
      throw error;
    }
  }
}

module.exports = OrderAddressRepository;
