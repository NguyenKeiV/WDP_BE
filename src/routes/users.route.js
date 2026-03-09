const express = require("express");
const UserController = require("../controllers/users");
const { requireAuth } = require("../middlewares/auth");
const router = express.Router();

// Public routes
router.post("/login", UserController.login);
router.post("/register", UserController.createUser);

// Protected routes (these would need authentication middleware)
router.get("/", UserController.getAllUsers);
router.get("/profile", UserController.getProfile);
router.put("/push-token", requireAuth, UserController.updatePushToken);
router.get("/:id", UserController.getUserById);
router.put("/:id", UserController.updateUser);
router.delete("/:id", UserController.deleteUser);

module.exports = router;
