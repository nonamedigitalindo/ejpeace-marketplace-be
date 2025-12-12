const db = require("../config/db.config");
const Barcode = require("./Barcode.model");

class BarcodeRepository {
  // Create a new barcode
  static async create(barcodeData) {
    const { ticket_id, event_id, barcode_data, qr_code_image, status } =
      barcodeData;

    const createdAt = new Date();
    const updatedAt = new Date();

    const query = `
      INSERT INTO barcodes (
        ticket_id, event_id, barcode_data, qr_code_image, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [
        ticket_id,
        event_id,
        barcode_data,
        qr_code_image,
        status,
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

  // Find barcode by ID
  static async findById(id) {
    const query = `
      SELECT 
        id, ticket_id, event_id, barcode_data, qr_code_image, status, created_at, updated_at
      FROM barcodes
      WHERE id = ?
    `;

    try {
      const [rows] = await db.execute(query, [id]);
      if (rows.length === 0) return null;
      return new Barcode(rows[0]);
    } catch (error) {
      // If it's a connection error, return null
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while finding barcode by ID");
        return null;
      }
      throw error;
    }
  }

  // Find barcode by ticket ID
  static async findByTicketId(ticketId) {
    const query = `
      SELECT 
        id, ticket_id, event_id, barcode_data, qr_code_image, status, created_at, updated_at
      FROM barcodes
      WHERE ticket_id = ?
    `;

    try {
      const [rows] = await db.execute(query, [ticketId]);
      if (rows.length === 0) return null;
      return new Barcode(rows[0]);
    } catch (error) {
      // If it's a connection error, return null
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while finding barcode by ticket ID"
        );
        return null;
      }
      throw error;
    }
  }

  // Find barcode by barcode data
  static async findByBarcodeData(barcodeData) {
    const query = `
      SELECT 
        id, ticket_id, event_id, barcode_data, qr_code_image, status, created_at, updated_at
      FROM barcodes
      WHERE barcode_data = ?
    `;

    try {
      const [rows] = await db.execute(query, [barcodeData]);
      if (rows.length === 0) return null;
      return new Barcode(rows[0]);
    } catch (error) {
      // If it's a connection error, return null
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while finding barcode by data"
        );
        return null;
      }
      throw error;
    }
  }

  // Update barcode
  static async update(id, barcodeData) {
    const fields = [];
    const values = [];

    // Build dynamic query based on provided fields
    Object.keys(barcodeData).forEach((key) => {
      if (key !== "id") {
        fields.push(`${key} = ?`);
        values.push(barcodeData[key]);
      }
    });

    // Always update the updated_at field
    fields.push("updated_at = ?");
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE barcodes
      SET ${fields.join(", ")}
      WHERE id = ?
    `;

    try {
      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      // If it's a connection error, return false
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while updating barcode");
        return false;
      }
      throw error;
    }
  }

  // Check if barcode is valid for check-in (active status)
  static async isValidForCheckin(barcodeData) {
    const query = `
      SELECT 
        id, ticket_id, event_id, barcode_data, qr_code_image, status, created_at, updated_at
      FROM barcodes
      WHERE barcode_data = ? AND status = 'active'
    `;

    try {
      const [rows] = await db.execute(query, [barcodeData]);
      if (rows.length === 0)
        return { valid: false, reason: "Barcode not found or not active" };
      return { valid: true, barcode: new Barcode(rows[0]) };
    } catch (error) {
      // If it's a connection error, return error
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while validating barcode for check-in"
        );
        return { valid: false, reason: "Service unavailable" };
      }
      throw error;
    }
  }
}

module.exports = BarcodeRepository;
