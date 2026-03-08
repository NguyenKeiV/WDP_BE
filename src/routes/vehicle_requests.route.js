const express = require("express");
const VehicleRequestController = require("../controllers/vehicle_requests");
const {
  requireCoordinator,
  requireManager,
  requireAdminOrCoordinator,
} = require("../middlewares/auth");
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

// Xem danh sách: admin + coordinator + manager
router.get("/", requireViewAccess, VehicleRequestController.getAllRequests);
router.get("/:id", requireViewAccess, VehicleRequestController.getRequestById);

// Coordinator tạo yêu cầu
router.post("/", requireCoordinator, VehicleRequestController.createRequest);

// Manager duyệt / từ chối / thu hồi
router.post(
  "/:id/approve",
  requireManager,
  VehicleRequestController.approveRequest,
);
router.post(
  "/:id/reject",
  requireManager,
  VehicleRequestController.rejectRequest,
);
router.post(
  "/:id/return",
  requireManager,
  VehicleRequestController.returnVehicles,
);

module.exports = router;
