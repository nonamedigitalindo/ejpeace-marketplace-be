// Event model for MySQL database

class Event {
  constructor(data) {
    this.id = data.id || null;
    this.title = data.title;
    this.description = data.description;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.location = data.location;
    this.price = data.price || 0; // Original price
    this.image = data.image || null; // Image URL or path
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.deleted_at = data.deleted_at || null;
  }

  // Validate event data
  validate() {
    const errors = [];

    if (!this.title || this.title.trim().length === 0) {
      errors.push("Event title is required");
    }

    if (!this.start_date) {
      errors.push("Start date is required");
    }

    if (!this.end_date) {
      errors.push("End date is required");
    }

    if (this.start_date && this.end_date) {
      const startDate = new Date(this.start_date);
      const endDate = new Date(this.end_date);

      if (startDate > endDate) {
        errors.push("End date must be after start date");
      }
    }

    if (!this.location || this.location.trim().length === 0) {
      errors.push("Location is required");
    }

    // Validate original price
    if (this.price !== undefined && (isNaN(this.price) || this.price < 0)) {
      errors.push("Price must be a non-negative number");
    }

    return errors;
  }

  // Calculate price (without discount)
  getPrice() {
    return this.price;
  }

  // Convert to JSON
  toJSON() {
    const result = {
      id: this.id,
      title: this.title,
      description: this.description,
      start_date: this.start_date,
      end_date: this.end_date,
      location: this.location,
      price: this.price,
      price_formatted: new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(this.price),
      // Only include image if it exists and is not null
      image: this.image && this.image.trim() !== "" ? this.image : null,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };

    return result;
  }
}

module.exports = Event;
