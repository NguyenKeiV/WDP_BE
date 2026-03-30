const VolunteerRegistrationService = require("../services/volunteer_registration");
const UserService = require("../services/user");

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

  /** PATCH /:id/review — manager/admin: duyệt + phản hồi + push tới citizen */
  static async review(req, res) {
    try {
      const { id } = req.params;
      const { status, coordinator_note } = req.body || {};

      const row = await VolunteerRegistrationService.review(id, req.user.id, {
        status,
        coordinator_note,
      });

      // Push notification to citizen (nếu có token)
      try {
        const citizenId = row.user_id;
        const citizen = await require("../config/database").db.User.findByPk(
          citizenId,
        );
        const token = citizen?.expo_push_token;
        if (token) {
          const title =
            row.status === "approved"
              ? "✅ Đăng ký tình nguyện đã được duyệt"
              : row.status === "rejected"
                ? "❌ Đăng ký tình nguyện chưa được duyệt"
                : "📣 Cập nhật đăng ký tình nguyện";

          const body =
            row.coordinator_note ||
            `Trạng thái đăng ký của bạn: ${row.status}. Mở app để xem chi tiết.`;

          await UserService.sendPushNotification(token, title, body, {
            type: "volunteer_review",
            registration_id: row.id,
            status: row.status,
          });
        }
      } catch (e) {
        console.error("Failed to send volunteer review push:", e);
      }

      res.status(200).json({
        success: true,
        message: "Volunteer registration reviewed",
        data: row.toJSON(),
      });
    } catch (error) {
      const code =
        error.message === "Volunteer registration not found" ? 404 : 400;
      res.status(code).json({
        success: false,
        message: "Không thể duyệt đăng ký",
        error: error.message,
      });
    }
  }
}

module.exports = VolunteerRegistrationController;
