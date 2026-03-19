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
router.post("/campaigns", requireManager, CharityCampaignController.createCampaign);

// Mobile/user xem danh sách
router.get("/campaigns", CharityCampaignController.getCampaigns);

// Mobile/user xem chi tiết
router.get("/campaigns/:id", CharityCampaignController.getCampaignById);

module.exports = router;

