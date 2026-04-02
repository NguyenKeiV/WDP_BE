const express = require("express");
const CharityController = require("../controllers/charity");
const CharityCampaignController = require("../controllers/charity_campaigns");
const { requireManager } = require("../middlewares/auth");

const router = express.Router();

// GET /api/charity/history?donor_phone=0xxxxxxxxx&page=1&limit=20
router.get("/history", CharityController.getHistory);

// GET /api/charity/history/:phone
router.get("/history/:phone", CharityController.getHistory);

// --- Charity campaigns ---
// Manager tạo đợt quyên góp (web)
router.post(
  "/campaigns",
  requireManager,
  CharityCampaignController.createCampaign,
);

// Mobile/user xem danh sách (public)
router.get("/campaigns", CharityCampaignController.getAllCampaigns);

// Mobile/user xem chi tiết (public)
router.get("/campaigns/:id", CharityCampaignController.getCampaignById);

// Manager xóa đợt quyên góp
router.delete(
  "/campaigns/:id",
  requireManager,
  CharityCampaignController.deleteCampaign,
);

module.exports = router;
