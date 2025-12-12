const express = require("express");
const router = express.Router();

// Import controllers
const userController = require("../controllers/user.controller");

// Import middleware
const { authenticate, authorize } = require("../middleware/auth.middleware");

// Protected routes
router.get("/", authenticate, userController.getAllUsers);
router.get("/me", authenticate, userController.getMe); // Add route for current user
router.get("/:id", authenticate, userController.getUserById);
router.put("/me", authenticate, userController.updateMe); // Add route for updating current user
router.put("/:id", authenticate, userController.updateUser);
router.delete("/:id", authenticate, userController.deleteUser);

module.exports = router;
