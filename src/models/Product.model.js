// Product model for MySQL database

class Product {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.discount_percentage = parseFloat(data.discount_percentage) || 0; // Discount percentage (0-100)
    this.category = data.category;
    this.size = data.size || null; // Size attribute (S, M, L, etc.)
    this.quantity = data.quantity || 0; // Stock quantity
    // Handle both single image (string) and multiple images (array)
    if (Array.isArray(data.image)) {
      this.image = data.image;
    } else if (data.image && typeof data.image === "string") {
      // Convert single image string to array
      this.image = [data.image];
    } else {
      this.image = [];
    }
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.deleted_at = data.deleted_at || null;
  }

  // Validate product data
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push("Product name is required");
    }

    if (!this.price || isNaN(this.price) || this.price <= 0) {
      errors.push("Valid price is required");
    }

    if (!this.category || this.category.trim().length === 0) {
      errors.push("Category is required");
    }

    // Validate quantity
    if (
      this.quantity !== undefined &&
      (isNaN(this.quantity) || this.quantity < 0)
    ) {
      errors.push("Quantity must be a non-negative number");
    }

    return errors;
  }

  // Calculate price (without discount)
  getPrice() {
    return this.price;
  }

  // Calculate discounted price based on discount_percentage
  getDiscountedPrice() {
    if (this.discount_percentage > 0 && this.discount_percentage <= 100) {
      return this.price * (1 - this.discount_percentage / 100);
    }
    return this.price;
  }

  // Convert to JSON
  toJSON() {
    const result = {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      price_formatted: new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(this.price),
      discount_percentage: this.discount_percentage,
      discounted_price: this.getDiscountedPrice(),
      discounted_price_formatted: new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(this.getDiscountedPrice()),
      category: this.category,
      size: this.size,
      quantity: this.quantity,
      // Include images array or null if empty
      images: this.image && this.image.length > 0 ? this.image : null,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };

    return result;
  }
}

module.exports = Product;
