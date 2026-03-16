const { db, transaction } = require("../config/database");

class RescueTeamService {
  static get RescueTeamModel() {
    return db.RescueTeam;
  }

  static get RescueRequestModel() {
    return db.RescueRequest;
  }

  /**
   * Create new rescue team
   */
  static async createTeam(data) {
    try {
      const {
        name,
        phone_number,
        specialization,
        capacity,
        available_members,
        district,
        notes,
        user_id,
      } = data;

      // Validation
      if (!name || !phone_number || !district || !user_id || !capacity) {
        throw new Error("Missing required fields");
      }

      // Kiểm tra user tồn tại và có role rescue_team
      const user = await db.User.findByPk(user_id);
      if (!user) throw new Error("User not found");
      if (user.role !== "rescue_team") {
        throw new Error("Tài khoản được liên kết phải có role rescue_team");
      }

      // Kiểm tra user chưa được liên kết với đội nào
      const existingTeam = await this.RescueTeamModel.findOne({
        where: { user_id },
      });
      if (existingTeam) {
        throw new Error("Tài khoản này đã được liên kết với đội khác");
      }

      const team = await this.RescueTeamModel.create({
        name,
        phone_number,
        specialization: specialization || "rescue",
        capacity,
        available_members: available_members || 0,
        district,
        notes,
        user_id,
        status: "available",
      });

      // Reload với thông tin leader
      await team.reload({
        include: [
          {
            model: db.User,
            as: "leader_account",
            attributes: ["id", "username", "email"],
          },
        ],
      });

      return team;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all teams with filters
   */
  static async getAllTeams(filters = {}, page = 1, limit = 20) {
    try {
      const { status, specialization, province_city } = filters;

      const offset = (page - 1) * limit;

      // Build where clause
      const where = {};
      if (status) where.status = status;
      if (specialization) where.specialization = specialization;
      if (province_city) where.province_city = province_city;

      const { count, rows: teams } = await this.RescueTeamModel.findAndCountAll(
        {
          where,
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [["created_at", "DESC"]],
        },
      );

      return {
        teams: teams.map((team) => team.toJSON()),
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
   * Get available teams
   * Returns teams with status 'available' in specific province/city
   */
  static async getAvailableTeams(province_city = null, specialization = null) {
    try {
      const where = { status: "available" };

      if (province_city) {
        where.province_city = province_city;
      }

      if (specialization) {
        where.specialization = specialization;
      }

      const teams = await this.RescueTeamModel.findAll({
        where,
        order: [["created_at", "ASC"]],
      });

      console.log(
        `🔍 Found ${teams.length} available teams${province_city ? ` in ${province_city}` : ""}${specialization ? ` with specialization ${specialization}` : ""}`,
      );

      return teams.map((team) => team.toJSON());
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get team by ID
   */
  static async getTeamById(id) {
    try {
      const team = await this.RescueTeamModel.findByPk(id, {
        include: [
          {
            model: this.RescueRequestModel,
            as: "assigned_requests",
            where: { status: "on_mission" },
            required: false,
          },
        ],
      });

      if (!team) {
        throw new Error("Team not found");
      }

      return team;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get team by user_id (leader account)
   */
  static async getTeamByUserId(userId) {
    try {
      const team = await this.RescueTeamModel.findOne({
        where: { user_id: userId },
      });
      return team;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update team
   */
  static async updateTeam(id, data) {
    try {
      const team = await this.getTeamById(id);

      const {
        name,
        phone_number,
        specialization,
        capacity,
        available_members,
        district,
        notes,
        user_id,
        status,
      } = data;

      // Nếu đổi user_id thì kiểm tra lại
      if (user_id && user_id !== team.user_id) {
        const user = await db.User.findByPk(user_id);
        if (!user) throw new Error("User not found");
        if (user.role !== "rescue_team") {
          throw new Error("Tài khoản được liên kết phải có role rescue_team");
        }
        const existingTeam = await this.RescueTeamModel.findOne({
          where: { user_id },
        });
        if (existingTeam && existingTeam.id !== id) {
          throw new Error("Tài khoản này đã được liên kết với đội khác");
        }
      }

      const allowedFields = {
        name,
        phone_number,
        specialization,
        capacity,
        available_members,
        district,
        notes,
        user_id,
        status,
      };
      const filtered = {};
      Object.keys(allowedFields).forEach((k) => {
        if (allowedFields[k] !== undefined) filtered[k] = allowedFields[k];
      });

      await team.update(filtered);

      await team.reload({
        include: [
          {
            model: db.User,
            as: "leader_account",
            attributes: ["id", "username", "email"],
          },
        ],
      });

      return team;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete team (soft delete)
   */
  static async deleteTeam(id) {
    try {
      const team = await this.getTeamById(id);

      // Check if team is currently on mission
      if (team.status === "on_mission") {
        throw new Error("Cannot delete team that is currently on mission");
      }

      await team.destroy();
      console.log(`✅ Team deleted: ${team.name}`);
      return { message: "Team deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set team status to 'on_mission'
   */
  static async setTeamOnMission(teamId) {
    try {
      const team = await this.getTeamById(teamId);

      if (team.status !== "available") {
        throw new Error(
          `Team is not available. Current status: ${team.status}`,
        );
      }

      await team.update({ status: "on_mission" });
      console.log(`🚨 Team ${team.name} is now ON MISSION`);
      return team;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set team status back to 'available' after completing mission
   */
  static async setTeamAvailable(teamId) {
    try {
      const team = await this.getTeamById(teamId);

      await team.update({ status: "available" });
      console.log(`✅ Team ${team.name} is now AVAILABLE`);
      return team;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = RescueTeamService;
