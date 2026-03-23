const { Op } = require("sequelize");
const { db, transaction } = require("../config/database");

class RescueRequestService {
  static get RescueRequestModel() {
    return db.RescueRequest;
  }

  static get UserModel() {
    return db.User;
  }

  static async createRescueRequest(requestData, userId = null) {
    try {
      const {
        category,
        district,
        phone_number,
        description,
        num_people,
        priority,
        location_type,
        latitude,
        longitude,
        address,
        media_urls,
      } = requestData;

      if (
        !category ||
        !district ||
        !phone_number ||
        !description ||
        !location_type
      ) {
        throw new Error("Missing required fields");
      }
      if (!["rescue", "relief"].includes(category)) {
        throw new Error("category must be 'rescue' or 'relief'");
      }
      if (location_type === "gps" && (!latitude || !longitude)) {
        throw new Error("GPS coordinates are required for GPS location type");
      }
      if (location_type === "manual" && !address) {
        throw new Error("Address is required for manual location type");
      }
      if (num_people && num_people < 1) {
        throw new Error("num_people must be at least 1");
      }

      const rescueRequest = await transaction(async (t) => {
        return await this.RescueRequestModel.create(
          {
            category,
            district,
            phone_number,
            description,
            num_people: num_people || 1,
            priority: priority || "medium",
            status: "new",
            location_type,
            latitude: location_type === "gps" ? latitude : null,
            longitude: location_type === "gps" ? longitude : null,
            address: location_type === "manual" ? address : null,
            media_urls: media_urls || [],
            user_id: userId,
          },
          { transaction: t },
        );
      });

      return rescueRequest;
    } catch (error) {
      throw error;
    }
  }

