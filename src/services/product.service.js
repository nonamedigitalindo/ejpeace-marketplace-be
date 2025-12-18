const ProductRepository = require("../models/product.repository");
const { imageExists } = require("../middleware/image.middleware");
const Product = require("../models/Product.model");

const getAllProducts = async () => {
  try {
    const products = await ProductRepository.findAll();

    // Convert products to JSON - return images directly from database
    const validProducts = products.map((product) => {
      return product.toJSON();
    });

    return validProducts;
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve products: " + error.message);
  }
};

const getProductById = async (id) => {
  try {
    const product = await ProductRepository.findById(id);

    if (!product) {
      return null;
    }

    // Return product with images directly from database
    return product.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve product: " + error.message);
  }
};

const createProduct = async (productData) => {
  try {
    // Validate that productData exists
    if (!productData) {
      throw new Error("Product data is required");
    }

    // Create product object
    const product = new Product(productData);

    // Validate product data
    const validationErrors = product.validate();
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }

    // Save product to database
    const productId = await ProductRepository.create({
      name: product.name,
      description: product.description,
      price: product.price,
      discount_percentage: product.discount_percentage,
      category: product.category,
      size: product.size,
      quantity: product.quantity,
      image: product.image, // Add images to the data sent to repository
    });

    // Return product data
    return {
      id: productId,
      name: product.name,
      description: product.description,
      price: product.price,
      discount_percentage: product.discount_percentage,
      discounted_price: product.getDiscountedPrice(),
      category: product.category,
      size: product.size,
      quantity: product.quantity,
      images: product.image, // Include images in the response
      created_at: product.created_at,
    };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to create product: " + error.message);
  }
};

const updateProduct = async (id, productData) => {
  try {
    // Validate that productData exists
    if (!productData) {
      throw new Error("Product data is required");
    }

    // Check if product exists
    const existingProduct = await ProductRepository.findById(id);
    if (!existingProduct) {
      throw new Error("Product not found");
    }

    // Create product object for validation
    const product = new Product(productData);

    // Validate product data
    const validationErrors = product.validate();
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }

    // --- DELETE OLD IMAGES IF NEW IMAGES PROVIDED ---
    if (productData.image && Array.isArray(productData.image)) {
      try {
        const fs = require("fs");
        const path = require("path");

        const oldImages = existingProduct.images || [];

        oldImages.forEach((imageUrl) => {
          // Extract filename from URL
          // URL format: http://domain/api/v1/uploads/filename.ext
          const filename = imageUrl.split("/").pop();
          if (filename) {
            const filePath = path.join(__dirname, "../../uploads", filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`[ProductService] Deleted old image: ${filePath}`);
            }
          }
        });
      } catch (err) {
        console.error("[ProductService] Error deleting old images:", err);
        // Continue with update even if deletion fails
      }
    }
    // ------------------------------------------------

    const updatePayload = {
      name: product.name,
      description: product.description,
      price: product.price,
      discount_percentage: product.discount_percentage,
      category: product.category,
      size: product.size,
      quantity: product.quantity,
    };

    // Only update image if it's provided in the input
    if (productData.image !== undefined) {
      updatePayload.image = product.image;
    }

    // Update product
    const updated = await ProductRepository.update(id, updatePayload);
    if (!updated) {
      throw new Error("Failed to update product");
    }

    // Return updated product
    const updatedProduct = await ProductRepository.findById(id);
    return updatedProduct.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to update product: " + error.message);
  }
};

const deleteProduct = async (id) => {
  try {
    // Check if product exists
    const existingProduct = await ProductRepository.findById(id);
    if (!existingProduct) {
      throw new Error("Product not found");
    }

    // Soft delete product
    const deleted = await ProductRepository.softDelete(id);
    if (!deleted) {
      throw new Error("Failed to delete product");
    }

    return { message: "Product deleted successfully" };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to delete product: " + error.message);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
