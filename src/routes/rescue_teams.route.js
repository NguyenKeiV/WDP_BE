const express = require("express");
const RescueTeamController = require("../controllers/rescue_teams");
const {
  requireAdmin,
  requireAdminOrCoordinator,
} = require("../middlewares/auth");
const router = express.Router();

// Get available teams (Coordinator/Admin)
// This is used when coordinator wants to see which teams they can assign
router.get(
  "/available",
  requireAdminOrCoordinator,
  RescueTeamController.getAvailableTeams,
);

// Get all teams with filters (Coordinator/Admin)
router.get("/", requireAdminOrCoordinator, RescueTeamController.getAllTeams);

// Get team by ID (Coordinator/Admin)
router.get("/:id", requireAdminOrCoordinator, RescueTeamController.getTeamById);

// Create new team (Admin only)
router.post("/", requireAdmin, RescueTeamController.createTeam);

// Update team (Admin/Coordinator)
router.put("/:id", requireAdminOrCoordinator, RescueTeamController.updateTeam);

// Delete team (Admin only)
router.delete("/:id", requireAdmin, RescueTeamController.deleteTeam);

module.exports = router;
