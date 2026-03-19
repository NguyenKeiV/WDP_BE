const CharityCampaignService = require("../services/charity_campaigns");

class CharityCampaignController {
  static async createCampaign(req, res) {
    try {
      const managerId = req.user.id;
      const campaign = await CharityCampaignService.createCampaign(
        req.body,
        managerId,
      );

      res.status(201).json({
        success: true,
        message: "Charity campaign created successfully",
        data: campaign,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to create charity campaign",
        error: error.message,
      });
    }
  }

  static async getCampaigns(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const result = await CharityCampaignService.getCampaigns(
        { status },
        page,
        limit,
      );

      res.status(200).json({
        success: true,
        message: "Charity campaigns retrieved successfully",
        data: result.campaigns,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to retrieve charity campaigns",
        error: error.message,
      });
    }
  }

  static async getCampaignById(req, res) {
    try {
      const { id } = req.params;
      const campaign = await CharityCampaignService.getCampaignById(id);
      res.status(200).json({
        success: true,
        message: "Charity campaign retrieved successfully",
        data: campaign.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message.includes("not found") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to retrieve charity campaign",
        error: error.message,
      });
    }
  }
}

module.exports = CharityCampaignController;

