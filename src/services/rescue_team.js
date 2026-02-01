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
  static async createTeam(teamData) {
    try {
      const {
        name,
        leader_name,
        phone_number,
        specialization,
        capacity,
        current_members,
        province_city,
        equipment,
        notes,
      } = teamData;

      // Validation
      if (!name || !leader_name || !phone_number || !province_city) {
        throw new Error("Missing required fields");
      }

      // Check if team name already exists
      const existingTeam = await this.RescueTeamModel.findOne({
        where: { name },
      });

      if (existingTeam) {
        throw new Error("Team with this name already exists");
      }

      const team = await transaction(async (t) => {
        return await this.RescueTeamModel.create(
          {
            name,
            leader_name,
            phone_number,
            specialization: specialization || "general",
            capacity: capacity || 5,
            current_members: current_members || 0,
            status: "available",
            province_city,
            equipment: equipment || [],
            notes,
          },
          { transaction: t },
        );
      });

      console.log(`✅ Team created: ${team.name} (${team.id})`);
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
   * Update team
   */
  static async updateTeam(id, updateData) {
    try {
      const team = await this.getTeamById(id);

      const allowedFields = [
        "name",
        "leader_name",
        "phone_number",
        "specialization",
        "capacity",
        "current_members",
        "status",
        "province_city",
        "equipment",
        "notes",
      ];

      const filteredData = {};
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      await team.update(filteredData);

      console.log(`✅ Team updated: ${team.name}`);
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
