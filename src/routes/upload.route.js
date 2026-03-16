const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const UploadController = require("../controllers/upload");
const { optionalAuth } = require("../middlewares/auth");

const router = express.Router();
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = (file.mimetype && file.mimetype.split("/")[1]) || "jpg";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error("Only image files are allowed (jpeg, png, gif, webp)"));
  },
});

router.post("/", optionalAuth, upload.single("image"), UploadController.uploadImage);

module.exports = router;
