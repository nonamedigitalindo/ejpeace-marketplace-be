const CartRepository = require("../models/cart.repository");
const Cart = require("../models/Cart.model");
const ProductRepository = require("../models/product.repository");

const addItemToCart = async (cartData) => {
  try {
    // Validate that cartData exists
    if (!cartData) {
      throw new Error("Cart data is required");
    }

    // Validate required fields
    if (!cartData.user_id) {
      throw new Error("User ID is required");
    }

    if (!cartData.product_id) {
      throw new Error("Product ID is required");
    }

    if (
      !cartData.quantity ||
      isNaN(cartData.quantity) ||
      cartData.quantity <= 0
    ) {
      throw new Error("Valid quantity is required");
    }

    // Check if product exists and is not deleted
    const product = await ProductRepository.findById(cartData.product_id);
    if (!product) {
      throw new Error("Product not found");
    }

    // Create cart object
    const cartItem = new Cart(cartData);

    // Validate cart data
    const validationErrors = cartItem.validate();
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }

    // Add item to cart
    const cartItemId = await CartRepository.addItemToCart({
      user_id: cartItem.user_id,
      product_id: cartItem.product_id,
      quantity: cartItem.quantity,
    });

    // Return cart item data
    const addedItem = await CartRepository.findCartItemById(
      cartItemId,
      cartItem.user_id
    );
    return addedItem.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to add item to cart: " + error.message);
  }
};

const getCartItems = async (user_id) => {
  try {
    const cartItems = await CartRepository.getCartItemsByUserId(user_id);
    return cartItems.map((item) => item.toJSON());
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve cart items: " + error.message);
  }
};

// Add this new function to get a specific cart item by ID
const getCartItemById = async (id, user_id) => {
  try {
    const cartItem = await CartRepository.findCartItemById(id, user_id);
    if (!cartItem) {
      return null;
    }
    return cartItem.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve cart item: " + error.message);
  }
};

const updateCartItem = async (id, user_id, quantity) => {
  try {
    // Check if cart item exists
    const existingItem = await CartRepository.findCartItemById(id, user_id);
    if (!existingItem) {
      throw new Error("Cart item not found");
    }

    // Validate quantity
    if (!quantity || isNaN(quantity) || quantity <= 0) {
      throw new Error("Valid quantity is required");
    }

    // Update cart item
    const updated = await CartRepository.updateCartItem(id, user_id, quantity);
    if (!updated) {
      throw new Error("Failed to update cart item");
    }

    // Return updated cart item
    const updatedItem = await CartRepository.findCartItemById(id, user_id);
    return updatedItem.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to update cart item: " + error.message);
  }
};

const removeItemFromCart = async (id, user_id) => {
  try {
    // Check if cart item exists
    const existingItem = await CartRepository.findCartItemById(id, user_id);
    if (!existingItem) {
      throw new Error("Cart item not found");
    }

    // Remove item from cart
    const removed = await CartRepository.removeItemFromCart(id, user_id);
    if (!removed) {
      throw new Error("Failed to remove item from cart");
    }

    return { message: "Item removed from cart successfully" };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to remove item from cart: " + error.message);
  }
};

const clearUserCart = async (user_id) => {
  try {
    const removedCount = await CartRepository.clearUserCart(user_id);
    return {
      message: `Cart cleared successfully. Removed ${removedCount} items.`,
      removed_count: removedCount,
    };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to clear cart: " + error.message);
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
