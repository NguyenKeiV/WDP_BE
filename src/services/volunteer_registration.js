const { db } = require("../config/database");

class VolunteerRegistrationService {
  static get Model() {
    return db.VolunteerRegistration;
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
}

module.exports = VolunteerRegistrationService;
