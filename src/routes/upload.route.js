const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const { optionalAuth } = require("../middlewares/auth");

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "rescue_app",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/", optionalAuth, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file received" });
    }
    const url = req.file.path; // Cloudinary trả về URL trong req.file.path
    return res.status(200).json({
      success: true,
      message: "Upload successful",
      url,
      data: { url },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Upload failed", error: error.message });
  }
});

module.exports = router;
