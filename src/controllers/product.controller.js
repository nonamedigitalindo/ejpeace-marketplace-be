const productService = require("../services/product.service");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  serviceUnavailableResponse,
  validationErrorResponse,
} = require("../utils/response.util");

const getAllProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    return successResponse(res, "Products retrieved successfully", products);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve products");
    }
    return errorResponse(res, "Failed to retrieve products", error.message);
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);

    if (!product) {
      return notFoundResponse(res, "Product not found");
    }

    return successResponse(res, "Product retrieved successfully", product);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve product");
    }
    return errorResponse(res, "Failed to retrieve product", error.message);
  }
};

const createProduct = async (req, res) => {
  try {
    // Debug logging
    console.log("=== Create Product Debug ===");
    console.log("Request files:", req.files);
    console.log("Request body:", req.body);
    console.log("Request file (single):", req.file);

    // Validate that request body exists
    if (!req.body) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Prepare product data
    const productData = { ...req.body };

    // Handle files from different possible field names
    let imageFiles = [];
    if (req.files && Array.isArray(req.files)) {
      // Standard array upload
      imageFiles = req.files;
    } else if (
      req.files &&
      req.files.images &&
      Array.isArray(req.files.images)
    ) {
      // Nested files object (from field name "images")
      imageFiles = req.files.images;
    } else if (req.files && req.files.image && Array.isArray(req.files.image)) {
      // Nested files object (from field name "image")
      imageFiles = req.files.image;
    } else if (req.file) {
      // Single file upload
      imageFiles = [req.file];
    }

    console.log("Processed image files:", imageFiles.length);

    // If files were uploaded, add the file paths to product data
    if (imageFiles.length > 0) {
      // Construct the URLs for the uploaded images using HTTPS
      const baseUrl =
        process.env.NODE_ENV === "production"
          ? "https://212.85.27.163"
          : `http://localhost:${process.env.PORT || 3000}`;

      const imageUrls = imageFiles.map(
        (file) => `${baseUrl}/api/v1/uploads/${file.filename}`
      );
      productData.image = imageUrls;
      console.log("Image URLs set:", imageUrls);
    } else {
      console.log("No files uploaded");
    }

    const product = await productService.createProduct(productData);

    return successResponse(res, "Product created successfully", product, 201);
  } catch (error) {
    console.error("Create product error:", error);
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to create product");
    }
    return errorResponse(res, "Failed to create product", error.message, 400);
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Debug logging
    console.log("=== Update Product Debug ===");
    console.log("Product ID:", id);
    console.log("Request files:", req.files);
    console.log("Request body:", req.body);
    console.log("Request file (single):", req.file);

    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      // If no body and no file, return error
      let hasFiles = false;
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        hasFiles = true;
      } else if (
        req.files &&
        req.files.images &&
        Array.isArray(req.files.images) &&
        req.files.images.length > 0
      ) {
        hasFiles = true;
      } else if (
        req.files &&
        req.files.image &&
        Array.isArray(req.files.image) &&
        req.files.image.length > 0
      ) {
        hasFiles = true;
      } else if (req.file) {
        hasFiles = true;
      }

      if (!hasFiles) {
        return validationErrorResponse(res, [
          "Request body or file is required",
        ]);
      }
    }

    // Prepare update data
    const updateData = { ...req.body };

    // Handle files from different possible field names
    let imageFiles = [];
    if (req.files && Array.isArray(req.files)) {
      // Standard array upload
      imageFiles = req.files;
    } else if (
      req.files &&
      req.files.images &&
      Array.isArray(req.files.images)
    ) {
      // Nested files object (from field name "images")
      imageFiles = req.files.images;
    } else if (req.files && req.files.image && Array.isArray(req.files.image)) {
      // Nested files object (from field name "image")
      imageFiles = req.files.image;
    } else if (req.file) {
      // Single file upload
      imageFiles = [req.file];
    }

    console.log("Processed image files for update:", imageFiles.length);

    // If files were uploaded, add the file paths to update data
    if (imageFiles.length > 0) {
      // Construct the URLs for the uploaded images using HTTPS
      const baseUrl =
        process.env.NODE_ENV === "production"
          ? "https://212.85.27.163"
          : `http://localhost:${process.env.PORT || 3000}`;

      const imageUrls = imageFiles.map(
        (file) => `${baseUrl}/api/v1/uploads/${file.filename}`
      );
      updateData.image = imageUrls;
      console.log("Update image URLs set:", imageUrls);
    } else {
      console.log("No files uploaded for update");
    }

    const product = await productService.updateProduct(id, updateData);

    if (!product) {
      return notFoundResponse(res, "Product not found");
    }

    return successResponse(res, "Product updated successfully", product);
  } catch (error) {
    console.error("Update product error:", error);
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to update product");
    }
    return errorResponse(res, "Failed to update product", error.message, 400);
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await productService.deleteProduct(id);

    if (!result) {
      return notFoundResponse(res, "Product not found");
    }

    return successResponse(res, "Product deleted successfully", null);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to delete product");
    }
    return errorResponse(res, "Failed to delete product", error.message, 400);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
