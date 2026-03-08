const RescueRequestService = require("../services/rescue_request");

class RescueRequestController {
  static async createRescueRequest(req, res) {
    try {
      const requestData = req.body;
      const userId = req.user ? req.user.id : null;
      const rescueRequest = await RescueRequestService.createRescueRequest(
        requestData,
        userId,
      );
      res.status(201).json({
        success: true,
        message: "Rescue request created successfully",
        data: rescueRequest.toJSON(),
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to create rescue request",
          error: error.message,
        });
    }
  }

  static async getMyTeamMissions(req, res) {
    try {
      const result = await RescueRequestService.getMyTeamMissions(req.user.id);
      res
        .status(200)
        .json({
          success: true,
          message: "Team missions retrieved successfully",
          data: result,
        });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to retrieve team missions",
          error: error.message,
        });
    }
  }

  static async getAllRescueRequests(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        category,
        district,
        priority,
        user_id,
      } = req.query;
      const filters = { status, category, district, priority, user_id };
      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key],
      );
      const result = await RescueRequestService.getAllRescueRequests(
        filters,
        page,
        limit,
      );
      res.status(200).json({
        success: true,
        message: "Rescue requests retrieved successfully",
        data: result.requests,
        pagination: result.pagination,
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to retrieve rescue requests",
          error: error.message,
        });
    }
  }

  static async getRescueRequestById(req, res) {
    try {
      const { id } = req.params;
      const request = await RescueRequestService.getRescueRequestById(id);
      res
        .status(200)
        .json({
          success: true,
          message: "Rescue request retrieved successfully",
          data: request.toJSON(),
        });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found" ? 404 : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to retrieve rescue request",
          error: error.message,
        });
    }
  }

  static async approveRescueRequest(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const request = await RescueRequestService.approveRescueRequest(
        id,
        req.user.id,
        notes,
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Rescue request approved successfully",
          data: request.toJSON(),
        });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("Only coordinators")
            ? 403
            : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to approve rescue request",
          error: error.message,
        });
    }
  }

  static async rejectRescueRequest(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason)
        return res
          .status(400)
          .json({ success: false, message: "Rejection reason is required" });
      const request = await RescueRequestService.rejectRescueRequest(
        id,
        req.user.id,
        reason,
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Rescue request rejected successfully",
          data: request.toJSON(),
        });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("Only coordinators")
            ? 403
            : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to reject rescue request",
          error: error.message,
        });
    }
  }

  static async assignTeam(req, res) {
    try {
      const { id } = req.params;
      const { team_id } = req.body;
      if (!team_id)
        return res
          .status(400)
          .json({ success: false, message: "Team ID is required" });
      const request = await RescueRequestService.assignTeamToRequest(
        id,
        team_id,
        req.user.id,
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Team assigned successfully.",
          data: request.toJSON(),
        });
    } catch (error) {
      const statusCode = [
        "Rescue request not found",
        "Team not found",
      ].includes(error.message)
        ? 404
        : error.message.includes("Only coordinators")
          ? 403
          : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to assign team",
          error: error.message,
        });
    }
  }

  static async completeMission(req, res) {
    try {
      const { id } = req.params;
      const { completion_notes } = req.body;
      const request = await RescueRequestService.completeMission(
        id,
        req.user.id,
        completion_notes,
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Mission completed successfully.",
          data: request.toJSON(),
        });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("Only coordinators")
            ? 403
            : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to complete mission",
          error: error.message,
        });
    }
  }

  static async updateRescueRequest(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user.id : null;
      const request = await RescueRequestService.updateRescueRequest(
        id,
        req.body,
        userId,
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Rescue request updated successfully",
          data: request.toJSON(),
        });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found" ? 404 : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to update rescue request",
          error: error.message,
        });
    }
  }

  static async deleteRescueRequest(req, res) {
    try {
      const { id } = req.params;
      const result = await RescueRequestService.deleteRescueRequest(id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found" ? 404 : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to delete rescue request",
          error: error.message,
        });
    }
  }

  static async getStatistics(req, res) {
    try {
      const stats = await RescueRequestService.getStatistics();
      res
        .status(200)
        .json({
          success: true,
          message: "Statistics retrieved successfully",
          data: stats,
        });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to retrieve statistics",
          error: error.message,
        });
    }
  }
}

module.exports = RescueRequestController;
