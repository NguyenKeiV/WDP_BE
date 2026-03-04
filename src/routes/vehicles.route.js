const express = require("express");
const VehicleController = require("../controllers/vehicles");
const {
  requireAdminOrCoordinator,
  requireManager,
} = require("../middlewares/auth");
const router = express.Router();

// Get all vehicles (Coordinator/Admin/Manager)
router.get("/", requireAdminOrCoordinator, VehicleController.getAllVehicles);

// Get vehicle by ID
router.get("/:id", requireAdminOrCoordinator, VehicleController.getVehicleById);

// Create vehicle (Manager only)
router.post("/", requireManager, VehicleController.createVehicle);

// Update vehicle (Manager only)
router.put("/:id", requireManager, VehicleController.updateVehicle);

// Delete vehicle (Manager only)
router.delete("/:id", requireManager, VehicleController.deleteVehicle);

module.exports = router;
