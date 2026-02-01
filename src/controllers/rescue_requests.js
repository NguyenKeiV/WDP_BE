const RescueRequestService = require("../services/rescue_request");

class RescueRequestController {
  /**
   * Create new rescue request
   * Can be called by logged-in users or anonymous users
   */
  static async createRescueRequest(req, res) {
    try {
      const requestData = req.body;
      const userId = req.user ? req.user.id : null; // If authenticated, get user ID

      // Debug log
      console.log("📝 Creating rescue request");
      console.log("👤 User ID:", userId || "ANONYMOUS");
      console.log("📊 Request data:", {
        category: requestData.category,
        province_city: requestData.province_city,
        phone_number: requestData.phone_number,
      });

      const rescueRequest = await RescueRequestService.createRescueRequest(
        requestData,
        userId,
      );

      console.log("✅ Rescue request created:", rescueRequest.id);

      res.status(201).json({
        success: true,
        message: "Rescue request created successfully",
        data: rescueRequest.toJSON(),
      });
    } catch (error) {
      console.error("❌ Failed to create rescue request:", error.message);
      res.status(400).json({
        success: false,
        message: "Failed to create rescue request",
        error: error.message,
      });
    }
  }

  /**
   * Get all rescue requests with filters
   */
  static async getAllRescueRequests(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        category,
        province_city,
        priority,
        user_id,
      } = req.query;

      // Debug log
      console.log("📋 Getting all rescue requests");
      console.log("👤 Authenticated user:", req.user ? req.user.id : "NONE");

      const filters = {
        status,
        category,
        province_city,
        priority,
        user_id,
      };

      // Remove undefined filters
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
      res.status(400).json({
        success: false,
        message: "Failed to retrieve rescue requests",
        error: error.message,
      });
    }
  }

  /**
   * Get rescue request by ID
   */
  static async getRescueRequestById(req, res) {
    try {
      const { id } = req.params;
      const request = await RescueRequestService.getRescueRequestById(id);

      res.status(200).json({
        success: true,
        message: "Rescue request retrieved successfully",
        data: request.toJSON(),
      });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to retrieve rescue request",
        error: error.message,
      });
    }
  }

  /**
   * Approve rescue request (Coordinator/Admin only)
   * Changes status from 'new' to 'pending_verification'
   */
  static async approveRescueRequest(req, res) {
    try {
      const { id } = req.params;
      const coordinatorId = req.user.id;
      const { notes } = req.body;

      console.log(`✅ Approving request ${id} by coordinator ${coordinatorId}`);

      const request = await RescueRequestService.approveRescueRequest(
        id,
        coordinatorId,
        notes,
      );

      res.status(200).json({
        success: true,
        message: "Rescue request approved successfully",
        data: request.toJSON(),
      });
    } catch (error) {
      console.error("❌ Failed to approve request:", error.message);

      const statusCode =
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("Only coordinators")
            ? 403
            : 400;

      res.status(statusCode).json({
        success: false,
        message: "Failed to approve rescue request",
        error: error.message,
      });
    }
  }

  /**
   * Reject rescue request (Coordinator/Admin only)
   * Changes status from 'new' to 'rejected'
   */
  static async rejectRescueRequest(req, res) {
    try {
      const { id } = req.params;
      const coordinatorId = req.user.id;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
          error: "Please provide a reason for rejection",
        });
      }

      console.log(`❌ Rejecting request ${id} by coordinator ${coordinatorId}`);

      const request = await RescueRequestService.rejectRescueRequest(
        id,
        coordinatorId,
        reason,
      );

      res.status(200).json({
        success: true,
        message: "Rescue request rejected successfully",
        data: request.toJSON(),
      });
    } catch (error) {
      console.error("❌ Failed to reject request:", error.message);

      const statusCode =
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("Only coordinators")
            ? 403
            : 400;

      res.status(statusCode).json({
        success: false,
        message: "Failed to reject rescue request",
        error: error.message,
      });
    }
  }

  /**
   * Assign team to rescue request (Coordinator/Admin only)
   * Changes status from 'pending_verification' to 'on_mission'
   */
  static async assignTeam(req, res) {
    try {
      const { id } = req.params; // Request ID
      const { team_id } = req.body; // Team ID to assign
      const coordinatorId = req.user.id;

      if (!team_id) {
        return res.status(400).json({
          success: false,
          message: "Team ID is required",
          error: "Please provide team_id in request body",
        });
      }

      console.log(
        `🚨 Assigning team ${team_id} to request ${id} by coordinator ${coordinatorId}`,
      );

      const request = await RescueRequestService.assignTeamToRequest(
        id,
        team_id,
        coordinatorId,
      );

      res.status(200).json({
        success: true,
        message: "Team assigned successfully. Request is now ON MISSION.",
        data: request.toJSON(),
      });
    } catch (error) {
      console.error("❌ Failed to assign team:", error.message);

      const statusCode =
        error.message === "Rescue request not found" ||
        error.message === "Team not found"
          ? 404
          : error.message.includes("Only coordinators")
            ? 403
            : 400;

      res.status(statusCode).json({
        success: false,
        message: "Failed to assign team",
        error: error.message,
      });
    }
  }

  /**
   * Complete mission (Coordinator/Admin only)
   * Changes status from 'on_mission' to 'completed'
   */
  static async completeMission(req, res) {
    try {
      const { id } = req.params;
      const { completion_notes } = req.body;
      const coordinatorId = req.user.id;

      console.log(
        `✅ Completing mission for request ${id} by coordinator ${coordinatorId}`,
      );

      const request = await RescueRequestService.completeMission(
        id,
        coordinatorId,
        completion_notes,
      );

      res.status(200).json({
        success: true,
        message: "Mission completed successfully. Team is now available.",
        data: request.toJSON(),
      });
    } catch (error) {
      console.error("❌ Failed to complete mission:", error.message);

      const statusCode =
        error.message === "Rescue request not found"
          ? 404
          : error.message.includes("Only coordinators")
            ? 403
            : 400;

      res.status(statusCode).json({
        success: false,
        message: "Failed to complete mission",
        error: error.message,
      });
    }
  }

  /**
   * Update rescue request
   * Should be protected - only admin/volunteer can update
   */
  static async updateRescueRequest(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user ? req.user.id : null;

      // Debug log
      console.log("🔄 Updating rescue request:", id);
      console.log("👤 User ID:", userId || "NONE");

      const request = await RescueRequestService.updateRescueRequest(
        id,
        updateData,
        userId,
      );

      res.status(200).json({
        success: true,
        message: "Rescue request updated successfully",
        data: request.toJSON(),
      });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to update rescue request",
        error: error.message,
      });
    }
  }

  /**
   * Delete rescue request
   */
  static async deleteRescueRequest(req, res) {
    try {
      const { id } = req.params;
      const result = await RescueRequestService.deleteRescueRequest(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      const statusCode =
        error.message === "Rescue request not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to delete rescue request",
        error: error.message,
      });
    }
  }

  /**
   * Get statistics
   */
  static async getStatistics(req, res) {
    try {
      const stats = await RescueRequestService.getStatistics();

      res.status(200).json({
        success: true,
        message: "Statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to retrieve statistics",
        error: error.message,
      });
    }
  }
}

module.exports = RescueRequestController;
