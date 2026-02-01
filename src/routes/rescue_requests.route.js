const express = require("express");
const RescueRequestController = require("../controllers/rescue_requests");
const {
  optionalAuth,
  requireAuth,
  requireAdminOrCoordinator,
} = require("../middlewares/auth");
const router = express.Router();

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Get statistics (must be before /:id route)
router.get("/stats/summary", RescueRequestController.getStatistics);

// Public routes (optional authentication)
// Get all rescue requests (with filters) - optional auth to show user's own requests
router.get("/", optionalAuth, RescueRequestController.getAllRescueRequests);

// Anyone can create a rescue request, with or without login
router.post("/", optionalAuth, RescueRequestController.createRescueRequest);

// Get rescue request by ID
router.get("/:id", RescueRequestController.getRescueRequestById);

// Protected routes - Coordinator/Admin only
// Approve rescue request (status: new -> pending_verification)
router.post(
  "/:id/approve",
  requireAdminOrCoordinator,
  RescueRequestController.approveRescueRequest,
);

// Reject rescue request (status: new -> rejected)
router.post(
  "/:id/reject",
  requireAdminOrCoordinator,
  RescueRequestController.rejectRescueRequest,
);

// Update rescue request (admin/volunteer only) - should use requireAuth
router.put("/:id", requireAuth, RescueRequestController.updateRescueRequest);

// Delete rescue request (admin only) - should use requireAuth + requireAdmin
router.delete("/:id", requireAuth, RescueRequestController.deleteRescueRequest);

module.exports = router;
