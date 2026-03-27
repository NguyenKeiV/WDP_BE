const { db } = require("../config/database");
const UserService = require("./user");

class VolunteerRegistrationService {
  static get Model() {
    return db.VolunteerRegistration;
  }

  static getIO() {
    try {
      return require("../config/socket").getIO();
    } catch {
      return null;
    }
  }

  static async create(data, userId) {
    const { support_type, district, note } = data;
    if (!support_type || !String(support_type).trim()) {
      throw new Error("support_type is required");
    }
    if (!district || !String(district).trim()) {
      throw new Error("district is required");
    }
    return this.Model.create({
      user_id: userId,
      support_type: String(support_type).trim(),
      district: String(district).trim(),
      note: note != null ? String(note).trim() || null : null,
      status: "pending",
    });
  }

  static async listMine(userId) {
    return this.Model.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
    });
  }

  static async getByIdForUser(id, userId) {
    const row = await this.Model.findOne({
      where: { id, user_id: userId },
    });
    if (!row) throw new Error("Volunteer registration not found");
    return row;
  }

  /** Manager / admin: danh sách toàn bộ (phục vụ web quản trị sau) */
  static async listAllForManager({ page = 1, limit = 20, status, district } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    const where = {};
    if (status) where.status = status;
    if (district) where.district = district;

    const { count, rows } = await this.Model.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: db.User,
          as: "citizen",
          attributes: ["id", "username", "email"],
        },
      ],
    });

    return {
      rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum) || 0,
      },
    };
  }

  /** Manager / admin: chi tiết bất kỳ đơn nào */
  static async getByIdForManager(id) {
    const row = await this.Model.findByPk(id, {
      include: [
        {
          model: db.User,
          as: "citizen",
          attributes: ["id", "username", "email"],
        },
        {
          model: db.User,
          as: "reviewer",
          attributes: ["id", "username", "email"],
          required: false,
        },
      ],
    });
    if (!row) throw new Error("Volunteer registration not found");
    return row;
  }

  /**
   * Manager / admin: duyệt hoặc từ chối đơn đăng ký tình nguyện.
   * @param {string} id - VolunteerRegistration ID
   * @param {string} managerId - ID của manager/admin thực hiện duyệt
   * @param {{ status: "approved"|"rejected"|"active"|"cancelled", note?: string }} data
   */
  static async review(id, managerId, data) {
    const { status, note } = data;

    if (!["approved", "rejected", "active", "cancelled"].includes(status)) {
      throw new Error(
        "Invalid status. Must be one of: approved, rejected, active, cancelled",
      );
    }

    const registration = await this.Model.findByPk(id, {
      include: [
        { model: db.User, as: "citizen", attributes: ["id", "username", "email", "expo_push_token"] },
        { model: db.User, as: "reviewer", attributes: ["id", "username", "email"], required: false },
      ],
    });

    if (!registration) throw new Error("Volunteer registration not found");

    if (registration.status !== "pending") {
      throw new Error("Only pending registrations can be reviewed");
    }

    const reviewer = await UserService.getUserById(managerId);
    const oldStatus = registration.status;

    await registration.update({
      status,
      coordinator_note: note || null,
      reviewed_by: managerId,
      reviewed_at: new Date(),
    });

    const io = this.getIO();
    const citizen = registration.get("citizen");

    const notificationTitle = this.#getNotificationTitle(status);
    const notificationBody = this.#getNotificationBody(status, reviewer.username, note);

    if (io) {
      io.to(`user:${citizen.id}`).emit("volunteer_registration_reviewed", {
        registration_id: registration.id,
        old_status: oldStatus,
        new_status: status,
        reviewed_by: managerId,
        reviewer_name: reviewer.username,
        note: note || null,
        reviewed_at: registration.reviewed_at,
      });
    }

    await UserService.sendPushNotification(
      citizen.expo_push_token,
      notificationTitle,
      notificationBody,
      {
        type: "volunteer_registration_review",
        registration_id: registration.id,
        status,
      },
    );

    return registration.reload();
  }

  static #getNotificationTitle(status) {
    const titles = {
      approved: "Đơn tình nguyện được duyệt!",
      rejected: "Đơn tình nguyện bị từ chối",
      active: "Đơn tình nguyện đã kích hoạt",
      cancelled: "Đơn tình nguyện đã bị hủy",
    };
    return titles[status] || "Cập nhật đơn tình nguyện";
  }

  static #getNotificationBody(status, reviewerName, note) {
    const reviewer = reviewerName || "Quản trị viên";
    const noteSuffix = note ? `\nLý do: ${note}` : "";

    const bodies = {
      approved: `${reviewer} đã duyệt đơn tình nguyện của bạn. Cảm ơn bạn đã tham gia!${noteSuffix}`,
      rejected: `${reviewer} đã từ chối đơn tình nguyện của bạn.${noteSuffix}`,
      active: `${reviewer} đã kích hoạt đơn tình nguyện của bạn. Bạn đã sẵn sàng tham gia!${noteSuffix}`,
      cancelled: `${reviewer} đã hủy đơn tình nguyện của bạn.${noteSuffix}`,
    };
    return bodies[status] || `Đơn tình nguyện của bạn đã được cập nhật trạng thái thành: ${status}`;
  }
}

module.exports = VolunteerRegistrationService;
