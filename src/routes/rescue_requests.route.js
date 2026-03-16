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

router.get("/stats/summary", RescueRequestController.getStatistics);
router.get(
  "/my-team-missions",
  requireRescueTeam,
  RescueRequestController.getMyTeamMissions,
);
router.get("/", optionalAuth, RescueRequestController.getAllRescueRequests);
router.post("/", optionalAuth, RescueRequestController.createRescueRequest);
router.post(
  "/link-to-me",
  requireAuth,
  RescueRequestController.linkToMe,
);
router.get("/:id", RescueRequestController.getRescueRequestById);
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
