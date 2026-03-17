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
router.get("/:id", requireViewAccess, SupplyController.getSupplyById);
router.post("/", requireManager, SupplyController.createSupply);
router.post(
  "/bulk-distribute",
  requireManager,
  SupplyController.bulkDistribute,
);
router.post(
  "/:id/distribute",
  requireManager,
  SupplyController.distributeSupply,
);

router.put("/:id", requireManager, SupplyController.updateSupply);
router.delete("/:id", requireManager, SupplyController.deleteSupply);

module.exports = router;
