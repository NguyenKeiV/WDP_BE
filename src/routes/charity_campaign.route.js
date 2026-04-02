const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const CharityCampaignController = require("../controllers/charity_campaigns");
const { requireAuth, requireManager } = require("../middlewares/auth");

const router = express.Router();

// SỬA: dùng Cloudinary thay vì diskStorage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "rescue_app/campaigns",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ quality: "auto", fetch_format: "auto" }],
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
router.delete("/:id", requireManager, CharityCampaignController.deleteCampaign);

module.exports = router;
