const express = require("express");
const RescueRequestController = require("../controllers/rescue_requests");
const {
  optionalAuth,
  requireAuth,
  requireAdminOrCoordinator,
  requireRescueTeam,
  requireAdminOrCoordinatorOrRescueTeam,
} = require("../middlewares/auth");
const router = express.Router();

// Stats (phải trước /:id)
router.get("/stats/summary", RescueRequestController.getStatistics);

// Team leader xem nhiệm vụ (phải trước /:id)
router.get(
  "/my-team-missions",
  requireRescueTeam,
  RescueRequestController.getMyTeamMissions,
);

// Public routes
router.get("/", optionalAuth, RescueRequestController.getAllRescueRequests);
router.post("/", optionalAuth, RescueRequestController.createRescueRequest);

// Get by ID (phải sau tất cả route cụ thể)
router.get("/:id", RescueRequestController.getRescueRequestById);

// Coordinator/Admin only
router.post(
  "/:id/approve",
  requireAdminOrCoordinator,
  RescueRequestController.approveRescueRequest,
);

router.post(
  "/:id/reject",
  requireAdminOrCoordinator,
  RescueRequestController.rejectRescueRequest,
);

router.post(
  "/:id/assign-team",
  requireAdminOrCoordinator,
  RescueRequestController.assignTeam,
);

router.post(
  "/:id/complete",
  requireAdminOrCoordinatorOrRescueTeam,
  RescueRequestController.completeMission,
);

router.put("/:id", requireAuth, RescueRequestController.updateRescueRequest);
router.delete("/:id", requireAuth, RescueRequestController.deleteRescueRequest);

module.exports = router;
