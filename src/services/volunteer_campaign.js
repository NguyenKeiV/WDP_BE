const { db } = require("../config/database");
const UserService = require("./user");

class VolunteerCampaignService {
  static get Campaign() {
    return db.VolunteerCampaign;
  }

  static get Invitation() {
    return db.VolunteerCampaignInvitation;
  }

  static get VolunteerRegistration() {
    return db.VolunteerRegistration;
  }

  static getIO() {
    try {
      return require("../config/socket").getIO();
    } catch {
      return null;
    }
  }

  // --- Campaign CRUD ---

  static async create(data, managerId) {
    const { title, description, location, district, scheduled_at, end_at, max_volunteers, status } = data;

    if (!title || !String(title).trim()) {
      throw new Error("title is required");
    }
    if (!location || !String(location).trim()) {
      throw new Error("location is required");
    }
    if (!district || !String(district).trim()) {
      throw new Error("district is required");
    }
    if (!scheduled_at) {
      throw new Error("scheduled_at is required");
    }

    return this.Campaign.create({
      title: String(title).trim(),
      description: description != null ? String(description).trim() || null : null,
      location: String(location).trim(),
      district: String(district).trim(),
      scheduled_at: new Date(scheduled_at),
      end_at: end_at ? new Date(end_at) : null,
      max_volunteers: max_volunteers != null ? parseInt(max_volunteers, 10) : null,
      status: status === "published" ? "published" : "draft",
      created_by: managerId,
    });
  }

