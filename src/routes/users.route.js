const express = require("express");
const UserController = require("../controllers/users");
const { requireAuth, requireAdmin } = require("../middlewares/auth");
const router = express.Router();

// Public routes
router.post("/login", UserController.login);
router.post("/register", UserController.createUser);

// Admin routes
router.post("/admin/team-leaders", requireAdmin, UserController.createTeamLeaderAccount);

// Protected routes (these would need authentication middleware)
router.get("/", UserController.getAllUsers);
router.get("/profile", UserController.getProfile);
router.put("/push-token", requireAuth, UserController.updatePushToken);
router.put("/change-password", requireAuth, UserController.changePassword);
router.get("/:id", UserController.getUserById);
router.put("/:id", UserController.updateUser);
router.delete("/:id", UserController.deleteUser);

module.exports = router;
