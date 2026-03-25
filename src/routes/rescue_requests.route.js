const express = require("express");
const RescueRequestController = require("../controllers/rescue_requests");
const {
  optionalAuth,
  requireAuth,
  requireAdminOrCoordinator,
  requireRescueTeam,
} = require("../middlewares/auth");

const router = express.Router();

router.get("/stats/summary", RescueRequestController.getStatistics);
router.get(
  "/stats/tactical-map",
  RescueRequestController.getTacticalMapStats,
);
router.get(
  "/my-team-missions",
  requireRescueTeam,
  RescueRequestController.getMyTeamMissions,
);
router.get("/", optionalAuth, RescueRequestController.getAllRescueRequests);
router.post("/", optionalAuth, RescueRequestController.createRescueRequest);
router.post("/link-to-me", requireAuth, RescueRequestController.linkToMe);
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

// THÊM MỚI: Team xác nhận / từ chối nhiệm vụ
router.post(
  "/:id/team-accept",
  requireRescueTeam,
  RescueRequestController.teamAcceptMission,
);
router.post(
  "/:id/team-reject",
  requireRescueTeam,
  RescueRequestController.teamRejectMission,
);

// Team báo cáo đã/không thực hiện nhiệm vụ để coordinator xác nhận
router.post(
  "/:id/team-report-execution",
  requireRescueTeam,
  RescueRequestController.teamReportExecution,
);

// Coordinator/Admin xác nhận báo cáo thực hiện của team
router.post(
  "/:id/confirm-execution",
  requireAdminOrCoordinator,
  RescueRequestController.confirmTeamExecution,
);

router.post(
  "/:id/complete",
  requireAdminOrCoordinator,
  RescueRequestController.completeMission,
);
router.post(
  "/:id/citizen-confirm-rescue",
  requireAuth,
  RescueRequestController.citizenConfirmRescue,
);
router.put("/:id", requireAuth, RescueRequestController.updateRescueRequest);
router.delete("/:id", requireAuth, RescueRequestController.deleteRescueRequest);

module.exports = router;
