const express = require("express");
const VehicleController = require("../controllers/vehicles");
const { requireManager } = require("../middlewares/auth");
const UserService = require("../services/user");

const requireViewAccess = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, message: "No authentication token provided" });
    }
    const token = authHeader.replace("Bearer ", "");
    const user = await UserService.verifyToken(token);
    req.user = user;
    if (!["admin", "coordinator", "manager"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  } catch (error) {
    res
      .status(401)
      .json({
        success: false,
        message: "Authentication failed",
        error: error.message,
      });
  }
};

const router = express.Router();

router.get("/", requireViewAccess, VehicleController.getAllVehicles);
router.get("/:id", requireViewAccess, VehicleController.getVehicleById);
router.post("/", requireManager, VehicleController.createVehicle);
router.put("/:id", requireManager, VehicleController.updateVehicle);
router.delete("/:id", requireManager, VehicleController.deleteVehicle);

module.exports = router;
