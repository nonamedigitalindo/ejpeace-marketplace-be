// Barcode model for MySQL database

class Barcode {
  constructor(data) {
    this.id = data.id || null;
    this.ticket_id = data.ticket_id;
    this.event_id = data.event_id;
    this.barcode_data = data.barcode_data;
    this.qr_code_image = data.qr_code_image || null;
    this.status = data.status || "active"; // active, inactive
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  // Validate barcode data
  validate() {
    const errors = [];

    if (!this.ticket_id) {
      errors.push("Ticket ID is required");
    }

    if (!this.event_id) {
      errors.push("Event ID is required");
    }

    if (!this.barcode_data || this.barcode_data.trim().length === 0) {
      errors.push("Barcode data is required");
    }

    return errors;
  }

  // Check if barcode is active
  isActive() {
    return this.status === "active";
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      ticket_id: this.ticket_id,
      event_id: this.event_id,
      barcode_data: this.barcode_data,
      qr_code_image: this.qr_code_image,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = Barcode;
