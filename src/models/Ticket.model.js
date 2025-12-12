// Ticket model for MySQL database

class Ticket {
  constructor(data) {
    this.id = data.id || null;
    this.user_id = data.user_id;
    this.event_id = data.event_id;
    this.ticket_type = data.ticket_type || "general";
    this.price = data.price;
    this.status = data.status || "pending"; // pending, paid, cancelled, checked_in
    this.payment_id = data.payment_id || null;
    // Note: barcode field removed as it's now handled by the dedicated barcodes table
    this.attendee_name = data.attendee_name;
    this.attendee_email = data.attendee_email;
    this.attendee_phone = data.attendee_phone;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.deleted_at = data.deleted_at || null;
  }

  // Validate ticket data
  validate() {
    const errors = [];

    if (!this.user_id) {
      errors.push("User ID is required");
    }

    if (!this.event_id) {
      errors.push("Event ID is required");
    }

    if (!this.price || isNaN(this.price) || this.price <= 0) {
      errors.push("Valid price is required");
    }

    if (!this.attendee_name || this.attendee_name.trim().length === 0) {
      errors.push("Attendee name is required");
    }

    if (!this.attendee_email || this.attendee_email.trim().length === 0) {
      errors.push("Attendee email is required");
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.attendee_email)) {
      errors.push("Valid email is required");
    }

    return errors;
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      event_id: this.event_id,
      ticket_type: this.ticket_type,
      price: this.price,
      status: this.status,
      payment_id: this.payment_id,
      // Note: barcode field removed as it's now handled by the dedicated barcodes table
      attendee_name: this.attendee_name,
      attendee_email: this.attendee_email,
      attendee_phone: this.attendee_phone,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = Ticket;
