const RescueTeamService = require("../services/rescue_team");

class RescueTeamController {
  /**
   * Create new rescue team (Admin only)
   */
  static async createTeam(req, res) {
    try {
      const teamData = req.body;

      console.log("📝 Creating rescue team:", teamData.name);

      const team = await RescueTeamService.createTeam(teamData);

      res.status(201).json({
        success: true,
        message: "Rescue team created successfully",
        data: team.toJSON(),
      });
    } catch (error) {
      console.error("❌ Failed to create team:", error.message);

      const statusCode = error.message.includes("already exists") ? 409 : 400;

      res.status(statusCode).json({
        success: false,
        message: "Failed to create rescue team",
        error: error.message,
      });
    }
  }

  /**
   * Get all teams with filters
   */
  static async getAllTeams(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        specialization,
        province_city,
      } = req.query;

      const filters = {
        status,
        specialization,
        province_city,
      };

      // Remove undefined filters
      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key],
      );

      const result = await RescueTeamService.getAllTeams(filters, page, limit);

      res.status(200).json({
        success: true,
        message: "Teams retrieved successfully",
        data: result.teams,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to retrieve teams",
        error: error.message,
      });
    }
  }

  /**
   * Get available teams
   * Useful for coordinators when assigning teams
   */
  static async getAvailableTeams(req, res) {
    try {
      const { province_city, specialization } = req.query;

      console.log(
        `🔍 Getting available teams${province_city ? ` in ${province_city}` : ""}${specialization ? ` for ${specialization}` : ""}`,
      );

      const teams = await RescueTeamService.getAvailableTeams(
        province_city,
        specialization,
      );

      res.status(200).json({
        success: true,
        message: "Available teams retrieved successfully",
        data: teams,
        count: teams.length,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to retrieve available teams",
        error: error.message,
      });
    }
  }

  /**
   * Get team by ID
   */
  static async getTeamById(req, res) {
    try {
      const { id } = req.params;
      const team = await RescueTeamService.getTeamById(id);

      res.status(200).json({
        success: true,
        message: "Team retrieved successfully",
        data: team.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message === "Team not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to retrieve team",
        error: error.message,
      });
    }
  }

  /**
   * Update team (Admin/Coordinator)
   */
  static async updateTeam(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      console.log("🔄 Updating team:", id);

      const team = await RescueTeamService.updateTeam(id, updateData);

      res.status(200).json({
        success: true,
        message: "Team updated successfully",
        data: team.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message === "Team not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to update team",
        error: error.message,
      });
    }
  }

  /**
   * Delete team (Admin only)
   */
  static async deleteTeam(req, res) {
    try {
      const { id } = req.params;
      const result = await RescueTeamService.deleteTeam(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      const statusCode = error.message === "Team not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to delete team",
        error: error.message,
      });
    }
  }
}

module.exports = RescueTeamController;
