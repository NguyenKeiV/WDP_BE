const { db } = require("../config/database");

class CharityCampaignService {
  static async getActiveCampaign() {
    return await db.CharityCampaign.findOne({
      where: { status: "active" },
      order: [["created_at", "DESC"]],
      include: [
        { model: db.User, as: "creator", attributes: ["id", "username"] },
      ],
    });
  }

  static async getAllCampaigns(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const { count, rows } = await db.CharityCampaign.findAndCountAll({
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: db.User, as: "creator", attributes: ["id", "username"] },
      ],
    });
    return {
      campaigns: rows.map((c) => c.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  static async getCampaignById(id) {
    const campaign = await db.CharityCampaign.findByPk(id, {
      include: [
        { model: db.User, as: "creator", attributes: ["id", "username"] },
      ],
    });
    if (!campaign) throw new Error("Campaign not found");
    return campaign;
  }

  static async createCampaign(data, managerId) {
    const { title, description, address, image_url, start_date, end_date } =
      data;
    if (!title || !start_date || !end_date) {
      throw new Error("title, start_date, end_date are required");
    }
    if (new Date(start_date) >= new Date(end_date)) {
      throw new Error("end_date must be after start_date");
    }
    // Kết thúc campaign đang active nếu có
    await db.CharityCampaign.update(
      { status: "ended" },
      { where: { status: "active" } },
    );
    const campaign = await db.CharityCampaign.create({
      title,
      description,
      address,
      image_url,
      start_date,
      end_date,
      status: "active",
      created_by: managerId,
    });
    return campaign;
  }

  static async endCampaign(id) {
    const campaign = await this.getCampaignById(id);
    if (campaign.status === "ended") {
      throw new Error("Campaign already ended");
    }
    await campaign.update({ status: "ended" });
    return campaign;
  }

  static async deleteCampaign(id, managerId) {
    const campaign = await this.getCampaignById(id);

    if (
      managerId &&
      campaign.created_by &&
      String(campaign.created_by) !== String(managerId)
    ) {
      throw new Error("Bạn không có quyền xóa đợt quyên góp này");
    }

    await campaign.destroy();
    return true;
  }
}

module.exports = CharityCampaignService;
