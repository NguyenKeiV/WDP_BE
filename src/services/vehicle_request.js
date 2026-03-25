const { db, transaction } = require("../config/database");

class VehicleRequestService {
  static get VehicleRequestModel() {
    return db.VehicleRequest;
  }

  static get VehicleModel() {
    return db.Vehicle;
  }

  // Sửa: thêm tham số userRole và userTeamId để filter đúng cho rescue_team
  static async getAllRequests(filters = {}, page = 1, limit = 20, user = null) {
    try {
      const { status, team_id, rescue_request_id } = filters;
      const offset = (page - 1) * limit;
      const where = {};
      if (status) where.status = status;

      // Nếu là rescue_team → chỉ xem requests của team mình
      if (user && user.role === "rescue_team") {
        const myTeam = await db.RescueTeam.findOne({
          where: { user_id: user.id },
        });
        if (!myTeam) {
          // Không có team → trả về rỗng
          return {
            requests: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              totalPages: 0,
            },
          };
        }
        where.team_id = myTeam.id;
      } else if (team_id) {
        // Với role khác, cho phép filter theo team_id nếu truyền vào
        where.team_id = team_id;
      }

      if (rescue_request_id) {
        where.rescue_request_id = rescue_request_id;
      }

      const { count, rows } = await this.VehicleRequestModel.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
        include: [
          {
            model: db.RescueRequest,
            as: "rescue_request",
            attributes: ["id", "category", "description", "district", "status"],
          },
          {
            model: db.RescueTeam,
            as: "team",
            attributes: ["id", "name", "district"],
          },
          {
            model: db.User,
            as: "coordinator",
            attributes: ["id", "username", "email"],
          },
          {
            model: db.User,
            as: "manager",
            attributes: ["id", "username", "email"],
          },
          {
            model: db.Vehicle,
            as: "assigned_vehicles",
            attributes: ["id", "name", "type", "license_plate", "status"],
          },
        ],
      });

      return {
        requests: rows.map((r) => r.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  static async getRequestById(id) {
    try {
      const request = await this.VehicleRequestModel.findByPk(id, {
        include: [
          {
            model: db.RescueRequest,
            as: "rescue_request",
            attributes: ["id", "category", "description", "district", "status"],
          },
          {
            model: db.RescueTeam,
            as: "team",
            attributes: ["id", "name", "district"],
          },
          {
            model: db.User,
            as: "coordinator",
            attributes: ["id", "username", "email"],
          },
          {
            model: db.User,
            as: "manager",
            attributes: ["id", "username", "email"],
          },
          {
            model: db.Vehicle,
            as: "assigned_vehicles",
            attributes: ["id", "name", "type", "license_plate", "status"],
          },
        ],
      });
      if (!request) throw new Error("Vehicle request not found");
      return request;
    } catch (error) {
      throw error;
    }
  }

  static async createRequest(data, coordinatorId) {
    try {
      const {
        rescue_request_id,
        team_id,
        vehicle_type,
        quantity_needed,
        reason,
        notes,
      } = data;

      if (!rescue_request_id || !team_id || !vehicle_type || !reason) {
        throw new Error("Missing required fields");
      }

      const rescueRequest = await db.RescueRequest.findByPk(rescue_request_id);
      if (!rescueRequest) throw new Error("Rescue request not found");

      const team = await db.RescueTeam.findByPk(team_id);
      if (!team) throw new Error("Team not found");

      const request = await this.VehicleRequestModel.create({
        rescue_request_id,
        team_id,
        vehicle_type,
        quantity_needed: quantity_needed || 1,
        reason,
        notes,
        requested_by: coordinatorId,
        status: "pending",
      });

      return await this.getRequestById(request.id);
    } catch (error) {
      throw error;
    }
  }

  static async approveRequest(id, managerId, vehicleIds) {
    try {
      const request = await this.getRequestById(id);

      if (request.status !== "pending") {
        throw new Error(
          `Cannot approve request with status '${request.status}'`,
        );
      }

      if (!vehicleIds || vehicleIds.length === 0) {
        throw new Error("Please select at least one vehicle to assign");
      }

      const vehicles = await this.VehicleModel.findAll({
        where: { id: vehicleIds },
      });

      if (vehicles.length !== vehicleIds.length) {
        throw new Error("One or more vehicles not found");
      }

      const unavailable = vehicles.filter((v) => v.status !== "available");
      if (unavailable.length > 0) {
        throw new Error(
          `Vehicles not available: ${unavailable.map((v) => v.name).join(", ")}`,
        );
      }

      await transaction(async (t) => {
        await request.update(
          { status: "approved", approved_by: managerId },
          { transaction: t },
        );
        for (const vehicle of vehicles) {
          await vehicle.update(
            {
              status: "in_use",
              assigned_team_id: request.team_id,
              vehicle_request_id: id,
            },
            { transaction: t },
          );
        }
      });

      const updatedRequest = await this.getRequestById(id);

      try {
        const UserService = require("./user");
        const team = await db.RescueTeam.findByPk(updatedRequest.team_id);
        if (team?.user_id) {
          const teamUser = await db.User.findByPk(team.user_id);
          if (teamUser?.expo_push_token) {
            const vehicleNames = updatedRequest.assigned_vehicles
              .map((v) => v.name)
              .join(", ");
            await UserService.sendPushNotification(
              teamUser.expo_push_token,
              "🚗 Phương tiện đã được cấp",
              `Đội ${updatedRequest.team?.name} đã được cấp: ${vehicleNames}. Vui lòng lên kho nhận phương tiện.`,
              {
                type: "vehicle_approved",
                vehicle_request_id: id,
              },
            );
          }
        }
      } catch (e) {
        console.error("Failed to send push notification:", e);
      }

      return updatedRequest;
    } catch (error) {
      throw error;
    }
  }

  static async rejectRequest(id, managerId, reject_reason) {
    try {
      const request = await this.getRequestById(id);

      if (request.status !== "pending") {
        throw new Error(
          `Cannot reject request with status '${request.status}'`,
        );
      }

      if (!reject_reason) throw new Error("Reject reason is required");

      await request.update({
        status: "rejected",
        approved_by: managerId,
        reject_reason,
      });

      return await this.getRequestById(id);
    } catch (error) {
      throw error;
    }
  }

  static async returnVehicles(id, managerId, payload = {}) {
    try {
      const request = await this.getRequestById(id);

      if (!["approved", "pending_return"].includes(request.status)) {
        throw new Error(
          `Cannot return vehicles for request with status '${request.status}'`,
        );
      }

      const returnedAt = new Date();
      const managerNotes = payload?.manager_notes || null;
      const currentReport =
        request.return_report && typeof request.return_report === "object"
          ? request.return_report
          : {};
      const mergedReturnReport = {
        ...currentReport,
        confirmed_by_manager: managerId,
        confirmed_at: returnedAt,
        manager_notes: managerNotes,
      };

      await transaction(async (t) => {
        await request.update(
          {
            status: "returned",
            returned_at: returnedAt,
            approved_by: managerId,
            return_report: mergedReturnReport,
          },
          { transaction: t },
        );

        await this.VehicleModel.update(
          {
            status: "available",
            assigned_team_id: null,
            vehicle_request_id: null,
          },
          {
            where: { vehicle_request_id: id },
            transaction: t,
          },
        );
      });

      return await this.getRequestById(id);
    } catch (error) {
      throw error;
    }
  }

  static async reportReturnByTeam(id, userId, payload = {}) {
    try {
      const RescueTeamService = require("./rescue_team");
      const team = await RescueTeamService.getTeamByUserId(userId);
      if (!team) throw new Error("No team associated with this account");

      const request = await this.getRequestById(id);
      if (request.team_id !== team.id) {
        throw new Error("This vehicle request does not belong to your team");
      }
      if (request.status !== "approved") {
        throw new Error(
          `Cannot report return for request with status '${request.status}'`,
        );
      }

      const {
        checklist = [],
        fuel_level = null,
        damage_report = null,
        return_notes = null,
        return_media_urls = [],
      } = payload;

      if (!Array.isArray(checklist)) {
        throw new Error("'checklist' must be an array of strings");
      }
      if (checklist.some((item) => typeof item !== "string")) {
        throw new Error("'checklist' must be an array of strings");
      }
      if (fuel_level !== null) {
        const fuel = Number(fuel_level);
        if (!Number.isFinite(fuel) || fuel < 0 || fuel > 100) {
          throw new Error("'fuel_level' must be a number between 0 and 100");
        }
      }
      if (damage_report !== null && typeof damage_report !== "string") {
        throw new Error("'damage_report' must be a string");
      }
      if (return_notes !== null && typeof return_notes !== "string") {
        throw new Error("'return_notes' must be a string");
      }
      if (!Array.isArray(return_media_urls)) {
        throw new Error("'return_media_urls' must be an array");
      }

      const reportedAt = new Date();
      const returnReportPayload = {
        checklist,
        fuel_level: fuel_level === null ? null : Number(fuel_level),
        damage_report,
        return_notes,
        return_media_urls: return_media_urls.filter(Boolean),
        reported_at: reportedAt,
        reported_by: userId,
      };

      await request.update({
        status: "pending_return",
        return_report: returnReportPayload,
        return_reported_at: reportedAt,
        return_reported_by: userId,
      });

      return await this.getRequestById(id);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = VehicleRequestService;
