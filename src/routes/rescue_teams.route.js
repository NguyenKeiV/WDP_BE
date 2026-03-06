const express = require("express");
const RescueTeamController = require("../controllers/rescue_teams");
const {
  requireAdminOrCoordinator,
  requireManager,
} = require("../middlewares/auth");

const requireAdminOrCoordinatorOrManager = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, message: "No authentication token provided" });
    }
    const token = authHeader.replace("Bearer ", "");
    const UserService = require("../services/user");
    const user = await UserService.verifyToken(token);
    req.user = user;
    if (!["admin", "coordinator", "manager"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  } catch (error) {
    res
      .status(401)
      .json({
        success: false,
        message: "Authentication failed",
        error: error.message,
      });
  }
};

const router = express.Router();

// Get available teams (Coordinator/Admin/Manager)
router.get(
  "/available",
  requireAdminOrCoordinatorOrManager,
  RescueTeamController.getAvailableTeams,
);

// Get all teams (Coordinator/Admin/Manager)
router.get(
  "/",
  requireAdminOrCoordinatorOrManager,
  RescueTeamController.getAllTeams,
);

// Get team by ID (Coordinator/Admin/Manager)
router.get(
  "/:id",
  requireAdminOrCoordinatorOrManager,
  RescueTeamController.getTeamById,
);

// Create team (Manager only)
router.post("/", requireManager, RescueTeamController.createTeam);

// Update team (Manager only)
router.put("/:id", requireManager, RescueTeamController.updateTeam);

// Delete team (Manager only)
router.delete("/:id", requireManager, RescueTeamController.deleteTeam);

module.exports = router;
