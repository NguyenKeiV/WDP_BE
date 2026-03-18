const express = require("express");
const SupplyController = require("../controllers/supplies");
const { requireManager, requireRescueTeam } = require("../middlewares/auth");
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
    res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
};

const router = express.Router();

// --- Supply CRUD ---
router.get("/", requireViewAccess, SupplyController.getAllSupplies);
router.get(
  "/distributions",
  requireViewAccess,
  SupplyController.getDistributions,
);
router.get(
  "/my-team-distributions",
  requireRescueTeam,
  SupplyController.getMyTeamDistributions,
);

// --- Supply Usages (đặt trước /:id để tránh conflict) ---
router.get("/usages", requireViewAccess, SupplyController.getUsages);
router.get(
  "/usages/my-team-inventory",
  requireRescueTeam,
  SupplyController.getMyTeamInventory,
);
router.get(
  "/usages/my-team",
  requireRescueTeam,
  SupplyController.getMyTeamUsages,
);
router.get(
  "/usages/mission/:missionId",
  requireViewAccess,
  SupplyController.getUsagesByMission,
);
router.get(
  "/usages/team/:teamId",
  requireViewAccess,
  SupplyController.getTeamInventory,
);
router.post(
  "/usages/report",
  requireRescueTeam,
  SupplyController.reportUsage,
);
router.post(
  "/usages/bulk-report",
  requireRescueTeam,
  SupplyController.bulkReportUsage,
);

// --- Supply by ID ---
// Constrain :id to UUID so that reserved paths like "usages" don't get treated as an ID.
router.get(
  "/:id([0-9a-fA-F-]{36})",
  requireViewAccess,
  SupplyController.getSupplyById,
);
router.post("/", requireManager, SupplyController.createSupply);
router.post(
  "/bulk-distribute",
  requireManager,
  SupplyController.bulkDistribute,
);
router.post(
  "/:id([0-9a-fA-F-]{36})/distribute",
  requireManager,
  SupplyController.distributeSupply,
);

router.put(
  "/:id([0-9a-fA-F-]{36})",
  requireManager,
  SupplyController.updateSupply,
);
router.delete(
  "/:id([0-9a-fA-F-]{36})",
  requireManager,
  SupplyController.deleteSupply,
);

module.exports = router;
