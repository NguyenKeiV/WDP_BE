const VolunteerCampaignService = require("../services/volunteer_campaign");

class VolunteerCampaignController {
  // --- Campaign lifecycle (manager) ---

  static async create(req, res) {
    try {
      const campaign = await VolunteerCampaignService.create(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: "Đợt tình nguyện đã được tạo",
        data: campaign.toJSON(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Không thể tạo đợt tình nguyện",
        error: error.message,
      });
    }
  }

  static async listForManager(req, res) {
    try {
      const { page, limit, status, district } = req.query;
      const result = await VolunteerCampaignService.listForManager({
        page, limit, status, district,
      });
      res.status(200).json({
        success: true,
        data: result.rows.map((r) => r.toJSON()),
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Không thể tải danh sách",
        error: error.message,
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const campaign = await VolunteerCampaignService.getByIdForManager(id);
      res.status(200).json({
        success: true,
        data: campaign.toJSON(),
      });
    } catch (error) {
      const code = error.message === "Volunteer campaign not found" ? 404 : 400;
      res.status(code).json({
        success: false,
        message: "Không tìm thấy đợt tình nguyện",
        error: error.message,
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const campaign = await VolunteerCampaignService.update(id, req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: "Đợt tình nguyện đã được cập nhật",
        data: campaign.toJSON(),
      });
    } catch (error) {
      const code = error.message === "Volunteer campaign not found" ? 404 : 400;
      res.status(code).json({
        success: false,
        message: "Không thể cập nhật đợt tình nguyện",
        error: error.message,
      });
    }
  }

  static async publish(req, res) {
    try {
      const { id } = req.params;
      const campaign = await VolunteerCampaignService.publish(id, req.user.id);
      res.status(200).json({
        success: true,
        message: "Đợt tình nguyện đã được công bố",
        data: campaign.toJSON(),
      });
    } catch (error) {
      const code = error.message === "Volunteer campaign not found" ? 404 : 400;
      res.status(code).json({
        success: false,
        message: "Không thể công bố đợt tình nguyện",
        error: error.message,
      });
    }
  }

  static async cancel(req, res) {
    try {
      const { id } = req.params;
      const campaign = await VolunteerCampaignService.cancel(id, req.user.id);
      res.status(200).json({
        success: true,
        message: "Đợt tình nguyện đã bị hủy",
        data: campaign.toJSON(),
      });
    } catch (error) {
      const code = error.message === "Volunteer campaign not found" ? 404 : 400;
      res.status(code).json({
        success: false,
        message: "Không thể hủy đợt tình nguyện",
        error: error.message,
      });
    }
  }

  static async start(req, res) {
    try {
      const { id } = req.params;
      const campaign = await VolunteerCampaignService.start(id, req.user.id);
      res.status(200).json({
        success: true,
        message: "Đợt tình nguyện đã bắt đầu",
        data: campaign.toJSON(),
      });
    } catch (error) {
      const code = error.message === "Volunteer campaign not found" ? 404 : 400;
      res.status(code).json({
        success: false,
        message: "Không thể bắt đầu đợt tình nguyện",
        error: error.message,
      });
    }
  }

  static async complete(req, res) {
    try {
      const { id } = req.params;
      const campaign = await VolunteerCampaignService.complete(id, req.user.id);
      res.status(200).json({
        success: true,
        message: "Đợt tình nguyện đã hoàn thành",
        data: campaign.toJSON(),
      });
    } catch (error) {
      const code = error.message === "Volunteer campaign not found" ? 404 : 400;
      res.status(code).json({
        success: false,
        message: "Không thể hoàn thành đợt tình nguyện",
        error: error.message,
      });
    }
  }

  // --- Approved volunteer lookup (manager) ---

  static async getApprovedVolunteers(req, res) {
    try {
      const { district, page, limit } = req.query;
      const result = await VolunteerCampaignService.getApprovedVolunteers({ district, page, limit });
      res.status(200).json({
        success: true,
        data: result.rows.map((r) => r.toJSON()),
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Không thể tải danh sách tình nguyện viên",
        error: error.message,
      });
    }
  }

  // --- Invitation management (manager) ---

  static async inviteVolunteers(req, res) {
    try {
      const { id } = req.params;
      const { volunteer_user_ids } = req.body;

      if (!Array.isArray(volunteer_user_ids) || volunteer_user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Danh sách volunteer_user_ids (mảng) là bắt buộc và không được rỗng",
        });
      }

      const invitations = await VolunteerCampaignService.inviteVolunteers(
        id,
        volunteer_user_ids,
        req.user.id,
      );

      res.status(201).json({
        success: true,
        message: `Đã mời ${invitations.length} tình nguyện viên tham gia`,
        data: invitations.map((i) => i.toJSON()),
      });
    } catch (error) {
      const code = error.message === "Volunteer campaign not found" ? 404 : 400;
      res.status(code).json({
        success: false,
        message: "Không thể mời tình nguyện viên",
        error: error.message,
      });
    }
  }

  static async getCampaignStats(req, res) {
    try {
      const { id } = req.params;
      const stats = await VolunteerCampaignService.getCampaignStats(id);
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      const code = error.message === "Volunteer campaign not found" ? 404 : 400;
      res.status(code).json({
        success: false,
        message: "Không thể lấy thống kê",
        error: error.message,
      });
    }
  }

  // --- Citizen: respond to invitation ---

  static async respondToInvitation(req, res) {
    try {
      const { id } = req.params;
      const { accept, declined_reason } = req.body;

      if (typeof accept !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Trường 'accept' (boolean) là bắt buộc",
        });
      }

      const invitation = await VolunteerCampaignService.respondToInvitation(
        id,
        req.user.id,
        { accept, declined_reason },
      );

      const message = accept
        ? "Bạn đã xác nhận tham gia đợt tình nguyện"
        : "Bạn đã từ chối lời mời tham gia đợt tình nguyện";

      res.status(200).json({
        success: true,
        message,
        data: invitation.toJSON(),
      });
    } catch (error) {
      const codeMap = {
        "Invitation not found": 404,
        "Invitation has already been responded to": 409,
      };
      const code = codeMap[error.message] || 400;
      res.status(code).json({
        success: false,
        message: "Không thể phản hồi lời mời",
        error: error.message,
      });
    }
  }

  // --- Citizen: list my invitations ---

  static async listMyInvitations(req, res) {
    try {
      const { status, page, limit } = req.query;
      const result = await VolunteerCampaignService.listMyInvitations(req.user.id, {
        status, page, limit,
      });
      res.status(200).json({
        success: true,
        data: result.rows.map((r) => r.toJSON()),
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Không thể tải danh sách lời mời",
        error: error.message,
      });
    }
  }
}

module.exports = VolunteerCampaignController;
