const db = require("../config/db.config");
const Purchase = require("./Purchase.model");

class PurchaseRepository {
  // Create a new purchase
  static async create(purchaseData) {
    const {
      user_id,
      product_id,
      total_amount,
      status,
      payment_id,
      external_id,
    } = purchaseData;
    const createdAt = new Date();
    const updatedAt = new Date();

    const query = `
      INSERT INTO purchases (user_id, product_id, total_amount, status, payment_id, external_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [
        user_id,
        product_id || null, // Handle undefined product_id
        total_amount,
        status,
        payment_id || null, // Handle undefined payment_id,
        external_id || null, // Handle undefined external_id
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

  // Find purchase by ID
  static async findById(id) {
    console.log(`[PurchaseRepository] Finding purchase by ID: ${id}`);
    const query = `
      SELECT id, user_id, product_id, total_amount, status, payment_id, external_id, created_at, updated_at, completed_at
      FROM purchases
      WHERE id = ?
    `;

    try {
      console.log(`[PurchaseRepository] Executing query with ID: ${id}`);
      const [rows] = await db.execute(query, [id]);
      console.log(`[PurchaseRepository] Query executed successfully`);
      console.log(`[PurchaseRepository] Found ${rows.length} rows`);
      if (rows.length === 0) {
        console.log(`[PurchaseRepository] No purchase found with ID: ${id}`);
        return null;
      }
      console.log(
        `[PurchaseRepository] Purchase data:`,
        JSON.stringify(rows[0], null, 2)
      );
      return new Purchase(rows[0]);
    } catch (error) {
      // If it's a connection error, return null
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while finding purchase by ID"
        );
        return null;
      }
      console.error(
        "[PurchaseRepository] Error finding purchase by ID:",
        error
      );
      throw error;
    }
  }

  // Find purchase by payment ID
  static async findByPaymentId(paymentId) {
    const query = `
      SELECT id, user_id, product_id, total_amount, status, payment_id, external_id, created_at, updated_at, completed_at
      FROM purchases
      WHERE payment_id = ?
    `;

    try {
      const [rows] = await db.execute(query, [paymentId]);
      if (rows.length === 0) return null;
      return new Purchase(rows[0]);
    } catch (error) {
      // If it's a connection error, return null
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while finding purchase by payment ID"
        );
        return null;
      }
      throw error;
    }
  }

  // Get all purchases for a user
  static async findByUserId(userId) {
    const query = `
      SELECT id, user_id, product_id, total_amount, status, payment_id, external_id, created_at, updated_at, completed_at
      FROM purchases
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;

    try {
      const [rows] = await db.execute(query, [userId]);
      return rows.map((row) => new Purchase(row));
    } catch (error) {
      // If it's a connection error, return empty array
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while fetching user purchases"
        );
        return [];
      }
      throw error;
    }
  }

  // Update purchase
  static async update(id, purchaseData) {
    const allowedFields = [
      "status",
      "payment_id",
      "external_id",
      "completed_at",
      "total_amount",
    ];
    const updates = [];
    const values = [];

    // Build dynamic query based on provided fields
    for (const field of allowedFields) {
      if (purchaseData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(purchaseData[field]);
      }
    }

    // Always update updated_at
    updates.push("updated_at = ?");
    values.push(new Date());

    // Add id to values
    values.push(id);

    if (updates.length === 1) {
      // Only updated_at
      return false; // Nothing to update
    }

    const query = `
      UPDATE purchases
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    try {
      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      // If it's a connection error, return false
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while updating purchase");
        return false;
      }
      throw error;
    }
  }

  // Update purchase status with transaction connection
  static async updateStatusWithConnection(id, status, connection) {
    const query = `
      UPDATE purchases
      SET status = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `;

    const completedAt = status === "paid" ? new Date() : null;

    try {
      const [result] = await connection.execute(query, [
        status,
        completedAt,
        new Date(),
        id,
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(
        "Database error while updating purchase status with connection:",
        error.message
      );
      throw error; // Throw so transaction can rollback
    }
  }

  // Find pending purchase by user ID and product ID
  // This is used to consolidate orders instead of creating duplicates
  static async findPendingByUserAndProduct(userId, productId) {
    const query = `
      SELECT id, user_id, product_id, total_amount, status, payment_id, external_id, created_at, updated_at, completed_at
      FROM purchases
      WHERE user_id = ? AND product_id = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const [rows] = await db.execute(query, [userId, productId]);
      if (rows.length === 0) return null;
      return new Purchase(rows[0]);
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while finding pending purchase"
        );
        return null;
      }
      throw error;
    }
  }

  // Get all purchases (for admin view)
  static async findAll() {
    const query = `
      SELECT id, user_id, product_id, total_amount, status, payment_id, external_id, created_at, updated_at, completed_at
      FROM purchases
      ORDER BY created_at DESC
    `;

    try {
      const [rows] = await db.execute(query);
      return rows.map((row) => new Purchase(row));
    } catch (error) {
      // If it's a connection error, return empty array
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while fetching all purchases"
        );
        return [];
      }
      throw error;
    }
  }
}

module.exports = PurchaseRepository;
