const express = require("express");
const CharityController = require("../controllers/charity");

const router = express.Router();

// GET /api/charity/history?donor_phone=0xxxxxxxxx&page=1&limit=20
router.get("/history", CharityController.getHistory);

// GET /api/charity/history/:phone
router.get("/history/:phone", CharityController.getHistory);

module.exports = router;

