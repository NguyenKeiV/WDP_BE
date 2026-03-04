const express = require("express");
const SupplyController = require("../controllers/supplies");
const {
  requireAdminOrCoordinator,
  requireManager,
} = require("../middlewares/auth");
const router = express.Router();

// Get all supplies (Coordinator/Admin/Manager)
router.get("/", requireAdminOrCoordinator, SupplyController.getAllSupplies);

// Get distributions log
router.get(
  "/distributions",
  requireAdminOrCoordinator,
  SupplyController.getDistributions,
);

// Get supply by ID
router.get("/:id", requireAdminOrCoordinator, SupplyController.getSupplyById);

// Create supply (Manager only)
router.post("/", requireManager, SupplyController.createSupply);

// Distribute supply to team (Manager only)
router.post(
  "/:id/distribute",
  requireManager,
  SupplyController.distributeSupply,
);

// Update supply (Manager only)
router.put("/:id", requireManager, SupplyController.updateSupply);

// Delete supply (Manager only)
router.delete("/:id", requireManager, SupplyController.deleteSupply);

module.exports = router;
