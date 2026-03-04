const express = require("express");
const RescueTeamController = require("../controllers/rescue_teams");
const {
  requireAdminOrCoordinator,
  requireManager,
} = require("../middlewares/auth");
const router = express.Router();

// Get available teams (Coordinator/Admin/Manager)
router.get(
  "/available",
  requireAdminOrCoordinator,
  RescueTeamController.getAvailableTeams,
);

// Get all teams (Coordinator/Admin/Manager)
router.get("/", requireAdminOrCoordinator, RescueTeamController.getAllTeams);

// Get team by ID (Coordinator/Admin/Manager)
router.get("/:id", requireAdminOrCoordinator, RescueTeamController.getTeamById);

// Create new team (Manager only)
router.post("/", requireManager, RescueTeamController.createTeam);

// Update team (Manager only)
router.put("/:id", requireManager, RescueTeamController.updateTeam);

// Delete team (Manager only)
router.delete("/:id", requireManager, RescueTeamController.deleteTeam);

module.exports = router;
