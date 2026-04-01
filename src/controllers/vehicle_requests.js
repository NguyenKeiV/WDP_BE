const VehicleRequestService = require("../services/vehicle_request");
const RescueTeamService = require("../services/rescue_team");

class VehicleRequestController {
  /** Đội cứu hộ: lấy danh sách yêu cầu xe của đội (pending + approved) để xem và báo cáo thu hồi */
  static async getMyTeamRequests(req, res) {
    try {
      const team = await RescueTeamService.getTeamByUserId(req.user.id);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "No team associated with this account",
          error: "No team associated with this account",
        });
      }
      const { page = 1, limit = 20, status } = req.query;
      const filters = { team_id: team.id };
      if (status) filters.status = status;
      const result = await VehicleRequestService.getAllRequests(
        filters,
        parseInt(page) || 1,
        parseInt(limit) || 20,
      );
      res.status(200).json({
        success: true,
        message: "My team vehicle requests retrieved successfully",
        data: result.requests,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to retrieve my team vehicle requests",
        error: error.message,
      });
    }
  }

  static async getAllRequests(req, res) {
    try {
      const { page = 1, limit = 20, status, team_id } = req.query;
      const filters = { status, team_id };
      Object.keys(filters).forEach(
        (k) => filters[k] === undefined && delete filters[k],
      );

      // Sửa: truyền req.user để service tự filter theo role
      const result = await VehicleRequestService.getAllRequests(
        filters,
        page,
        limit,
        req.user, // <-- thêm dòng này
      );
      res.status(200).json({
        success: true,
        message: "Vehicle requests retrieved successfully",
        data: result.requests,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to retrieve vehicle requests",
        error: error.message,
      });
    }
  }

  static async getRequestById(req, res) {
    try {
      const { id } = req.params;
      const request = await VehicleRequestService.getRequestById(id);
      res.status(200).json({
        success: true,
        message: "Vehicle request retrieved successfully",
        data: request.toJSON(),
      });
    } catch (error) {
      const statusCode =
        error.message === "Vehicle request not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to retrieve vehicle request",
        error: error.message,
      });
    }
  }

  static async createRequest(req, res) {
    try {
      const coordinatorId = req.user.id;
      const request = await VehicleRequestService.createRequest(
        req.body,
        coordinatorId,
      );
      res.status(201).json({
        success: true,
        message: "Vehicle request created successfully",
        data: request.toJSON(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to create vehicle request",
        error: error.message,
      });
    }
  }

  static async approveRequest(req, res) {
    try {
      const { id } = req.params;
      const { vehicle_ids } = req.body;
      const managerId = req.user.id;

      if (!vehicle_ids || vehicle_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please select at least one vehicle",
        });
      }

      const request = await VehicleRequestService.approveRequest(
        id,
        managerId,
        vehicle_ids,
      );
      res.status(200).json({
        success: true,
        message: "Vehicle request approved. Vehicles assigned to team.",
        data: request.toJSON(),
      });
    } catch (error) {
      const statusCode =
        error.message === "Vehicle request not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to approve vehicle request",
        error: error.message,
      });
    }
  }

  static async rejectRequest(req, res) {
    try {
      const { id } = req.params;
      const { reject_reason } = req.body;
      const managerId = req.user.id;

      if (!reject_reason) {
        return res.status(400).json({
          success: false,
          message: "Reject reason is required",
        });
      }

      const request = await VehicleRequestService.rejectRequest(
        id,
        managerId,
        reject_reason,
      );
      res.status(200).json({
        success: true,
        message: "Vehicle request rejected",
        data: request.toJSON(),
      });
    } catch (error) {
      const statusCode =
        error.message === "Vehicle request not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to reject vehicle request",
        error: error.message,
      });
    }
  }

  static async returnVehicles(req, res) {
    try {
      const { id } = req.params;
      const managerId = req.user.id;
      const payload = req.body || {};

      const request = await VehicleRequestService.returnVehicles(
        id,
        managerId,
        payload,
      );
      res.status(200).json({
        success: true,
        message: "Vehicles returned successfully",
        data: request.toJSON(),
      });
    } catch (error) {
      const statusCode =
        error.message === "Vehicle request not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to return vehicles",
        error: error.message,
      });
    }
  }

  static async reportReturnByTeam(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const payload = req.body || {};

      const request = await VehicleRequestService.reportReturnByTeam(
        id,
        userId,
        payload,
      );

      // Emit socket notification đến manager đã duyệt yêu cầu
      try {
        const { getIO } = require("../config/socket");
        const io = getIO();
        const requestJson = request.toJSON();
        const managerId = requestJson.approved_by;
        if (managerId) {
          io.to(`user:${managerId}`).emit("vehicle_return_reported", {
            vehicle_request_id: requestJson.id,
            team_name: requestJson.team?.name || "Đội cứu hộ",
            vehicle_type: requestJson.vehicle_type,
            quantity: requestJson.quantity_needed,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (socketErr) {
        console.error("Failed to emit vehicle_return_reported socket:", socketErr);
      }

      res.status(200).json({
        success: true,
        message:
          "Báo cáo trả phương tiện đã được ghi nhận. Chờ quản lý xác nhận hoàn trả.",
        data: request.toJSON(),
      });
    } catch (error) {
      const statusCode =
        error.message === "Vehicle request not found"
          ? 404
          : error.message === "No team associated with this account"
            ? 404
            : error.message.includes("does not belong to your team")
              ? 403
              : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to report vehicle return",
        error: error.message,
      });
    }
  }
}

module.exports = VehicleRequestController;
