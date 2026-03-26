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
      res
        .status(201)
        .json({
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

  static async linkToMe(req, res) {
    try {
      const { request_ids: requestIds } = req.body;
      const userId = req.user.id;
      const result = await RescueRequestService.linkGuestRequestsToUser(
        requestIds,
        userId,
      );
      res
        .status(200)
        .json({
          success: true,
          message: `Đã gắn ${result.linked} yêu cầu vào tài khoản của bạn`,
          data: result,
        });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to link requests",
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
      res
        .status(200)
        .json({
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
      const { team_id, reason } = req.body;
      if (!team_id)
        return res
          .status(400)
          .json({ success: false, message: "Team ID is required" });
      const request = await RescueRequestService.assignTeamToRequest(
        id,
        team_id,
        req.user.id,
        reason,
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Team assigned. Waiting for team confirmation.",
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

  // THÊM MỚI: Team xác nhận nhận nhiệm vụ
  static async teamAcceptMission(req, res) {
    try {
      const { id } = req.params;
      const request = await RescueRequestService.teamAcceptMission(
        id,
        req.user.id,
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Đã xác nhận nhận nhiệm vụ.",
          data: request.toJSON(),
        });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("not assigned to your team")
            ? 403
            : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to accept mission",
          error: error.message,
        });
    }
  }

  // THÊM MỚI: Team từ chối nhiệm vụ
  static async teamRejectMission(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason || !reason.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Lý do từ chối là bắt buộc" });
      }
      const request = await RescueRequestService.teamRejectMission(
        id,
        req.user.id,
        reason,
      );
      res
        .status(200)
        .json({
          success: true,
          message: "Đã từ chối nhiệm vụ. Yêu cầu quay về chờ phân công.",
          data: request.toJSON(),
        });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("not assigned to your team")
            ? 403
            : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to reject mission",
          error: error.message,
        });
    }
  }

  // Team báo cáo đã/không thực hiện nhiệm vụ (chờ coordinator xác nhận)
  static async teamReportExecution(req, res) {
    try {
      const { id } = req.params;
      const {
        executed,
        outcome,
        unmet_people_count,
        partial_reason,
        report_notes,
        report_media_urls,
      } = req.body;

      const request = await RescueRequestService.teamReportExecution(
        id,
        req.user.id,
        {
          executed,
          outcome,
          unmet_people_count,
          partial_reason,
          reportNotes: report_notes,
          reportMediaUrls: report_media_urls,
        },
      );

      res.status(200).json({
        success: true,
        message: "Đã gửi báo cáo thực hiện nhiệm vụ. Chờ điều phối xác nhận.",
        data: request.toJSON(),
      });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("not assigned to your team")
            ? 403
            : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to report mission execution",
        error: error.message,
      });
    }
  }

  // Coordinator/Admin xác nhận báo cáo thực hiện của team
  static async confirmTeamExecution(req, res) {
    try {
      const { id } = req.params;
      const { confirmed, confirmation_notes } = req.body;

      const request = await RescueRequestService.confirmTeamExecution(
        id,
        req.user.id,
        {
          confirmed,
          confirmationNotes: confirmation_notes,
        },
      );

      res.status(200).json({
        success: true,
        message: "Đã xác nhận báo cáo thực hiện nhiệm vụ của team.",
        data: request.toJSON(),
      });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("Only coordinators")
            ? 403
            : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to confirm mission execution report",
        error: error.message,
      });
    }
  }

  static async completeMission(req, res) {
    try {
      const { id } = req.params;
      const {
        completion_notes,
        completion_media_urls,
        completion_outcome,
        unmet_people_count,
        partial_reason,
      } = req.body;
      const request = await RescueRequestService.completeMission(
        id,
        req.user.id,
        completion_notes,
        completion_media_urls,
        completion_outcome,
        unmet_people_count,
        partial_reason,
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

  static async reportMissionIncomplete(req, res) {
    try {
      const { id } = req.params;
      const { reason, failure_media_urls } = req.body;
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({
          success: false,
          message: "reason is required",
        });
      }
      const request = await RescueRequestService.reportMissionIncomplete(
        id,
        req.user.id,
        reason,
        failure_media_urls,
      );
      res.status(200).json({
        success: true,
        message: "Đã gửi báo cáo không hoàn thành nhiệm vụ.",
        data: request.toJSON(),
      });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("not assigned to your team") ||
              error.message.includes("Not allowed")
            ? 403
            : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to report incomplete mission",
        error: error.message,
      });
    }
  }

  static async citizenConfirmRescue(req, res) {
    try {
      const { id } = req.params;
      const { confirmed, feedback_notes } = req.body;

      const request = await RescueRequestService.citizenConfirmRescue(
        id,
        req.user.id,
        {
          confirmed,
          feedbackNotes: feedback_notes,
        },
      );

      res.status(200).json({
        success: true,
        message: "Citizen confirmation saved successfully",
        data: request.toJSON(),
      });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("Only the request creator")
            ? 403
            : 400;

      res.status(statusCode).json({
        success: false,
        message: "Failed to save citizen confirmation",
        error: error.message,
      });
    }
  }

  static async updateRescueRequest(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user.id : null;
      const requesterRole = req.user ? req.user.role : null;
      const request = await RescueRequestService.updateRescueRequest(
        id,
        { ...req.body, __requester_role: requesterRole },
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
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("Access denied") ||
              error.message.includes("Citizens can only update notes")
            ? 403
            : 400;
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

  static async getTacticalMapStats(req, res) {
    try {
      const stats = await RescueRequestService.getTacticalMapStats();
      res.status(200).json({
        success: true,
        message: "Tactical map statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to retrieve tactical map statistics",
        error: error.message,
      });
    }
  }
}

module.exports = RescueRequestController;
