const express = require("express");
const RescueRequestController = require("../controllers/rescue_requests");
const { optionalAuth } = require("../middlewares/auth");
const router = express.Router();

// Public routes (optional authentication)
// Anyone can create a rescue request, with or without login
router.post("/", optionalAuth, RescueRequestController.createRescueRequest);

// Get all rescue requests (with filters) - optional auth to show user's own requests
router.get("/", optionalAuth, RescueRequestController.getAllRescueRequests);

// ✅ ĐÚNG - Route cụ thể phải đứng TRƯỚC route có param
router.get("/stats/summary", RescueRequestController.getStatistics);
router.get("/:id", RescueRequestController.getRescueRequestById);

// Protected routes (should add authentication middleware later)
// Update rescue request (admin/volunteer only)
router.put("/:id", RescueRequestController.updateRescueRequest);

// Delete rescue request (admin only)
router.delete("/:id", RescueRequestController.deleteRescueRequest);

module.exports = router;
