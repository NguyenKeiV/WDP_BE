const VolunteerRegistrationService = require("../services/volunteer_registration");

class VolunteerRegistrationController {
  static citizenOnly(req, res) {
    if (req.user.role !== "user") {
      res.status(403).json({
        success: false,
        message: "Chỉ tài khoản citizen (role user) được dùng tính năng này",
      });
      return false;
    }
    return true;
  }

  static async create(req, res) {
    try {
      if (!VolunteerRegistrationController.citizenOnly(req, res)) return;
      const row = await VolunteerRegistrationService.create(
        req.body,
        req.user.id,
      );
      res.status(201).json({
        success: true,
        message: "Đã gửi đăng ký tình nguyện",
        data: row.toJSON(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Không thể tạo đăng ký",
        error: error.message,
      });
    }
  }

  static async listMine(req, res) {
    try {
      if (!VolunteerRegistrationController.citizenOnly(req, res)) return;
      const rows = await VolunteerRegistrationService.listMine(req.user.id);
      res.status(200).json({
        success: true,
        data: rows.map((r) => r.toJSON()),
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

      if (["manager", "admin"].includes(req.user.role)) {
        const row = await VolunteerRegistrationService.getByIdForManager(id);
        return res.status(200).json({
          success: true,
          data: row.toJSON(),
        });
      }

      if (req.user.role === "user") {
        if (!VolunteerRegistrationController.citizenOnly(req, res)) return;
        const row = await VolunteerRegistrationService.getByIdForUser(
          id,
          req.user.id,
        );
        return res.status(200).json({
          success: true,
          data: row.toJSON(),
        });
      }

      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    } catch (error) {
      const code =
        error.message === "Volunteer registration not found" ? 404 : 400;
      res.status(code).json({
        success: false,
        message: "Không tìm thấy đăng ký",
        error: error.message,
      });
    }
  }

  /** GET / — manager / admin: danh sách đơn (web gọi sau) */
  static async listAllForManager(req, res) {
    try {
      const { page, limit, status, district } = req.query;
      const result = await VolunteerRegistrationService.listAllForManager({
        page,
        limit,
        status,
        district,
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

  /** POST /:id/review — manager / admin: duyệt hoặc từ chối đơn đăng ký tình nguyện */
  static async review(req, res) {
    try {
      const { id } = req.params;
      const { status, note } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Trường 'status' là bắt buộc (approved | rejected | active | cancelled)",
        });
      }

      const registration = await VolunteerRegistrationService.review(
        id,
        req.user.id,
        { status, note },
      );

      const messageMap = {
        approved: "Đơn đăng ký tình nguyện đã được duyệt",
        rejected: "Đơn đăng ký tình nguyện đã bị từ chối",
        active: "Đơn đăng ký tình nguyện đã được kích hoạt",
        cancelled: "Đơn đăng ký tình nguyện đã bị hủy",
      };

      res.status(200).json({
        success: true,
        message: messageMap[status] || "Đơn đã được cập nhật",
        data: registration.toJSON(),
      });
    } catch (error) {
      const codeMap = {
        "Volunteer registration not found": 404,
        "Only pending registrations can be reviewed": 409,
      };
      const code = codeMap[error.message] || 400;
      res.status(code).json({
        success: false,
        message: "Không thể duyệt đơn",
        error: error.message,
      });
    }
  }
}

module.exports = VolunteerRegistrationController;
