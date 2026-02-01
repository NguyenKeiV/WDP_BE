const { db, transaction } = require("../config/database");

class RescueRequestService {
  // Get RescueRequest model from database instance
  static get RescueRequestModel() {
    return db.RescueRequest;
  }

  static get UserModel() {
    return db.User;
  }

  /**
   * Create new rescue request
   * @param {Object} requestData - Rescue request data
   * @param {string|null} userId - User ID if logged in, null otherwise
   */
  static async createRescueRequest(requestData, userId = null) {
    try {
      const {
        category,
        province_city,
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

      // Validation
      if (
        !category ||
        !province_city ||
        !phone_number ||
        !description ||
        !location_type
      ) {
        throw new Error("Missing required fields");
      }

      // Validate location data
      if (location_type === "gps") {
        if (!latitude || !longitude) {
          throw new Error("GPS coordinates are required for GPS location type");
        }
      } else if (location_type === "manual") {
        if (!address) {
          throw new Error("Address is required for manual location type");
        }
      }

      // Create rescue request
      const rescueRequest = await transaction(async (t) => {
        return await this.RescueRequestModel.create(
          {
            category,
            province_city,
            phone_number,
            description,
            num_people: num_people || 1,
            priority,
            status: "new", // Default status when created
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

  /**
   * Get all rescue requests with filters and pagination
   */
  static async getAllRescueRequests(filters = {}, page = 1, limit = 20) {
    try {
      const { status, category, province_city, priority, user_id } = filters;

      const offset = (page - 1) * limit;

      // Build where clause
      const where = {};
      if (status) where.status = status;
      if (category) where.category = category;
      if (province_city) where.province_city = province_city;
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

  /**
   * Get rescue request by ID
   */
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
          {
            model: db.RescueTeam,
            as: "assigned_team",
          },
        ],
      });

      if (!request) {
        throw new Error("Rescue request not found");
      }

      return request;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Approve rescue request (Coordinator/Admin only)
   * Changes status from 'new' to 'pending_verification'
   * @param {string} id - Request ID
   * @param {string} coordinatorId - Coordinator/Admin user ID
   * @param {string} notes - Optional notes
   */
  static async approveRescueRequest(id, coordinatorId, notes = null) {
    try {
      const request = await this.getRescueRequestById(id);

      // Check if request is in 'new' status
      if (request.status !== "new") {
        throw new Error(
          `Cannot approve request with status '${request.status}'. Only 'new' requests can be approved.`,
        );
      }

      // Verify coordinator exists and has correct role
      const coordinator = await this.UserModel.findByPk(coordinatorId);
      if (!coordinator) {
        throw new Error("Coordinator not found");
      }

      if (!["coordinator", "admin"].includes(coordinator.role)) {
        throw new Error("Only coordinators or admins can approve requests");
      }

      // Update request
      await request.update({
        status: "pending_verification",
        verified_by: coordinatorId,
        verified_at: new Date(),
        notes: notes || "Request approved by coordinator",
      });

      // Reload with associations
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

      console.log(
        `✅ Request ${id} approved by ${coordinator.email} (${coordinator.role})`,
      );

      return request;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reject rescue request (Coordinator/Admin only)
   * Changes status from 'new' to 'rejected'
   * @param {string} id - Request ID
   * @param {string} coordinatorId - Coordinator/Admin user ID
   * @param {string} reason - Rejection reason (required)
   */
  static async rejectRescueRequest(id, coordinatorId, reason) {
    try {
      if (!reason || reason.trim().length === 0) {
        throw new Error("Rejection reason is required");
      }

      const request = await this.getRescueRequestById(id);

      // Check if request is in 'new' status
      if (request.status !== "new") {
        throw new Error(
          `Cannot reject request with status '${request.status}'. Only 'new' requests can be rejected.`,
        );
      }

      // Verify coordinator exists and has correct role
      const coordinator = await this.UserModel.findByPk(coordinatorId);
      if (!coordinator) {
        throw new Error("Coordinator not found");
      }

      if (!["coordinator", "admin"].includes(coordinator.role)) {
        throw new Error("Only coordinators or admins can reject requests");
      }

      // Update request
      await request.update({
        status: "rejected",
        verified_by: coordinatorId,
        verified_at: new Date(),
        notes: `Rejected: ${reason}`,
      });

      // Reload with associations
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

      console.log(
        `❌ Request ${id} rejected by ${coordinator.email} (${coordinator.role})`,
      );

      return request;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Assign team to rescue request (Coordinator/Admin only)
   * Changes status from 'pending_verification' to 'on_mission'
   * @param {string} requestId - Request ID
   * @param {string} teamId - Team ID to assign
   * @param {string} coordinatorId - Coordinator ID performing the assignment
   */
  static async assignTeamToRequest(requestId, teamId, coordinatorId) {
    try {
      const request = await this.getRescueRequestById(requestId);

      // Check if request is in 'pending_verification' status
      if (request.status !== "pending_verification") {
        throw new Error(
          `Cannot assign team to request with status '${request.status}'. Only 'pending_verification' requests can be assigned.`,
        );
      }

      // Verify coordinator exists and has correct role
      const coordinator = await this.UserModel.findByPk(coordinatorId);
      if (!coordinator) {
        throw new Error("Coordinator not found");
      }

      if (!["coordinator", "admin"].includes(coordinator.role)) {
        throw new Error("Only coordinators or admins can assign teams");
      }

      // Verify team exists and is available
      const RescueTeamService = require("./rescue_team");
      const team = await RescueTeamService.getTeamById(teamId);

      if (team.status !== "available") {
        throw new Error(
          `Team '${team.name}' is not available. Current status: ${team.status}`,
        );
      }

      // Update request and team in transaction
      const result = await transaction(async (t) => {
        // Update rescue request
        await request.update(
          {
            status: "on_mission",
            assigned_team_id: teamId,
            assigned_at: new Date(),
            assigned_by: coordinatorId,
          },
          { transaction: t },
        );

        // Update team status to on_mission
        await team.update(
          {
            status: "on_mission",
          },
          { transaction: t },
        );

        return { request, team };
      });

      // Reload with associations
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
          {
            model: db.RescueTeam,
            as: "assigned_team",
          },
        ],
      });

      console.log(
        `✅ Team '${team.name}' assigned to request ${requestId} by ${coordinator.email}`,
      );

      return result.request;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Complete rescue mission (Coordinator/Admin only)
   * Changes status from 'on_mission' to 'completed'
   * Sets team back to 'available'
   * @param {string} requestId - Request ID
   * @param {string} coordinatorId - Coordinator ID completing the mission
   * @param {string} completionNotes - Optional completion notes
   */
  static async completeMission(
    requestId,
    coordinatorId,
    completionNotes = null,
  ) {
    try {
      const request = await this.getRescueRequestById(requestId);

      // Check if request is on mission
      if (request.status !== "on_mission") {
        throw new Error(
          `Cannot complete request with status '${request.status}'. Only 'on_mission' requests can be completed.`,
        );
      }

      // Verify coordinator
      const coordinator = await this.UserModel.findByPk(coordinatorId);
      if (!coordinator) {
        throw new Error("Coordinator not found");
      }

      if (!["coordinator", "admin"].includes(coordinator.role)) {
        throw new Error("Only coordinators or admins can complete missions");
      }

      // Get assigned team
      if (!request.assigned_team_id) {
        throw new Error("No team assigned to this request");
      }

      const RescueTeamService = require("./rescue_team");
      const team = await RescueTeamService.getTeamById(
        request.assigned_team_id,
      );

      // Update request and team
      const result = await transaction(async (t) => {
        // Update request
        await request.update(
          {
            status: "completed",
            notes: completionNotes
              ? `${request.notes || ""}\nCompleted: ${completionNotes}`
              : request.notes,
          },
          { transaction: t },
        );

        // Set team back to available
        await team.update(
          {
            status: "available",
          },
          { transaction: t },
        );

        return { request, team };
      });

      // Reload with associations
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
          {
            model: db.RescueTeam,
            as: "assigned_team",
          },
        ],
      });

      console.log(
        `✅ Mission completed! Request ${requestId}, Team '${team.name}' now available`,
      );

      return result.request;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update rescue request
   * @param {string} id - Request ID
   * @param {Object} updateData - Data to update
   * @param {string} userId - User ID performing the update
   */
  static async updateRescueRequest(id, updateData, userId = null) {
    try {
      const request = await this.getRescueRequestById(id);

      // Only allow updating certain fields
      const allowedFields = [
        "status",
        "priority",
        "notes",
        "verified_by",
        "verified_at",
      ];

      const filteredData = {};
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      // If status is being changed to 'verified', set verified_by and verified_at
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

  /**
   * Delete rescue request (soft delete)
   */
  static async deleteRescueRequest(id) {
    try {
      const request = await this.getRescueRequestById(id);
      await request.destroy();
      return { message: "Rescue request deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get statistics
   */
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
