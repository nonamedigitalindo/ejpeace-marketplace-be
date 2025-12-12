// Cart model for MySQL database

class Cart {
  constructor(data) {
    this.id = data.id || null;
    this.user_id = data.user_id;
    this.product_id = data.product_id;
    this.quantity = data.quantity || 1;
    this.purchase_id = data.purchase_id || null;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    // Product details
    this.product_name = data.product_name || null;
    this.product_price = data.product_price || null;
    this.product_description = data.product_description || null;
    this.product_category = data.product_category || null;
    this.product_size = data.product_size || null;
    this.discount_percentage = data.discount_percentage || null;
    // Handle both single image (string) and multiple images (array)
    if (Array.isArray(data.product_image)) {
      this.product_image = data.product_image;
    } else if (data.product_image && typeof data.product_image === "string") {
      // Convert single image string to array
      this.product_image = [data.product_image];
    } else {
      this.product_image = [];
    }
  }

  // Validate cart data
  validate() {
    const errors = [];

    if (!this.user_id) {
      errors.push("User ID is required");
    }

    if (!this.product_id) {
      errors.push("Product ID is required");
    }

    if (!this.quantity || isNaN(this.quantity) || this.quantity <= 0) {
      errors.push("Valid quantity is required");
    }

    return errors;
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      product_id: this.product_id,
      quantity: this.quantity,
      purchase_id: this.purchase_id,
      created_at: this.created_at,
      updated_at: this.updated_at,
      // Include product details if available
      product_name: this.product_name,
      product_price: this.product_price,
      product_description: this.product_description,
      product_category: this.product_category,
      product_size: this.product_size,
      product_images:
        this.product_image && this.product_image.length > 0
          ? this.product_image
          : null,
    };
  }
}

module.exports = Cart;
