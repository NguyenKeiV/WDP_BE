const express = require("express");
const multer = require("multer");
const path = require("path");
const CharityCampaignController = require("../controllers/charity_campaign");
const { requireAuth, requireManager } = require("../middlewares/auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `campaign_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

router.get("/active", requireAuth, CharityCampaignController.getActiveCampaign);
router.get("/", requireManager, CharityCampaignController.getAllCampaigns);
router.post(
  "/",
  requireManager,
  upload.single("image"),
  CharityCampaignController.createCampaign,
);
router.patch("/:id/end", requireManager, CharityCampaignController.endCampaign);

module.exports = router;
