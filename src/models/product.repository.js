const db = require("../config/db.config");
const Product = require("./Product.model");

class ProductRepository {
  // Create a new product
  static async create(productData) {
    const {
      name,
      description,
      price,
      discount_percentage,
      category,
      size,
      quantity,
      image, // Add image parameter
    } = productData;
    const createdAt = new Date();
    const updatedAt = new Date();

    const query = `
      INSERT INTO products (name, description, price, discount_percentage, category, size, quantity, image, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [
        name,
        description,
        price,
        discount_percentage || 0,
        category,
        size,
        quantity,
        JSON.stringify(image || []), // Store images as JSON array
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

  // Find product by ID
  static async findById(id) {
    const query = `
      SELECT id, name, description, price, discount_percentage, category, size, quantity, image, created_at, updated_at, deleted_at
      FROM products
      WHERE id = ? AND deleted_at IS NULL
    `;

    try {
      const [rows] = await db.execute(query, [id]);
      if (rows.length === 0) return null;

      // Parse images JSON
      const productData = { ...rows[0] };
      if (productData.image) {
        try {
          productData.image = JSON.parse(productData.image);
        } catch (e) {
          // If parsing fails, keep as string
          productData.image = [productData.image];
        }
      }

      return new Product(productData);
    } catch (error) {
      // If it's a connection error, return null
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while finding product by ID");
        return null;
      }
      throw error;
    }
  }

  // Get all products (excluding deleted ones)
  static async findAll() {
    const query = `
      SELECT id, name, description, price, discount_percentage, category, size, quantity, image, created_at, updated_at
      FROM products
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    try {
      const [rows] = await db.execute(query);
      return rows.map((row) => {
        // Parse images JSON
        const productData = { ...row };
        if (productData.image) {
          try {
            productData.image = JSON.parse(productData.image);
          } catch (e) {
            // If parsing fails, keep as string
            productData.image = [productData.image];
          }
        }
        return new Product(productData);
      });
    } catch (error) {
      // If it's a connection error, return empty array
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while fetching all products");
        return [];
      }
      throw error;
    }
  }

  // Update product
  static async update(id, productData) {
    const allowedFields = [
      "name",
      "description",
      "price",
      "discount_percentage",
      "category",
      "size",
      "quantity",
      "image",
    ];
    const updates = [];
    const values = [];

    // Build dynamic query based on provided fields
    for (const field of allowedFields) {
      if (productData[field] !== undefined) {
        if (field === "image") {
          // Handle images as JSON array
          updates.push(`${field} = ?`);
          values.push(JSON.stringify(productData[field] || []));
        } else {
          updates.push(`${field} = ?`);
          values.push(productData[field]);
        }
      }
    }

    // Always update updated_at
    updates.push("updated_at = ?");
    values.push(new Date());

    // Add id to values
    values.push(id);

    if (updates.length === 1) {
      // Only updated_at
      return false; // Nothing to update
    }

    const query = `
      UPDATE products
      SET ${updates.join(", ")}
      WHERE id = ? AND deleted_at IS NULL
    `;

    try {
      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      // If it's a connection error, return false
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while updating product");
        return false;
      }
      throw error;
    }
  }

  // Soft delete product
  static async softDelete(id) {
    const deletedAt = new Date();

    const query = `
      UPDATE products
      SET deleted_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `;

    try {
      const [result] = await db.execute(query, [deletedAt, id]);
      return result.affectedRows > 0;
    } catch (error) {
      // If it's a connection error, return false
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error("Database connection failed while deleting product");
        return false;
      }
      throw error;
    }
  }
}

module.exports = ProductRepository;
