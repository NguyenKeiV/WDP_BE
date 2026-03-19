const { db } = require("../config/database");
const { Op } = require("sequelize");
const UserService = require("./user");

class CharityCampaignService {
  static get CampaignModel() {
    return db.CharityCampaign;
  }

  static normalizePosterUrls(poster_urls) {
    if (!poster_urls) return [];
    if (Array.isArray(poster_urls)) return poster_urls.filter(Boolean);
    if (typeof poster_urls === "string") {
      // Accept comma-separated or single url
      if (poster_urls.includes(",")) {
        return poster_urls
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [poster_urls];
    }
    return [];
  }

  static toDateOnly(value) {
    if (!value) return null;
    // Accept YYYY-MM-DD already
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  static async createCampaign(data, managerId) {
    const { name, address, start_at, time, end_at, reason, poster_urls, poster_url } =
      data || {};

    const normalizedStart = this.toDateOnly(start_at || time);
    const normalizedEnd = this.toDateOnly(end_at);

    const normalizedPosterUrls = this.normalizePosterUrls(
      poster_urls || poster_url,
    );

    if (!name || !address || !reason || !normalizedStart) {
      throw new Error(
        "Missing required fields: name, address, reason, and start_at/time",
      );
    }

    const campaign = await this.CampaignModel.create({
      manager_id: managerId,
      name,
      address,
      start_at: normalizedStart,
      end_at: normalizedEnd,
      reason,
      poster_urls: normalizedPosterUrls,
      status: "active",
    });

    // Side effect: send push notification to all users who registered push token.
    try {
      const users = await db.User.findAll({
        where: {
          role: "user",
          expo_push_token: { [Op.ne]: null },
        },
        attributes: ["id", "expo_push_token"],
      });

      const payloadData = {
        type: "charity_campaign",
        campaign_id: campaign.id,
      };

      for (const u of users) {
        if (!u.expo_push_token) continue;
        await UserService.sendPushNotification(
          u.expo_push_token,
          "📢 Có đợt quyên góp mới",
          `Đợt quyên góp đã được tạo: ${reason}`,
          payloadData,
        );
      }
    } catch (e) {
      // Push failure should not break campaign creation.
      console.error("Failed to send charity campaign push:", e?.message || e);
    }

    return await this.getCampaignById(campaign.id);
  }

  static async getCampaigns(filters = {}, page = 1, limit = 20) {
    const { status } = filters;
    const where = {};
    if (status) where.status = status;

    const { count, rows } = await this.CampaignModel.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: "manager",
          attributes: ["id", "username"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return {
      campaigns: rows.map((r) => r.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    };
  }

  static async getCampaignById(id) {
    const campaign = await this.CampaignModel.findByPk(id, {
      include: [
        {
          model: db.User,
          as: "manager",
          attributes: ["id", "username", "email"],
        },
      ],
    });
    if (!campaign) throw new Error("Charity campaign not found");
    return campaign;
  }
}

module.exports = CharityCampaignService;

