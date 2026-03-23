const CharityCampaignService = require("../services/charity_campaigns");

class CharityCampaignController {
  static async getActiveCampaign(req, res) {
    try {
      const campaign = await CharityCampaignService.getActiveCampaign();
      res.status(200).json({ success: true, data: campaign });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async getAllCampaigns(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await CharityCampaignService.getAllCampaigns(page, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // THÊM MỚI: lấy chi tiết 1 campaign theo id
  static async getCampaignById(req, res) {
    try {
      const { id } = req.params;
      const campaign = await CharityCampaignService.getCampaignById(id);
      res.status(200).json({ success: true, data: campaign.toJSON() });
    } catch (error) {
      const status = error.message === "Campaign not found" ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  static async createCampaign(req, res) {
    try {
      const { title, description, address, start_date, end_date } = req.body;

      let image_url = req.body.image_url || null;
      if (req.file) {
        image_url = `/uploads/${req.file.filename}`;
      }

      const campaign = await CharityCampaignService.createCampaign(
        { title, description, address, image_url, start_date, end_date },
        req.user.id,
      );

      res.status(201).json({
        success: true,
        message: "Campaign created successfully",
        data: campaign.toJSON(),
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async endCampaign(req, res) {
    try {
      const { id } = req.params;
      const campaign = await CharityCampaignService.endCampaign(id);
      res.status(200).json({
        success: true,
        message: "Campaign ended successfully",
        data: campaign.toJSON(),
      });
    } catch (error) {
      const status = error.message === "Campaign not found" ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

module.exports = CharityCampaignController;
