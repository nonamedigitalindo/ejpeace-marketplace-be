const cartService = require("../services/cart.service");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  serviceUnavailableResponse,
  validationErrorResponse,
} = require("../utils/response.util");

const addItemToCart = async (req, res) => {
  try {
    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    const cartData = {
      ...req.body,
      user_id: req.user.id, // Get user ID from authenticated user
    };

    const cartItem = await cartService.addItemToCart(cartData);

    return successResponse(
      res,
      "Item added to cart successfully",
      cartItem,
      201
    );
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to add item to cart");
    }
    return errorResponse(res, "Failed to add item to cart", error.message, 400);
  }
};

const getCartItems = async (req, res) => {
  try {
    const user_id = req.user.id; // Get user ID from authenticated user
    const cartItems = await cartService.getCartItems(user_id);

    return successResponse(res, "Cart items retrieved successfully", cartItems);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve cart items");
    }
    return errorResponse(res, "Failed to retrieve cart items", error.message);
  }
};

// Add this new function to get a specific cart item by ID
const getCartItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id; // Get user ID from authenticated user

    const cartItem = await cartService.getCartItemById(id, user_id);

    if (!cartItem) {
      return notFoundResponse(res, "Cart item not found");
    }

    return successResponse(res, "Cart item retrieved successfully", cartItem);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve cart item");
    }
    return errorResponse(res, "Failed to retrieve cart item", error.message);
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id; // Get user ID from authenticated user
    const { quantity } = req.body;

    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Validate quantity
    if (quantity === undefined || quantity === null) {
      return validationErrorResponse(res, ["Quantity is required"]);
    }

    if (isNaN(quantity) || quantity <= 0) {
      return validationErrorResponse(res, [
        "Quantity must be a positive number",
      ]);
    }

    const updatedItem = await cartService.updateCartItem(id, user_id, quantity);

    return successResponse(res, "Cart item updated successfully", updatedItem);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to update cart item");
    }
    return errorResponse(res, "Failed to update cart item", error.message, 400);
  }
};

const removeItemFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id; // Get user ID from authenticated user

    const result = await cartService.removeItemFromCart(id, user_id);

    return successResponse(res, result.message);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to remove item from cart");
    }
    return errorResponse(
      res,
      "Failed to remove item from cart",
      error.message,
      400
    );
  }
};

const clearUserCart = async (req, res) => {
  try {
    const user_id = req.user.id; // Get user ID from authenticated user

    const result = await cartService.clearUserCart(user_id);

    return successResponse(res, result.message, {
      removed_count: result.removed_count,
    });
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to clear cart");
    }
    return errorResponse(res, "Failed to clear cart", error.message);
  }
};

module.exports = {
  addItemToCart,
  getCartItems,
  getCartItemById, // Export the new function
  updateCartItem,
  removeItemFromCart,
  clearUserCart,
};
