const express = require("express");
const router = express.Router();

// Import middleware
const { authenticate } = require("../middleware/auth.middleware");

// Import controllers
const userController = require("../controllers/user.controller");

// Public routes
router.post("/register", userController.register);
router.post("/login", userController.login);

// Protected routes (require authentication)
router.put("/change-password/:id", authenticate, userController.changePassword);

module.exports = router;
