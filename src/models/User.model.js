// User model for MySQL database

class User {
  constructor(data) {
    this.id = data.id || null;
    this.username = data.username;
    this.email = data.email;
    this.phone = data.phone || null; // Add phone attribute
    this.address = data.address || null; // Add address attribute
    this.password = data.password;
    this.role = data.role || "user";
    this.status = data.status || "active"; // Add status field
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.deleted_at = data.deleted_at || null;
  }

  // Validate user data
  validate() {
    const errors = [];

    if (!this.username || this.username.length < 3) {
      errors.push("Username must be at least 3 characters long");
    }

    if (!this.email || !this.email.includes("@")) {
      errors.push("Valid email is required");
    }

    // Validate phone if provided
    if (this.phone && (this.phone.length < 10 || this.phone.length > 20)) {
      errors.push("Phone number must be between 10 and 20 characters");
    }

    if (!this.password || this.password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    }

    // Validate role
    if (this.role && !["user", "admin"].includes(this.role)) {
      errors.push("Role must be either 'user' or 'admin'");
    }

    return errors;
  }

  // Convert to JSON (excluding password)
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      phone: this.phone, // Include phone in JSON output
      address: this.address, // Include address in JSON output
      role: this.role,
      status: this.status, // Include status in JSON output
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = User;