  static async getAllRescueRequests(filters = {}, page = 1, limit = 20) {
    try {
      const { status, category, district, priority, user_id } = filters;
      const offset = (page - 1) * limit;
      const where = {};
      if (status) where.status = status;
      if (category) where.category = category;
      if (district) where.district = district;
      if (priority) where.priority = priority;
      if (user_id) where.user_id = user_id;

      const { count, rows: requests } =
        await this.RescueRequestModel.findAndCountAll({
          where,
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [["created_at", "DESC"]],
          include: [
            {
              model: this.UserModel,
              as: "creator",
              attributes: ["id", "username", "email"],
            },
            {
              model: this.UserModel,
              as: "verifier",
              attributes: ["id", "username", "email", "role"],
            },
            {
              model: db.RescueTeam,
              as: "assigned_team",
              required: false,
              attributes: ["id", "name", "phone_number", "district"],
            },
          ],
        });

      return {
        requests: requests.map((req) => req.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
          offset,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  static async getMyTeamMissions(userId) {
    try {
      const team = await db.RescueTeam.findOne({ where: { user_id: userId } });
      if (!team) throw new Error("No team associated with this account");

      const missions = await this.RescueRequestModel.findAll({
        where: {
          assigned_team_id: team.id,
          // Thêm "assigned" vào danh sách status hiển thị cho team
          status: { [Op.in]: ["assigned", "on_mission", "completed"] },
        },
        include: [
          {
            model: this.UserModel,
            as: "creator",
            attributes: ["id", "username", "email"],
          },
        ],
        order: [["assigned_at", "DESC"]],
      });

      return { team: team.toJSON(), missions: missions.map((m) => m.toJSON()) };
    } catch (error) {
      throw error;
    }
  }

  static async getRescueRequestById(id) {
    try {
      const request = await this.RescueRequestModel.findByPk(id, {
        include: [
          {
            model: this.UserModel,
            as: "creator",
            attributes: ["id", "username", "email"],
          },
          {
            model: this.UserModel,
            as: "verifier",
            attributes: ["id", "username", "email", "role"],
          },
          {
            model: this.UserModel,
            as: "assigner",
            attributes: ["id", "username", "email", "role"],
          },
          { model: db.RescueTeam, as: "assigned_team" },
        ],
      });
      if (!request) throw new Error("Rescue request not found");
      return request;
    } catch (error) {
      throw error;
    }
  }

  static async approveRescueRequest(id, coordinatorId, notes = null) {
    try {
      const request = await this.getRescueRequestById(id);
      if (request.status !== "new") {
        throw new Error(
          `Cannot approve request with status '${request.status}'.`,
        );
      }
      const coordinator = await this.UserModel.findByPk(coordinatorId);
      if (!coordinator) throw new Error("Coordinator not found");
      if (!["coordinator", "admin"].includes(coordinator.role)) {
        throw new Error("Only coordinators or admins can approve requests");
      }
      await request.update({
        status: "pending_verification",
        verified_by: coordinatorId,
        verified_at: new Date(),
        notes: notes || "Request approved by coordinator",
      });
      await request.reload({
        include: [
          {
            model: this.UserModel,
            as: "creator",
            attributes: ["id", "username", "email"],
          },
          {
            model: this.UserModel,
            as: "verifier",
            attributes: ["id", "username", "email", "role"],
          },
        ],
      });
      return request;
    } catch (error) {
      throw error;
    }
  }

  static async rejectRescueRequest(id, coordinatorId, reason) {
    try {
      if (!reason || reason.trim().length === 0)
        throw new Error("Rejection reason is required");
      const request = await this.getRescueRequestById(id);
      if (!["new", "pending_verification"].includes(request.status)) {
        throw new Error(
          `Cannot reject request with status '${request.status}'.`,
        );
      }
      const coordinator = await this.UserModel.findByPk(coordinatorId);
      if (!coordinator) throw new Error("Coordinator not found");
      if (!["coordinator", "admin"].includes(coordinator.role)) {
        throw new Error("Only coordinators or admins can reject requests");
      }
      await request.update({
        status: "rejected",
        verified_by: coordinatorId,
        verified_at: new Date(),
        notes: `Rejected: ${reason}`,
      });
      await request.reload({
        include: [
          {
            model: this.UserModel,
            as: "creator",
            attributes: ["id", "username", "email"],
          },
          {
            model: this.UserModel,
            as: "verifier",
            attributes: ["id", "username", "email", "role"],
          },
        ],
      });
      return request;
    } catch (error) {
      throw error;
    }
  }

  // SỬA: assignTeamToRequest giờ chuyển sang "assigned" thay vì "on_mission"
  static async assignTeamToRequest(requestId, teamId, coordinatorId) {
    try {
      const request = await this.getRescueRequestById(requestId);
      if (request.status !== "pending_verification") {
        throw new Error(
          `Cannot assign team to request with status '${request.status}'.`,
        );
      }
      const coordinator = await this.UserModel.findByPk(coordinatorId);
      if (!coordinator) throw new Error("Coordinator not found");
      if (!["coordinator", "admin"].includes(coordinator.role)) {
        throw new Error("Only coordinators or admins can assign teams");
      }
      const RescueTeamService = require("./rescue_team");
      const team = await RescueTeamService.getTeamById(teamId);
      if (team.status !== "available") {
        throw new Error(
          `Team '${team.name}' is not available. Current status: ${team.status}`,
        );
      }

      // SỬA: chuyển sang "assigned" thay vì "on_mission"
      // Team chưa bị lock, chờ team xác nhận mới chuyển sang on_mission
      await request.update({
        status: "assigned",
        assigned_team_id: teamId,
        assigned_at: new Date(),
        assigned_by: coordinatorId,
        team_reject_reason: null,
      });

      // Gửi push notification cho team lead
      try {
        const UserService = require("./user");
        const teamUser = await db.User.findByPk(team.user_id);
        if (teamUser?.expo_push_token) {
          await UserService.sendPushNotification(
            teamUser.expo_push_token,
            "🚨 Nhiệm vụ mới được giao",
            `Đội ${team.name} được phân công nhiệm vụ tại ${request.district}. Vui lòng xác nhận hoặc từ chối.`,
            {
              type: "mission_assigned",
              rescue_request_id: requestId,
            },
          );
        }
      } catch (e) {
        console.error("Failed to send push notification to team:", e);
      }

      await request.reload({
        include: [
          {
            model: this.UserModel,
            as: "creator",
            attributes: ["id", "username", "email"],
          },
          {
            model: this.UserModel,
            as: "verifier",
            attributes: ["id", "username", "email", "role"],
          },
          {
            model: this.UserModel,
            as: "assigner",
            attributes: ["id", "username", "email", "role"],
          },
          { model: db.RescueTeam, as: "assigned_team" },
        ],
      });
      return request;
    } catch (error) {
      throw error;
    }
  }

  // THÊM MỚI: Team xác nhận nhận nhiệm vụ → chuyển sang on_mission
  static async teamAcceptMission(requestId, userId) {
    try {
      const team = await db.RescueTeam.findOne({ where: { user_id: userId } });
      if (!team) throw new Error("No team associated with this account");

      const request = await this.getRescueRequestById(requestId);

      if (request.status !== "assigned") {
        throw new Error(
          `Cannot accept mission with status '${request.status}'.`,
        );
      }
      if (request.assigned_team_id !== team.id) {
        throw new Error("This mission is not assigned to your team");
      }

      const result = await transaction(async (t) => {
        await request.update({ status: "on_mission" }, { transaction: t });
        await team.update({ status: "on_mission" }, { transaction: t });
        return { request, team };
      });

      // Gửi push notification cho coordinator
      try {
        const UserService = require("./user");
        if (request.assigned_by) {
          const coordinator = await db.User.findByPk(request.assigned_by);
          if (coordinator?.expo_push_token) {
            await UserService.sendPushNotification(
              coordinator.expo_push_token,
              "✅ Đội đã nhận nhiệm vụ",
              `Đội ${team.name} đã xác nhận nhận nhiệm vụ tại ${request.district}.`,
              {
                type: "mission_accepted",
                rescue_request_id: requestId,
              },
            );
          }
        }
      } catch (e) {
        console.error("Failed to send push notification to coordinator:", e);
      }

      await result.request.reload({
        include: [
          {
            model: this.UserModel,
            as: "creator",
            attributes: ["id", "username", "email"],
          },
          {
            model: this.UserModel,
            as: "assigner",
            attributes: ["id", "username", "email", "role"],
          },
          { model: db.RescueTeam, as: "assigned_team" },
        ],
      });
      return result.request;
    } catch (error) {
      throw error;
    }
  }

  // THÊM MỚI: Team từ chối nhiệm vụ → quay về pending_verification
  static async teamRejectMission(requestId, userId, reason) {
    try {
      if (!reason || reason.trim().length === 0) {
        throw new Error("Rejection reason is required");
      }

      const team = await db.RescueTeam.findOne({ where: { user_id: userId } });
      if (!team) throw new Error("No team associated with this account");

      const request = await this.getRescueRequestById(requestId);

      if (request.status !== "assigned") {
        throw new Error(
          `Cannot reject mission with status '${request.status}'.`,
        );
      }
      if (request.assigned_team_id !== team.id) {
        throw new Error("This mission is not assigned to your team");
      }

      await request.update({
        status: "pending_verification",
        assigned_team_id: null,
        assigned_at: null,
        assigned_by: request.assigned_by,
        team_reject_reason: reason.trim(),
      });

      // Push notification (giữ nguyên như cũ)
      try {
        const UserService = require("./user");
        if (request.assigned_by) {
          const coordinator = await db.User.findByPk(request.assigned_by);
          if (coordinator?.expo_push_token) {
            await UserService.sendPushNotification(
              coordinator.expo_push_token,
              "❌ Đội từ chối nhiệm vụ",
              `Đội ${team.name} từ chối nhiệm vụ tại ${request.district}. Lý do: ${reason}`,
              {
                type: "mission_rejected_by_team",
                rescue_request_id: requestId,
                team_name: team.name,
                reason,
              },
            );
          }

          // THÊM MỚI: emit socket cho coordinator trên web
          try {
            const { getIO } = require("../config/socket");
            getIO()
              .to(`user:${request.assigned_by}`)
              .emit("mission_rejected_by_team", {
                rescue_request_id: requestId,
                district: request.district,
                team_name: team.name,
                reason: reason.trim(),
                timestamp: new Date().toISOString(),
              });
          } catch (e) {
            console.error("Failed to emit socket:", e);
          }
        }
      } catch (e) {
        console.error("Failed to send push notification to coordinator:", e);
      }

      await request.reload({
        include: [
          {
            model: this.UserModel,
            as: "creator",
            attributes: ["id", "username", "email"],
          },
          {
            model: this.UserModel,
            as: "assigner",
            attributes: ["id", "username", "email", "role"],
          },
          { model: db.RescueTeam, as: "assigned_team" },
        ],
      });
      return request;
    } catch (error) {
      throw error;
    }
  }

  static async completeMission(
    requestId,
    coordinatorId,
    completionNotes = null,
    completionMediaUrls = null,
  ) {
    try {
      const request = await this.getRescueRequestById(requestId);
      if (request.status !== "on_mission") {
        throw new Error(
          `Cannot complete request with status '${request.status}'.`,
        );
      }
      const coordinator = await this.UserModel.findByPk(coordinatorId);
      if (!coordinator) throw new Error("Coordinator not found");
      if (!["coordinator", "admin", "rescue_team"].includes(coordinator.role)) {
        throw new Error(
          "Only coordinators, admins or rescue teams can complete missions",
        );
      }
      if (!request.assigned_team_id)
        throw new Error("No team assigned to this request");
      const RescueTeamService = require("./rescue_team");
      const team = await RescueTeamService.getTeamById(
        request.assigned_team_id,
      );
      const result = await transaction(async (t) => {
        await request.update(
          {
            status: "completed",
            notes: completionNotes
              ? `${request.notes || ""}\nCompleted: ${completionNotes}`
              : request.notes,
            completion_media_urls: Array.isArray(completionMediaUrls)
              ? completionMediaUrls
              : request.completion_media_urls || [],
          },
          { transaction: t },
        );
        await team.update({ status: "available" }, { transaction: t });
        return { request, team };
      });
      await result.request.reload({
        include: [
          {
            model: this.UserModel,
            as: "creator",
            attributes: ["id", "username", "email"],
          },
          {
            model: this.UserModel,
            as: "verifier",
            attributes: ["id", "username", "email", "role"],
          },
          {
            model: this.UserModel,
            as: "assigner",
            attributes: ["id", "username", "email", "role"],
          },
          { model: db.RescueTeam, as: "assigned_team" },
        ],
      });
      return result.request;
    } catch (error) {
      throw error;
    }
  }

  static async linkGuestRequestsToUser(requestIds, userId) {
    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return { linked: 0, request_ids: [] };
    }
    const ids = [...new Set(requestIds)].filter(Boolean);
    const updated = await this.RescueRequestModel.update(
      { user_id: userId },
      { where: { id: ids, user_id: null } },
    );
    return { linked: updated[0] || 0, request_ids: ids };
  }

  static async updateRescueRequest(id, updateData, userId = null) {
    try {
      const request = await this.getRescueRequestById(id);
      const allowedFields = [
        "status",
        "priority",
        "notes",
        "verified_by",
        "verified_at",
      ];
      const filteredData = {};
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined)
          filteredData[field] = updateData[field];
      });
      if (updateData.status === "verified" && userId) {
        filteredData.verified_by = userId;
        filteredData.verified_at = new Date();
      }
      await request.update(filteredData);
      return request;
    } catch (error) {
      throw error;
    }
  }

  static async deleteRescueRequest(id) {
    try {
      const request = await this.getRescueRequestById(id);
      await request.destroy();
      return { message: "Rescue request deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const total = await this.RescueRequestModel.count();
      const byStatus = await this.RescueRequestModel.findAll({
        attributes: [
          "status",
          [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
        ],
        group: ["status"],
      });
      const byCategory = await this.RescueRequestModel.findAll({
        attributes: [
          "category",
          [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
        ],
        group: ["category"],
      });
      return {
        total,
        by_status: byStatus.map((s) => s.toJSON()),
        by_category: byCategory.map((c) => c.toJSON()),
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = RescueRequestService;
