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
   * Update rescue request
   * Should be protected - only admin/volunteer can update
   */
  static async updateRescueRequest(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user ? req.user.id : null;

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
