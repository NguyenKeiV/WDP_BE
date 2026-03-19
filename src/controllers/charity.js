const CharityService = require("../services/charity");

class CharityController {
  static async getHistory(req, res) {
    try {
      const { donor_phone, phone } = req.query;
      const donor = donor_phone || phone || req.params?.phone;

      const { page = 1, limit = 20 } = req.query;
      if (!donor) {
        return res.status(400).json({
          success: false,
          message: "donor_phone is required",
        });
      }

      const result = await CharityService.getDonationHistoryByPhone(
        donor,
        page,
        limit,
      );

      res.status(200).json({
        success: true,
        message: "Charity history retrieved successfully",
        data: result.histories,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to retrieve charity history",
        error: error.message,
      });
    }
  }
}

module.exports = CharityController;

