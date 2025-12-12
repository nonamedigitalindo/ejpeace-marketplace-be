const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserRepository = require("../models/user.repository");
const User = require("../models/User.model");

const getAllUsers = async () => {
  try {
    const users = await UserRepository.findAll();
    return users.map((user) => user.toJSON());
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve users: " + error.message);
  }
};

const getUserById = async (id) => {
  try {
    const user = await UserRepository.findById(id);
    if (!user) {
      return null;
    }
    return user.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve user: " + error.message);
  }
};

const createUser = async (userData) => {
  try {
    // Validate that userData exists
    if (!userData) {
      throw new Error("User data is required");
    }

    // Validate required fields
    if (!userData.email) {
      throw new Error("Email is required");
    }

    if (!userData.username) {
      throw new Error("Username is required");
    }

    if (!userData.password) {
      throw new Error("Password is required");
    }

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create user object
    const user = new User({
      username: userData.username,
      email: userData.email,
      phone: userData.phone || null, // Add phone attribute
      address: userData.address || null, // Add address attribute
      password: hashedPassword,
      role: userData.role || "user", // Default to 'user' if not provided
    });

    // Validate user data
    const validationErrors = user.validate();
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }

    // Save user to database
    const userId = await UserRepository.create({
      username: user.username,
      email: user.email,
      phone: user.phone, // Add phone attribute
      address: user.address, // Add address attribute
      password: user.password,
      role: user.role,
    });

    // Return user data without password
    return {
      id: userId,
      username: user.username,
      email: user.email,
      phone: user.phone, // Add phone attribute
      address: user.address, // Add address attribute
      role: user.role,
      created_at: user.created_at,
    };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to create user: " + error.message);
  }
};

const loginUser = async (email, password) => {
  try {
    // Find user by email
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    // Return user data and token
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone, // Add phone attribute
        address: user.address, // Add address attribute
        role: user.role,
      },
    };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Login failed: " + error.message);
  }
};

const updateUser = async (id, userData) => {
  try {
    // Validate that userData exists
    if (!userData) {
      throw new Error("User data is required");
    }

    // Check if user exists
    const existingUser = await UserRepository.findById(id);
    if (!existingUser) {
      throw new Error("User not found");
    }

    // Create user object for validation
    const user = new User({
      ...existingUser,
      ...userData,
    });

    // Validate user data
    const validationErrors = user.validate();
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }

    // Update user
    const updated = await UserRepository.update(id, {
      username: user.username,
      email: user.email,
      phone: user.phone, // Add phone attribute
      address: user.address, // Add address attribute
      role: user.role,
    });
    if (!updated) {
      throw new Error("Failed to update user");
    }

    // Return updated user
    const updatedUser = await UserRepository.findById(id);
    return updatedUser.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to update user: " + error.message);
  }
};

const changeUserPassword = async (id, currentPassword, newPassword) => {
  try {
    // Validate inputs
    if (!currentPassword || !newPassword) {
      throw new Error("Current password and new password are required");
    }

    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    // Check if user exists
    const existingUser = await UserRepository.findById(id);
    if (!existingUser) {
      throw new Error("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      existingUser.password
    );
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const updated = await UserRepository.updatePassword(id, hashedNewPassword);
    if (!updated) {
      throw new Error("Failed to update password");
    }

    return { message: "Password updated successfully" };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to change password: " + error.message);
  }
};

const deleteUser = async (id) => {
  try {
    // Check if user exists
    const existingUser = await UserRepository.findById(id);
    if (!existingUser) {
      throw new Error("User not found");
    }

    // Soft delete user
    const deleted = await UserRepository.softDelete(id);
    if (!deleted) {
      throw new Error("Failed to delete user");
    }

    return { message: "User deleted successfully" };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to delete user: " + error.message);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  loginUser,
  updateUser,
  changeUserPassword, // Export the new function
  deleteUser,
};
