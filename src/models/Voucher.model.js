// Voucher model for MySQL database

/**
 * Convert a date to Jakarta timezone (UTC+7)
 * @param {string|Date} dateInput - The date to convert
 * @returns {Date} - Date adjusted to Jakarta timezone
 */
const toJakartaTimezone = (dateInput) => {
  if (!dateInput) return null;

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return null;

  // If the input is a date-only string (YYYY-MM-DD), treat it as Jakarta midnight
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    // Parse as Jakarta time (UTC+7) - subtract 7 hours to get UTC equivalent
    const [year, month, day] = dateInput.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0));
  }

  // For datetime strings without timezone, assume Jakarta timezone
  if (typeof dateInput === 'string' && !dateInput.includes('Z') && !dateInput.includes('+') && !dateInput.includes('-', 10)) {
    // Input has no timezone info, treat as Jakarta time
    const jakartaOffset = 7 * 60; // Jakarta is UTC+7 (in minutes)
    const utcDate = new Date(date.getTime() - jakartaOffset * 60 * 1000);
    return utcDate;
  }

  return date;
};

class Voucher {
  constructor(data) {
    this.id = data.id || null;
    this.code = data.code;
    this.discount_type = data.discount_type || "percentage"; // 'percentage' or 'fixed'
    // Ensure discount_value is always a number
    this.discount_value = data.discount_value
      ? parseFloat(data.discount_value)
      : 0;
    this.max_usage = data.max_usage || null;
    this.used_count = data.used_count || 0;
    // Ensure min_order_value is always a number or null
    this.min_order_value = data.min_order_value
      ? parseFloat(data.min_order_value)
      : null;
    // Convert dates to Jakarta timezone (UTC+7)
    this.valid_from = toJakartaTimezone(data.valid_from);
    this.valid_until = toJakartaTimezone(data.valid_until);
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.apply_to_all = data.apply_to_all !== undefined ? data.apply_to_all : true; // Default: apply to all
    this.voucher_type = data.voucher_type || "general"; // 'product', 'event', 'shipping', or 'general'
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  // Validate voucher data
  validate() {
    const errors = [];

    if (!this.code) {
      errors.push("Voucher code is required");
    }

    if (
      !this.discount_type ||
      !["percentage", "fixed"].includes(this.discount_type)
    ) {
      errors.push("Discount type must be either 'percentage' or 'fixed'");
    }

    if (
      !this.discount_value ||
      isNaN(this.discount_value) ||
      this.discount_value <= 0
    ) {
      errors.push("Valid discount value is required");
    }

    if (this.discount_type === "percentage" && this.discount_value > 100) {
      errors.push("Percentage discount cannot exceed 100%");
    }

    if (
      this.max_usage !== null &&
      (!Number.isInteger(this.max_usage) || this.max_usage < 0)
    ) {
      errors.push("Max usage must be a non-negative integer or null");
    }

    if (
      this.min_order_value !== null &&
      (isNaN(this.min_order_value) || this.min_order_value < 0)
    ) {
      errors.push("Min order value must be a non-negative number or null");
    }

    if (!this.valid_from) {
      errors.push("Valid from date is required");
    }

    if (!this.valid_until) {
      errors.push("Valid until date is required");
    }

    if (
      this.valid_from &&
      this.valid_until &&
      new Date(this.valid_from) > new Date(this.valid_until)
    ) {
      errors.push("Valid from date must be before valid until date");
    }

    // Validate voucher_type - must match database ENUM
    const validVoucherTypes = ["product", "event", "shipping", "general"];
    if (
      !this.voucher_type ||
      !validVoucherTypes.includes(this.voucher_type)
    ) {
      errors.push("Voucher type must be one of: 'product', 'event', 'shipping', 'general'");
    }

    return errors;
  }

  // Check if voucher is valid for use
  isValid() {
    const now = new Date();

    // Check if voucher is active
    if (!this.is_active) {
      return { valid: false, reason: "Voucher is not active" };
    }

    // Check if voucher is within valid date range
    if (now < new Date(this.valid_from)) {
      return { valid: false, reason: "Voucher is not yet valid" };
    }

    if (now > new Date(this.valid_until)) {
      return { valid: false, reason: "Voucher has expired" };
    }

    // Check if usage limit has been reached
    if (this.max_usage !== null && this.used_count >= this.max_usage) {
      return { valid: false, reason: "Voucher usage limit reached" };
    }

    return { valid: true };
  }

  // Calculate discount amount
  calculateDiscount(amount) {
    // Ensure discount_value and amount are numbers
    const discountValue = parseFloat(this.discount_value);
    const orderAmount = parseFloat(amount);

    // Validate that we got valid numbers
    if (isNaN(discountValue) || isNaN(orderAmount)) {
      console.error(
        `Invalid discount calculation: discount_value=${this.discount_value}, amount=${amount}`
      );
      return 0;
    }

    if (this.discount_type === "percentage") {
      return orderAmount * (discountValue / 100);
    } else {
      // Fixed discount cannot exceed order amount
      return Math.min(discountValue, orderAmount);
    }
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      code: this.code,
      discount_type: this.discount_type,
      discount_value: this.discount_value,
      max_usage: this.max_usage,
      used_count: this.used_count,
      min_order_value: this.min_order_value,
      valid_from: this.valid_from,
      valid_until: this.valid_until,
      is_active: this.is_active,
      apply_to_all: this.apply_to_all,
      voucher_type: this.voucher_type,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = Voucher;
