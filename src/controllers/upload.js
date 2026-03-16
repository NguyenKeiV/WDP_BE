/**
 * Upload ảnh - trả về URL công khai để mobile dùng cho media_urls / completion_media_urls
 */
exports.uploadImage = (req, res) => {
  try {
    if (!req.file || !req.file.filename) {
      return res.status(400).json({
        success: false,
        message: "No image file received",
        error: "Missing file",
      });
    }
    const baseUrl = req.protocol + "://" + req.get("host");
    const url = `${baseUrl}/api/uploads/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      message: "Upload successful",
      url,
      data: { url },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error.message,
    });
  }
};
