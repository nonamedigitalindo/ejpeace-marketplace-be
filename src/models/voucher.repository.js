const db = require("../config/db.config");
const Voucher = require("./Voucher.model");
const { toJakartaDateString } = require("../utils/date.util");

class VoucherRepository {
  // Create a new voucher
  static async create(voucherData) {
    const {
      code,
      discount_type,
      discount_value,
      max_usage,
      min_order_value,
      valid_from,
      valid_until,
      is_active,
      voucher_type,
    } = voucherData;
    const createdAt = new Date();
    const updatedAt = new Date();

    // Enforce Strict Timezone Handling
    let formattedValidFrom = valid_from;
    let formattedValidUntil = valid_until;
    try {
      if (valid_from) formattedValidFrom = toJakartaDateString(valid_from);
      if (valid_until) formattedValidUntil = toJakartaDateString(valid_until);
    } catch (e) {
      throw new Error(`Timezone Validation Error: ${e.message}`);
    }

    const query = `
      INSERT INTO vouchers (code, discount_type, discount_value, max_usage, used_count, min_order_value, valid_from, valid_until, is_active, voucher_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [
        code,
        discount_type,
        discount_value,
        max_usage,
        0, // used_count starts at 0
        min_order_value,
        formattedValidFrom,
        formattedValidUntil,
        is_active,
        voucher_type || "general",
        createdAt,
        updatedAt,
      ]);
      return result.insertId;
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new Error("Database connection failed");
      }
      throw error;
    }
  }

  // Find voucher by ID
  static async findById(id) {
    const query = `
      SELECT *
      FROM vouchers
      WHERE id = ?
    `;

    try {
      const [rows] = await db.execute(query, [id]);
      if (rows.length === 0) return null;
      return new Voucher(rows[0]);
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while finding voucher by ID");
        return null;
      }
      throw error;
    }
  }

  // Find voucher by code
  static async findByCode(code) {
    const query = `
      SELECT *
      FROM vouchers
      WHERE code = ?
    `;

    try {
      const [rows] = await db.execute(query, [code]);
      if (rows.length === 0) return null;
      return new Voucher(rows[0]);
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while finding voucher by code");
        return null;
      }
      throw error;
    }
  }

  // Find all vouchers
  static async findAll() {
    const query = `
      SELECT *
      FROM vouchers
      ORDER BY created_at DESC
    `;

    try {
      const [rows] = await db.execute(query);
      return rows.map((row) => new Voucher(row));
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while fetching all vouchers");
        return [];
      }
      throw error;
    }
  }

  // Update voucher
  static async update(id, voucherData) {
    const allowedFields = [
      "code",
      "discount_type",
      "discount_value",
      "max_usage",
      "min_order_value",
      "valid_from",
      "valid_until",
      "is_active",
      "voucher_type",
      "apply_to_all",
    ];
    const updates = [];
    const values = [];

    // Enforce Strict Timezone Handling
    if (voucherData.valid_from) {
      try {
        voucherData.valid_from = toJakartaDateString(voucherData.valid_from);
      } catch (e) {
        throw new Error(`Timezone Validation Error: ${e.message}`);
      }
    }
    if (voucherData.valid_until) {
      try {
        voucherData.valid_until = toJakartaDateString(voucherData.valid_until);
      } catch (e) {
        throw new Error(`Timezone Validation Error: ${e.message}`);
      }
    }

    for (const field of allowedFields) {
      if (voucherData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(voucherData[field]);
      }
    }

    updates.push("updated_at = ?");
    values.push(new Date());
    values.push(id);

    if (updates.length === 1) return false;

    const query = `
      UPDATE vouchers
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    try {
      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while updating voucher");
        return false;
      }
      throw error;
    }
  }

  // Delete voucher
  static async delete(id) {
    const query = `DELETE FROM vouchers WHERE id = ?`;
    try {
      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while deleting voucher");
        return false;
      }
      throw error;
    }
  }

  // Increment voucher usage count
  static async incrementUsage(id) {
    const query = `
      UPDATE vouchers
      SET used_count = used_count + 1, updated_at = ?
      WHERE id = ?
    `;
    try {
      const [result] = await db.execute(query, [new Date(), id]);
      return result.affectedRows > 0;
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while incrementing voucher usage");
        return false;
      }
      throw error;
    }
  }

  // Increment voucher usage count with transaction connection
  static async incrementUsageWithConnection(id, connection) {
    const query = `
      UPDATE vouchers
      SET used_count = used_count + 1, updated_at = ?
      WHERE id = ?
    `;
    try {
      const [result] = await connection.execute(query, [new Date(), id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Database error while incrementing voucher usage with connection:", error.message);
      throw error;
    }
  }

  // Associate voucher with ticket
  static async associateWithTicket(ticket_id, voucher_id, discount_amount) {
    const query = `
      INSERT INTO ticket_vouchers (ticket_id, voucher_id, discount_amount, created_at)
      VALUES (?, ?, ?, ?)
    `;
    try {
      const [result] = await db.execute(query, [ticket_id, voucher_id, discount_amount, new Date()]);
      return result.insertId;
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new Error("Database connection failed");
      }
      throw error;
    }
  }

  // Get vouchers associated with a ticket
  static async getVouchersForTicket(ticket_id) {
    const query = `
      SELECT v.*, tv.discount_amount
      FROM vouchers v
      JOIN ticket_vouchers tv ON v.id = tv.voucher_id
      WHERE tv.ticket_id = ?
    `;
    try {
      const [rows] = await db.execute(query, [ticket_id]);
      return rows.map((row) => {
        const voucher = new Voucher(row);
        voucher.discount_amount = row.discount_amount;
        return voucher;
      });
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while fetching vouchers for ticket");
        return [];
      }
      throw error;
    }
  }

  // Associate voucher with purchase
  static async associateWithPurchase(purchase_id, voucher_id, discount_amount) {
    const query = `
      INSERT INTO purchase_vouchers (purchase_id, voucher_id, discount_amount, created_at)
      VALUES (?, ?, ?, ?)
    `;
    try {
      const [result] = await db.execute(query, [purchase_id, voucher_id, discount_amount, new Date()]);
      return result.insertId;
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new Error("Database connection failed");
      }
      throw error;
    }
  }

  // Get vouchers associated with a purchase
  static async getVouchersForPurchase(purchase_id) {
    const query = `
      SELECT v.*, pv.discount_amount
      FROM vouchers v
      JOIN purchase_vouchers pv ON v.id = pv.voucher_id
      WHERE pv.purchase_id = ?
    `;
    try {
      const [rows] = await db.execute(query, [purchase_id]);
      return rows.map((row) => {
        const voucher = new Voucher(row);
        voucher.discount_amount = row.discount_amount;
        return voucher;
      });
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while fetching vouchers for purchase");
        return [];
      }
      throw error;
    }
  }

  // Check if user has already claimed a voucher
  static async hasUserClaimedVoucher(voucher_id, user_id) {
    const query = `SELECT id FROM user_voucher_claims WHERE voucher_id = ? AND user_id = ?`;
    try {
      const [rows] = await db.execute(query, [voucher_id, user_id]);
      return rows.length > 0;
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while checking user voucher claim");
        return false;
      }
      throw error;
    }
  }

  // Claim voucher for user
  static async claimVoucherForUser(voucher_id, user_id) {
    const query = `INSERT INTO user_voucher_claims (user_id, voucher_id, claimed_at) VALUES (?, ?, ?)`;
    try {
      const [result] = await db.execute(query, [user_id, voucher_id, new Date()]);
      return result.insertId;
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new Error("Database connection failed");
      }
      throw error;
    }
  }

  // Get user's claimed vouchers
  static async getUserClaimedVouchers(user_id) {
    const query = `
      SELECT v.*, uvc.claimed_at, uvc.is_used, uvc.used_at
      FROM vouchers v
      JOIN user_voucher_claims uvc ON v.id = uvc.voucher_id
      WHERE uvc.user_id = ?
      ORDER BY uvc.claimed_at DESC
    `;
    try {
      const [rows] = await db.execute(query, [user_id]);
      return rows.map((row) => {
        const voucher = new Voucher(row);
        voucher.claimed_at = row.claimed_at;
        voucher.is_used = row.is_used;
        voucher.used_at = row.used_at;
        return voucher;
      });
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while fetching user claimed vouchers");
        return [];
      }
      throw error;
    }
  }

  // Add products to a voucher
  static async addProductsToVoucher(voucherId, productIds) {
    if (!productIds || productIds.length === 0) return;
    const query = `INSERT IGNORE INTO voucher_products (voucher_id, product_id) VALUES (?, ?)`;
    try {
      for (const productId of productIds) {
        await db.execute(query, [voucherId, productId]);
      }
    } catch (error) {
      console.error("Error adding products to voucher:", error.message);
      throw error;
    }
  }

  // Add events to a voucher
  static async addEventsToVoucher(voucherId, eventIds) {
    if (!eventIds || eventIds.length === 0) return;
    const query = `INSERT IGNORE INTO voucher_events (voucher_id, event_id) VALUES (?, ?)`;
    try {
      for (const eventId of eventIds) {
        await db.execute(query, [voucherId, eventId]);
      }
    } catch (error) {
      console.error("Error adding events to voucher:", error.message);
      throw error;
    }
  }

  // Remove all products from a voucher
  static async removeAllProductsFromVoucher(voucherId) {
    const query = `DELETE FROM voucher_products WHERE voucher_id = ?`;
    try {
      await db.execute(query, [voucherId]);
    } catch (error) {
      console.error("Error removing products from voucher:", error.message);
      throw error;
    }
  }

  // Remove all events from a voucher
  static async removeAllEventsFromVoucher(voucherId) {
    const query = `DELETE FROM voucher_events WHERE voucher_id = ?`;
    try {
      await db.execute(query, [voucherId]);
    } catch (error) {
      console.error("Error removing events from voucher:", error.message);
      throw error;
    }
  }

  // Get products associated with a voucher
  static async getVoucherProducts(voucherId) {
    const query = `
      SELECT p.id, p.name, p.price, p.category
      FROM products p
      JOIN voucher_products vp ON p.id = vp.product_id
      WHERE vp.voucher_id = ? AND p.deleted_at IS NULL
    `;
    try {
      const [rows] = await db.execute(query, [voucherId]);
      return rows;
    } catch (error) {
      console.error("Error getting voucher products:", error.message);
      return [];
    }
  }

  // Get events associated with a voucher
  static async getVoucherEvents(voucherId) {
    const query = `
      SELECT e.id, e.title, e.price, e.start_date
      FROM events e
      JOIN voucher_events ve ON e.id = ve.event_id
      WHERE ve.voucher_id = ? AND e.deleted_at IS NULL
    `;
    try {
      const [rows] = await db.execute(query, [voucherId]);
      return rows;
    } catch (error) {
      console.error("Error getting voucher events:", error.message);
      return [];
    }
  }

  // Check if voucher applies to a specific product
  static async voucherAppliesToProduct(voucherId, productId) {
    const query = `SELECT COUNT(*) as count FROM voucher_products WHERE voucher_id = ? AND product_id = ?`;
    try {
      const [rows] = await db.execute(query, [voucherId, productId]);
      return rows[0].count > 0;
    } catch (error) {
      console.error("Error checking voucher product:", error.message);
      return false;
    }
  }

  // Check if voucher applies to a specific event
  static async voucherAppliesToEvent(voucherId, eventId) {
    const query = `SELECT COUNT(*) as count FROM voucher_events WHERE voucher_id = ? AND event_id = ?`;
    try {
      const [rows] = await db.execute(query, [voucherId, eventId]);
      return rows[0].count > 0;
    } catch (error) {
      console.error("Error checking voucher event:", error.message);
      return false;
    }
  }

  // Update apply_to_all field
  static async updateApplyToAll(voucherId, applyToAll) {
    const query = `UPDATE vouchers SET apply_to_all = ?, updated_at = ? WHERE id = ?`;
    try {
      await db.execute(query, [applyToAll ? 1 : 0, new Date(), voucherId]);
    } catch (error) {
      console.error("Error updating apply_to_all:", error.message);
      throw error;
    }
  }
}

module.exports = VoucherRepository;
