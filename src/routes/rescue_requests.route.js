const express = require("express");
const RescueRequestController = require("../controllers/rescue_requests");
const router = express.Router();

// Public routes (no authentication required)
// Anyone can create a rescue request
router.post("/", RescueRequestController.createRescueRequest);

// Get all rescue requests (with filters)
router.get("/", RescueRequestController.getAllRescueRequests);

// Get rescue request by ID
router.get("/:id", RescueRequestController.getRescueRequestById);

// Get statistics
router.get("/stats/summary", RescueRequestController.getStatistics);

// Protected routes (should add authentication middleware later)
// Update rescue request (admin/volunteer only)
router.put("/:id", RescueRequestController.updateRescueRequest);

// Delete rescue request (admin only)
router.delete("/:id", RescueRequestController.deleteRescueRequest);

module.exports = router;
