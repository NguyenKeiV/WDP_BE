const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

/**
 * Upload ảnh lên Cloudinary, trả về URL công khai
 */
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "No image file received",
        error: "Missing file",
      });
    }

    // Upload stream lên Cloudinary
    const uploadFromBuffer = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "rescue_app",
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

    const result = await uploadFromBuffer();

    return res.status(200).json({
      success: true,
      message: "Upload successful",
      url: result.secure_url,
      data: { url: result.secure_url },
    });
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error.message,
    });
  }
};
