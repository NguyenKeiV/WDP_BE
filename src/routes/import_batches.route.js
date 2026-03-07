const express = require("express");
const ImportBatchController = require("../controllers/import_batches");
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

// Tổng quan kho (phải trước /:id)
router.get(
  "/overview",
  requireViewAccess,
  ImportBatchController.getWarehouseOverview,
);

// Tồn kho theo supply
router.get(
  "/stock/:id",
  requireViewAccess,
  ImportBatchController.getStockBySupply,
);

// CRUD đợt nhập
router.get("/", requireViewAccess, ImportBatchController.getAllBatches);
router.get("/:id", requireViewAccess, ImportBatchController.getBatchById);
router.post("/", requireManager, ImportBatchController.createBatch);

// Hoàn tất đợt nhập
router.post(
  "/:id/complete",
  requireManager,
  ImportBatchController.completeBatch,
);

// Thêm/xóa mặt hàng trong đợt nhập (khi còn draft)
router.post("/:id/items", requireManager, ImportBatchController.addItemToBatch);
router.delete(
  "/:id/items/:itemId",
  requireManager,
  ImportBatchController.removeItemFromBatch,
);

module.exports = router;
