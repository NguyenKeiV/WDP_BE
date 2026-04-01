const express = require("express");
const VolunteerCampaignController = require("../controllers/volunteer_campaign");
const { requireAuth, requireManager } = require("../middlewares/auth");

const router = express.Router();

// --- Campaign CRUD (manager) ---
router.post("/", requireManager, VolunteerCampaignController.create);
router.get(
  "/",
  requireManager,
  VolunteerCampaignController.listForManager,
);
router.get("/:id", requireManager, VolunteerCampaignController.getById);
router.put("/:id", requireManager, VolunteerCampaignController.update);
router.patch("/:id/publish", requireManager, VolunteerCampaignController.publish);
router.patch("/:id/cancel", requireManager, VolunteerCampaignController.cancel);
router.patch("/:id/start", requireManager, VolunteerCampaignController.start);
router.patch("/:id/complete", requireManager, VolunteerCampaignController.complete);

// --- Approved volunteer lookup (manager) ---
router.get(
  "/volunteers/approved",
  requireManager,
  VolunteerCampaignController.getApprovedVolunteers,
);

// --- Invitation management (manager) ---
router.post(
  "/:id/invite",
  requireManager,
  VolunteerCampaignController.inviteVolunteers,
);
router.get(
  "/:id/stats",
  requireManager,
  VolunteerCampaignController.getCampaignStats,
);

// --- Citizen: respond to invitation ---
router.patch(
  "/invitations/:id/respond",
  requireAuth,
  VolunteerCampaignController.respondToInvitation,
);

// --- Citizen: list my invitations ---
router.get(
  "/invitations/me",
  requireAuth,
  VolunteerCampaignController.listMyInvitations,
);

module.exports = router;
