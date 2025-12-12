// Purchase model for MySQL database

class Purchase {
  constructor(data) {
    this.id = data.id || null;
    this.user_id = data.user_id;
    this.product_id = data.product_id || null;
    this.total_amount = data.total_amount;
    this.status = data.status || "pending"; // pending, paid, cancelled, shipped, completed
    this.payment_id = data.payment_id || null;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.completed_at = data.completed_at || null;
  }

  // Validate purchase data
  validate() {
    const errors = [];

    if (!this.user_id) {
      errors.push("User ID is required");
    }

    if (
      !this.total_amount ||
      isNaN(this.total_amount) ||
      this.total_amount <= 0
    ) {
      errors.push("Valid total amount is required");
    }

    if (
      this.status &&
      !["pending", "paid", "cancelled", "shipped", "completed"].includes(
        this.status
      )
    ) {
      errors.push(
        "Status must be one of: pending, paid, cancelled, shipped, completed"
      );
    }

    return errors;
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      product_id: this.product_id,
      total_amount: this.total_amount,
      status: this.status,
      payment_id: this.payment_id,
      created_at: this.created_at,
      updated_at: this.updated_at,
      completed_at: this.completed_at,
    };
  }
}

module.exports = Purchase;
