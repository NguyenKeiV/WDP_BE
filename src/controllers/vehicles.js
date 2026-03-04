const VehicleService = require("../services/vehicle");

class VehicleController {
  static async getAllVehicles(req, res) {
    try {
      const { page = 1, limit = 20, status, type, province_city } = req.query;
      const filters = { status, type, province_city };
      Object.keys(filters).forEach(
        (k) => filters[k] === undefined && delete filters[k],
      );

      const result = await VehicleService.getAllVehicles(filters, page, limit);
      res.status(200).json({
        success: true,
        message: "Vehicles retrieved successfully",
        data: result.vehicles,
        pagination: result.pagination,
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to retrieve vehicles",
          error: error.message,
        });
    }
  }

  static async getVehicleById(req, res) {
    try {
      const { id } = req.params;
      const vehicle = await VehicleService.getVehicleById(id);
      res.status(200).json({
        success: true,
        message: "Vehicle retrieved successfully",
        data: vehicle.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message === "Vehicle not found" ? 404 : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to retrieve vehicle",
          error: error.message,
        });
    }
  }

  static async createVehicle(req, res) {
    try {
      const vehicle = await VehicleService.createVehicle(req.body);
      res.status(201).json({
        success: true,
        message: "Vehicle created successfully",
        data: vehicle.toJSON(),
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to create vehicle",
          error: error.message,
        });
    }
  }

  static async updateVehicle(req, res) {
    try {
      const { id } = req.params;
      const vehicle = await VehicleService.updateVehicle(id, req.body);
      res.status(200).json({
        success: true,
        message: "Vehicle updated successfully",
        data: vehicle.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message === "Vehicle not found" ? 404 : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to update vehicle",
          error: error.message,
        });
    }
  }

  static async deleteVehicle(req, res) {
    try {
      const { id } = req.params;
      const result = await VehicleService.deleteVehicle(id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      const statusCode = error.message === "Vehicle not found" ? 404 : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to delete vehicle",
          error: error.message,
        });
    }
  }
}

module.exports = VehicleController;
