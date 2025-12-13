const db = require("../config/db.config");
const User = require("./User.model");

class UserRepository {
  // Create a new user
  static async create(userData) {
    const { username, email, phone, address, password, role } = userData;
    const createdAt = new Date();
    const updatedAt = new Date();

    const query = `
      INSERT INTO users (username, email, phone, address, password, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [
        username,
        email,
        phone,
        address,
        password,
        role,
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

  // Find user by email
  static async findByEmail(email) {
    const query = `
      SELECT id, username, email, phone, address, password, role, created_at, updated_at, deleted_at
      FROM users
      WHERE email = ? AND deleted_at IS NULL
    `;

    try {
      const [rows] = await db.execute(query, [email]);
      if (rows.length === 0) return null;
      return new User(rows[0]);
    } catch (error) {
      // If it's a connection error, return null
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while finding user by email");
        return null;
      }
      throw error;
    }
  }

  // Find users by IDs
  static async findByIds(ids) {
    if (!ids || ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    const query = `
      SELECT id, username, email
      FROM users
      WHERE id IN (${placeholders})
    `;

    try {
      const [rows] = await db.execute(query, ids);
      return rows;
    } catch (error) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while finding users by IDs");
        return [];
      }
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    const query = `
      SELECT id, username, email, phone, address, password, role, created_at, updated_at, deleted_at
      FROM users
      WHERE id = ? AND deleted_at IS NULL
    `;

    try {
      const [rows] = await db.execute(query, [id]);
      if (rows.length === 0) return null;
      return new User(rows[0]);
    } catch (error) {
      // If it's a connection error, return null
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while finding user by ID");
        return null;
      }
      throw error;
    }
  }

  // Get all users (including deleted ones with status)
  static async findAll() {
    const query = `
      SELECT id, username, email, phone, address, role, created_at, updated_at, deleted_at,
             CASE WHEN deleted_at IS NULL THEN 'active' ELSE 'inactive' END as status
      FROM users
      ORDER BY created_at DESC
    `;

    try {
      const [rows] = await db.execute(query);
      return rows.map((row) => {
        // Create a user object with the status field
        const user = new User(row);
        // Add status to the user object
        user.status = row.status;
        return user;
      });
    } catch (error) {
      // If it's a connection error, return empty array
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while fetching all users");
        return [];
      }
      throw error;
    }
  }

  // Update user
  static async update(id, userData) {
    const { username, email, phone, address, role } = userData;
    const updatedAt = new Date();

    const query = `
      UPDATE users
      SET username = ?, email = ?, phone = ?, address = ?, role = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `;

    try {
      const [result] = await db.execute(query, [
        username,
        email,
        phone,
        address,
        role,
        updatedAt,
        id,
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      // If it's a connection error, return false
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while updating user");
        return false;
      }
      throw error;
    }
  }

  // Update user password
  static async updatePassword(id, hashedPassword) {
    const updatedAt = new Date();

    const query = `
      UPDATE users
      SET password = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `;

    try {
      const [result] = await db.execute(query, [hashedPassword, updatedAt, id]);
      return result.affectedRows > 0;
    } catch (error) {
      // If it's a connection error, return false
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while updating user password"
        );
        return false;
      }
      throw error;
    }
  }

  // Soft delete user
  static async softDelete(id) {
    const deletedAt = new Date();

    const query = `
      UPDATE users
      SET deleted_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `;

    try {
      const [result] = await db.execute(query, [deletedAt, id]);
      return result.affectedRows > 0;
    } catch (error) {
      // If it's a connection error, return false
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while deleting user");
        return false;
      }
      throw error;
    }
  }
}

module.exports = UserRepository;
