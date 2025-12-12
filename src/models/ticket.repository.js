const db = require("../config/db.config");
const Ticket = require("./Ticket.model");

class TicketRepository {
  // Create a new ticket
  static async create(ticketData) {
    const {
      user_id,
      event_id,
      ticket_type,
      price,
      status,
      payment_id,
      attendee_name,
      attendee_email,
      attendee_phone,
    } = ticketData;

    // Handle undefined values by converting them to null
    const safePaymentId = payment_id !== undefined ? payment_id : null;
    const safeAttendeePhone =
      attendee_phone !== undefined ? attendee_phone : null;

    const createdAt = new Date();
    const updatedAt = new Date();

    const query = `
      INSERT INTO tickets (
        user_id, event_id, ticket_type, price, status, payment_id,
        attendee_name, attendee_email, attendee_phone, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [
        user_id,
        event_id,
        ticket_type,
        price,
        status,
        safePaymentId, // Use safePaymentId instead of payment_id
        attendee_name,
        attendee_email,
        safeAttendeePhone, // Use safeAttendeePhone instead of attendee_phone
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

  // Find ticket by ID
  static async findById(id) {
    const query = `
      SELECT 
        id, user_id, event_id, ticket_type, price, status, payment_id,
        attendee_name, attendee_email, attendee_phone, created_at, updated_at, deleted_at
      FROM tickets
      WHERE id = ? AND deleted_at IS NULL
    `;

    try {
      const [rows] = await db.execute(query, [id]);
      if (rows.length === 0) return null;
      return new Ticket(rows[0]);
    } catch (error) {
      // If it's a connection error, return null
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while finding ticket by ID");
        return null;
      }
      throw error;
    }
  }

  // Find ticket by payment ID
  static async findByPaymentId(paymentId) {
    const query = `
      SELECT 
        id, user_id, event_id, ticket_type, price, status, payment_id,
        attendee_name, attendee_email, attendee_phone, created_at, updated_at, deleted_at
      FROM tickets
      WHERE payment_id = ? AND deleted_at IS NULL
    `;

    try {
      const [rows] = await db.execute(query, [paymentId]);
      if (rows.length === 0) return null;
      return new Ticket(rows[0]);
    } catch (error) {
      // If it's a connection error, return null
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while finding ticket by payment ID"
        );
        return null;
      }
      throw error;
    }
  }

  // Find all tickets by payment ID
  static async findAllByPaymentId(paymentId) {
    const query = `
      SELECT 
        id, user_id, event_id, ticket_type, price, status, payment_id,
        attendee_name, attendee_email, attendee_phone, created_at, updated_at, deleted_at
      FROM tickets
      WHERE payment_id = ? AND deleted_at IS NULL
    `;

    try {
      const [rows] = await db.execute(query, [paymentId]);
      return rows.map((row) => new Ticket(row));
    } catch (error) {
      // If it's a connection error, return empty array
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while finding all tickets by payment ID"
        );
        return [];
      }
      throw error;
    }
  }

  // Get all tickets for a user (excluding deleted ones)
  static async findByUserId(userId) {
    const query = `
      SELECT 
        id, user_id, event_id, ticket_type, price, status, payment_id,
        attendee_name, attendee_email, attendee_phone, created_at, updated_at
      FROM tickets
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    try {
      const [rows] = await db.execute(query, [userId]);
      return rows.map((row) => new Ticket(row));
    } catch (error) {
      // If it's a connection error, return empty array
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while fetching user tickets");
        return [];
      }
      throw error;
    }
  }

  // Update ticket
  static async update(id, ticketData) {
    const fields = [];
    const values = [];

    // Build dynamic query based on provided fields
    Object.keys(ticketData).forEach((key) => {
      if (key !== "id" && key !== "deleted_at") {
        fields.push(`${key} = ?`);
        values.push(ticketData[key]);
      }
    });

    // Always update the updated_at field
    fields.push("updated_at = ?");
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE tickets
      SET ${fields.join(", ")}
      WHERE id = ? AND deleted_at IS NULL
    `;

    try {
      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      // If it's a connection error, return false
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while updating ticket");
        return false;
      }
      throw error;
    }
  }

  // Soft delete ticket
  static async softDelete(id) {
    const deletedAt = new Date();

    const query = `
      UPDATE tickets
      SET deleted_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `;

    try {
      const [result] = await db.execute(query, [deletedAt, id]);
      return result.affectedRows > 0;
    } catch (error) {
      // If it's a connection error, return false
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while deleting ticket");
        return false;
      }
      throw error;
    }
  }

  // Get all tickets (for admin view)
  static async findAll() {
    const query = `
      SELECT 
        id, user_id, event_id, ticket_type, price, status, payment_id,
        attendee_name, attendee_email, attendee_phone, created_at, updated_at
      FROM tickets
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    try {
      const [rows] = await db.execute(query);
      return rows.map((row) => new Ticket(row));
    } catch (error) {
      // If it's a connection error, return empty array
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while fetching all tickets");
        return [];
      }
      throw error;
    }
  }
}

module.exports = TicketRepository;
