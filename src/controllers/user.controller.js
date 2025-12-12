const userService = require("../services/user.service");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serviceUnavailableResponse,
} = require("../utils/response.util");

const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    return successResponse(res, "Users retrieved successfully", users);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve users");
    }
    return errorResponse(res, "Failed to retrieve users", error.message);
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      return notFoundResponse(res, "User not found");
    }

    return successResponse(res, "User retrieved successfully", user);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve user");
    }
    return errorResponse(res, "Failed to retrieve user", error.message);
  }
};

const getMe = async (req, res) => {
  try {
    // Get user ID from the authenticated token
    const userId = req.user.id;
    const user = await userService.getUserById(userId);

    if (!user) {
      return notFoundResponse(res, "User not found");
    }

    return successResponse(res, "User retrieved successfully", user);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve user");
    }
    return errorResponse(res, "Failed to retrieve user", error.message);
  }
};

const register = async (req, res) => {
  try {
    const userData = req.body;

    // Validate that request body exists
    if (!userData || Object.keys(userData).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    const user = await userService.createUser(userData);

    return successResponse(res, "User registered successfully", user, 201);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to register user");
    }
    return errorResponse(res, "Failed to register user", error.message, 400);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return validationErrorResponse(res, ["Email and password are required"]);
    }

    // Authenticate user
    const { token, user } = await userService.loginUser(email, password);

    return successResponse(res, "Login successful", { token, user });
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Login failed");
    }
    return errorResponse(res, "Login failed", error.message, 401);
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = req.body;

    // Validate that request body exists
    if (!userData || Object.keys(userData).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Check if user is updating their own profile or has admin rights
    // For now, we'll allow any authenticated user to update (you may want to add authorization)

    const updatedUser = await userService.updateUser(id, userData);

    return successResponse(res, "User updated successfully", updatedUser);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to update user");
    }
    return errorResponse(res, "Failed to update user", error.message, 400);
  }
};

const updateMe = async (req, res) => {
  try {
    // Get user ID from the authenticated token
    const userId = req.user.id;
    const userData = req.body;

    // Validate that request body exists
    if (!userData || Object.keys(userData).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Allow user to update their own profile
    const updatedUser = await userService.updateUser(userId, userData);

    return successResponse(res, "User updated successfully", updatedUser);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to update user");
    }
    return errorResponse(res, "Failed to update user", error.message, 400);
  }
};

const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return validationErrorResponse(res, [
        "Current password and new password are required",
      ]);
    }

    const result = await userService.changeUserPassword(
      id,
      currentPassword,
      newPassword
    );

    return successResponse(res, result.message);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to change password");
    }
    // Handle specific error cases
    if (error.message.includes("Current password is incorrect")) {
      return errorResponse(
        res,
        "Failed to change password",
        error.message,
        401
      );
    }
    return errorResponse(res, "Failed to change password", error.message, 400);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is deleting their own profile or has admin rights
    // For now, we'll allow any authenticated user to delete (you may want to add authorization)

    const result = await userService.deleteUser(id);

    return successResponse(res, result.message);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to delete user");
    }
    return errorResponse(res, "Failed to delete user", error.message, 400);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getMe, // Export the new function
  register,
  login,
  updateUser,
  updateMe, // Export the new function
  changePassword,
  deleteUser,
};