  static async listForManager({ page = 1, limit = 20, status, district } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    const where = {};
    if (status) where.status = status;
    if (district) where.district = district;

    const { count, rows } = await this.Campaign.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: db.User,
          as: "creator",
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

  static async getByIdForManager(id) {
    const campaign = await this.Campaign.findByPk(id, {
      include: [
        { model: db.User, as: "creator", attributes: ["id", "username", "email"] },
        { model: db.User, as: "canceller", attributes: ["id", "username", "email"], required: false },
        {
          model: this.Invitation,
          as: "invitations",
          attributes: ["id", "user_id", "status", "declined_reason", "responded_at"],
          include: [
            { model: db.User, as: "volunteer", attributes: ["id", "username", "email"] },
            { model: db.User, as: "inviter", attributes: ["id", "username", "email"], required: false },
          ],
        },
      ],
    });
    if (!campaign) throw new Error("Volunteer campaign not found");
    return campaign;
  }

  static async update(id, managerId, data) {
    const campaign = await this.Campaign.findByPk(id);
    if (!campaign) throw new Error("Volunteer campaign not found");

    const allowed = ["title", "description", "location", "district", "scheduled_at", "end_at", "max_volunteers"];
    if (data.status !== undefined) {
      throw new Error("Use /publish, /cancel, /start, /complete to change status");
    }
    const updates = {};
    for (const key of allowed) {
      if (data[key] !== undefined) {
        if (key === "scheduled_at" || key === "end_at") {
          updates[key] = data[key] ? new Date(data[key]) : null;
        } else if (key === "max_volunteers") {
          updates[key] = data[key] != null ? parseInt(data[key], 10) : null;
        } else {
          updates[key] = typeof data[key] === "string" ? data[key].trim() : data[key];
        }
      }
    }

    await campaign.update(updates);
    return campaign;
  }

  static async publish(id, managerId) {
    const campaign = await this.Campaign.findByPk(id);
    if (!campaign) throw new Error("Volunteer campaign not found");
    if (!["draft"].includes(campaign.status)) {
      throw new Error("Only draft campaigns can be published");
    }
    await campaign.update({ status: "published" });
    return campaign;
  }

  static async cancel(id, managerId) {
    const campaign = await this.Campaign.findByPk(id);
    if (!campaign) throw new Error("Volunteer campaign not found");
    if (!["draft", "published"].includes(campaign.status)) {
      throw new Error("Only draft or published campaigns can be cancelled");
    }
    await campaign.update({
      status: "cancelled",
      cancelled_by: managerId,
      cancelled_at: new Date(),
    });
    return campaign;
  }

  static async complete(id, managerId) {
    const campaign = await this.Campaign.findByPk(id);
    if (!campaign) throw new Error("Volunteer campaign not found");
    if (campaign.status !== "ongoing") {
      throw new Error("Only ongoing campaigns can be completed");
    }
    await campaign.update({ status: "completed" });
    return campaign;
  }

  static async start(id, managerId) {
    const campaign = await this.Campaign.findByPk(id);
    if (!campaign) throw new Error("Volunteer campaign not found");
    if (campaign.status !== "published") {
      throw new Error("Only published campaigns can be started");
    }
    await campaign.update({ status: "ongoing" });
    return campaign;
  }

  // --- Approved volunteer lookup ---

  static async getApprovedVolunteers({ district, page = 1, limit = 50 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;
    const where = { status: "approved" };
    if (district) where.district = district;

    const { count, rows } = await this.VolunteerRegistration.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [["updated_at", "DESC"]],
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

  // --- Invitation management ---

  static async inviteVolunteers(campaignId, volunteerUserIds, inviterId) {
    const campaign = await this.Campaign.findByPk(campaignId, {
      include: [{ model: db.User, as: "creator", attributes: ["id", "username"] }],
    });
    if (!campaign) throw new Error("Volunteer campaign not found");
    if (!["draft", "published"].includes(campaign.status)) {
      throw new Error("Campaign is not open for invitations");
    }

    const invitations = [];
    const usersToNotify = [];

    for (const userId of volunteerUserIds) {
      const existing = await this.Invitation.findOne({
        where: { campaign_id: campaignId, user_id: userId },
      });
      if (existing) continue;

      const registration = await this.VolunteerRegistration.findOne({
        where: { user_id: userId, status: "approved" },
      });
      if (!registration) continue;

      const inv = await this.Invitation.create({
        campaign_id: campaignId,
        user_id: userId,
        invited_by: inviterId,
        status: "pending",
      });

      const user = await UserService.getUserById(userId);
      invitations.push(inv);
      usersToNotify.push(user);
    }

    const io = this.getIO();
    const notificationTitle = "Bạn được mời tham gia tình nguyện!";
    const notificationBody = `"${campaign.title}" cần bạn! Ngày: ${new Date(campaign.scheduled_at).toLocaleDateString("vi-VN")}, Địa điểm: ${campaign.location}.`;

    for (const user of usersToNotify) {
      if (io) {
        io.to(`user:${user.id}`).emit("volunteer_campaign_invitation", {
          campaign_id: campaignId,
          campaign_title: campaign.title,
          scheduled_at: campaign.scheduled_at,
          location: campaign.location,
          invitation_id: invitations.find((i) => i.user_id === user.id)?.id,
        });
      }
      await UserService.sendPushNotification(
        user.expo_push_token,
        notificationTitle,
        notificationBody,
        {
          type: "volunteer_campaign_invitation",
          campaign_id: campaignId,
        },
      );
    }

    return invitations;
  }

  // --- Citizen: respond to invitation ---

  static async respondToInvitation(invitationId, userId, { accept, declined_reason } = {}) {
    const invitation = await this.Invitation.findOne({
      where: { id: invitationId, user_id: userId },
      include: [
        {
          model: this.Campaign,
          as: "campaign",
          attributes: ["id", "title", "status"],
        },
      ],
    });

    if (!invitation) throw new Error("Invitation not found");
    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been responded to");
    }
    if (!["published", "ongoing"].includes(invitation.get("campaign")?.status)) {
      throw new Error("Campaign is not accepting responses");
    }

    const newStatus = accept ? "accepted" : "declined";
    await invitation.update({
      status: newStatus,
      declined_reason: !accept && declined_reason ? String(declined_reason).trim() : null,
      responded_at: new Date(),
    });

    return invitation.reload();
  }

  // --- Citizen: list my invitations ---

  static async listMyInvitations(userId, { status, page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    const where = { user_id: userId };
    if (status) where.status = status;

    const { count, rows } = await this.Invitation.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: this.Campaign,
          as: "campaign",
          attributes: ["id", "title", "description", "location", "district", "scheduled_at", "end_at", "max_volunteers", "status"],
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

  // --- Manager: campaign response stats ---

  static async getCampaignStats(campaignId) {
    const campaign = await this.Campaign.findByPk(campaignId);
    if (!campaign) throw new Error("Volunteer campaign not found");

    const invitations = await this.Invitation.findAll({
      where: { campaign_id: campaignId },
      include: [
        { model: db.User, as: "volunteer", attributes: ["id", "username", "email"] },
      ],
    });

    const pending = invitations.filter((i) => i.status === "pending");
    const accepted = invitations.filter((i) => i.status === "accepted");
    const declined = invitations.filter((i) => i.status === "declined");

    return {
      campaign_id: campaignId,
      total_invited: invitations.length,
      pending: pending.length,
      accepted: accepted.length,
      declined: declined.length,
      accepted_volunteers: accepted.map((i) => ({
        invitation_id: i.id,
        user_id: i.user_id,
        username: i.get("volunteer")?.username,
        email: i.get("volunteer")?.email,
      })),
      declined_with_reasons: declined.map((i) => ({
        invitation_id: i.id,
        user_id: i.user_id,
        username: i.get("volunteer")?.username,
        email: i.get("volunteer")?.email,
        reason: i.declined_reason,
        responded_at: i.responded_at,
      })),
      pending_list: pending.map((i) => ({
        invitation_id: i.id,
        user_id: i.user_id,
        username: i.get("volunteer")?.username,
        email: i.get("volunteer")?.email,
      })),
    };
  }
}

module.exports = VolunteerCampaignService;
