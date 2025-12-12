const db = require("../config/db.config");
const Cart = require("./Cart.model");

class CartRepository {
  // Add item to cart
  static async addItemToCart(cartData) {
    const { user_id, product_id, quantity } = cartData;
    const createdAt = new Date();
    const updatedAt = new Date();

    // First, check if the item already exists in the cart (and hasn't been purchased)
    const checkQuery = `
      SELECT id, quantity FROM cart 
      WHERE user_id = ? AND product_id = ? AND purchase_id IS NULL
    `;

    try {
      const [checkResult] = await db.execute(checkQuery, [user_id, product_id]);

      if (checkResult.length > 0) {
        // Item already exists, update the quantity
        const existingItemId = checkResult[0].id;
        const newQuantity = checkResult[0].quantity + quantity;

        const updateQuery = `
          UPDATE cart 
          SET quantity = ?, updated_at = ?
          WHERE id = ?
        `;

        const [updateResult] = await db.execute(updateQuery, [
          newQuantity,
          updatedAt,
          existingItemId,
        ]);
        return existingItemId;
      } else {
        // Item doesn't exist, insert new record
        const insertQuery = `
          INSERT INTO cart (user_id, product_id, quantity, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `;

        const [insertResult] = await db.execute(insertQuery, [
          user_id,
          product_id,
          quantity,
          createdAt,
          updatedAt,
        ]);
        return insertResult.insertId;
      }
    } catch (error) {
      // If it's a connection error, return a special error
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new Error("Database connection failed");
      }
      throw error;
    }
  }

  // Get cart items for a user
  static async getCartItemsByUserId(user_id) {
    console.log(`[CartRepository] Getting cart items for user_id: ${user_id}`);
    const query = `
      SELECT c.id, c.user_id, c.product_id, c.quantity, c.purchase_id, c.created_at, c.updated_at,
             p.name as product_name, p.price as product_price, p.description as product_description,
             p.category as product_category, p.size as product_size, p.discount_percentage, p.image as product_image
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ? AND p.deleted_at IS NULL AND c.purchase_id IS NULL
      ORDER BY c.created_at DESC
    `;

    try {
      console.log(`[CartRepository] Executing query with user_id: ${user_id}`);
      const [rows] = await db.execute(query, [user_id]);
      console.log(`[CartRepository] Query executed successfully`);
      console.log(
        `[CartRepository] Found ${rows.length} cart items for user_id: ${user_id}`
      );
      console.log(
        `[CartRepository] Cart items data:`,
        JSON.stringify(rows, null, 2)
      );
      return rows.map((row) => {
        // Parse images JSON
        const cartData = { ...row };
        if (cartData.product_image) {
          try {
            cartData.product_image = JSON.parse(cartData.product_image);
          } catch (e) {
            // If parsing fails, keep as string
            cartData.product_image = [cartData.product_image];
          }
        }
        return new Cart(cartData);
      });
    } catch (error) {
      // If it's a connection error, return empty array
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while fetching cart items");
        return [];
      }
      console.error(
        "[CartRepository] Error fetching cart items by user:",
        error
      );
      throw error;
    }
  }

  // Update cart item quantity
  static async updateCartItem(id, user_id, quantity) {
    const updatedAt = new Date();

    const query = `
      UPDATE cart
      SET quantity = ?, updated_at = ?
      WHERE id = ? AND user_id = ? AND purchase_id IS NULL
    `;

    try {
      const [result] = await db.execute(query, [
        quantity,
        updatedAt,
        id,
        user_id,
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      // If it's a connection error, return false
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while updating cart item");
        return false;
      }
      throw error;
    }
  }

  // Remove item from cart
  static async removeItemFromCart(id, user_id) {
    const query = `
      DELETE FROM cart
      WHERE id = ? AND user_id = ? AND purchase_id IS NULL
    `;

    try {
      const [result] = await db.execute(query, [id, user_id]);
      return result.affectedRows > 0;
    } catch (error) {
      // If it's a connection error, return false
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while removing cart item");
        return false;
      }
      throw error;
    }
  }

  // Clear user's cart
  static async clearUserCart(user_id) {
    const query = `
      DELETE FROM cart
      WHERE user_id = ? AND purchase_id IS NULL
    `;

    try {
      const [result] = await db.execute(query, [user_id]);
      return result.affectedRows;
    } catch (error) {
      // If it's a connection error, return 0
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while clearing cart");
        return 0;
      }
      throw error;
    }
  }

  // Get cart item by ID
  static async findCartItemById(id, user_id) {
    const query = `
      SELECT c.id, c.user_id, c.product_id, c.quantity, c.purchase_id, c.created_at, c.updated_at,
             p.name as product_name, p.price as product_price, p.description as product_description,
             p.category as product_category, p.size as product_size, p.discount_percentage, p.image as product_image
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.id = ? AND c.user_id = ? AND p.deleted_at IS NULL
    `;

    try {
      const [rows] = await db.execute(query, [id, user_id]);
      if (rows.length === 0) return null;
      // Parse images JSON
      const cartData = { ...rows[0] };
      if (cartData.product_image) {
        try {
          cartData.product_image = JSON.parse(cartData.product_image);
        } catch (e) {
          // If parsing fails, keep as string
          cartData.product_image = [cartData.product_image];
        }
      }
      return new Cart(cartData);
    } catch (error) {
      // If it's a connection error, return null
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while finding cart item by ID"
        );
        return null;
      }
      throw error;
    }
  }

  // Get cart items for a specific purchase
  static async getCartItemsByPurchaseId(purchase_id) {
    console.log(
      `[CartRepository] Getting cart items for purchase_id: ${purchase_id}`
    );
    const query = `
      SELECT c.id, c.user_id, c.product_id, c.quantity, c.purchase_id, c.created_at, c.updated_at,
             p.name as product_name, p.price as product_price, p.description as product_description, 
             p.category as product_category, p.size as product_size, p.discount_percentage, p.image as product_image
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.purchase_id = ? AND p.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `;

    try {
      console.log(
        `[CartRepository] Executing query with purchase_id: ${purchase_id}`
      );
      const [rows] = await db.execute(query, [purchase_id]);
      console.log(`[CartRepository] Query executed successfully`);
      console.log(
        `[CartRepository] Found ${rows.length} cart items for purchase_id: ${purchase_id}`
      );
      console.log(
        `[CartRepository] Cart items data:`,
        JSON.stringify(rows, null, 2)
      );
      return rows.map((row) => {
        // Parse images JSON
        const cartData = { ...row };
        if (cartData.product_image) {
          try {
            cartData.product_image = JSON.parse(cartData.product_image);
          } catch (e) {
            // If parsing fails, keep as string
            cartData.product_image = [cartData.product_image];
          }
        }
        return new Cart(cartData);
      });
    } catch (error) {
      // If it's a connection error, return empty array
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(
          "Database connection failed while fetching cart items by purchase"
        );
        return [];
      }
      console.error(
        "[CartRepository] Error fetching cart items by purchase:",
        error
      );
      throw error;
    }
  }
}

module.exports = CartRepository;
