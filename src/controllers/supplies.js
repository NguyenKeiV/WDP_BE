const SupplyService = require("../services/supply");

class SupplyController {
  static async getAllSupplies(req, res) {
    try {
      const { page = 1, limit = 20, category, province_city } = req.query;
      const filters = { category, province_city };
      Object.keys(filters).forEach(
        (k) => filters[k] === undefined && delete filters[k],
      );

      const result = await SupplyService.getAllSupplies(filters, page, limit);
      res.status(200).json({
        success: true,
        message: "Supplies retrieved successfully",
        data: result.supplies,
        pagination: result.pagination,
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to retrieve supplies",
          error: error.message,
        });
    }
  }

  static async getSupplyById(req, res) {
    try {
      const { id } = req.params;
      const supply = await SupplyService.getSupplyById(id);
      res.status(200).json({
        success: true,
        message: "Supply retrieved successfully",
        data: supply.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message === "Supply not found" ? 404 : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to retrieve supply",
          error: error.message,
        });
    }
  }

  static async createSupply(req, res) {
    try {
      const supply = await SupplyService.createSupply(req.body);
      res.status(201).json({
        success: true,
        message: "Supply created successfully",
        data: supply.toJSON(),
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to create supply",
          error: error.message,
        });
    }
  }

  static async updateSupply(req, res) {
    try {
      const { id } = req.params;
      const supply = await SupplyService.updateSupply(id, req.body);
      res.status(200).json({
        success: true,
        message: "Supply updated successfully",
        data: supply.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message === "Supply not found" ? 404 : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to update supply",
          error: error.message,
        });
    }
  }

  static async deleteSupply(req, res) {
    try {
      const { id } = req.params;
      const result = await SupplyService.deleteSupply(id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      const statusCode = error.message === "Supply not found" ? 404 : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to delete supply",
          error: error.message,
        });
    }
  }

  static async distributeSupply(req, res) {
    try {
      const { id } = req.params;
      const { team_id, quantity, notes } = req.body;
      const managerId = req.user.id;

      if (!team_id || !quantity) {
        return res.status(400).json({
          success: false,
          message: "team_id and quantity are required",
        });
      }

      const distribution = await SupplyService.distributeSupply(
        id,
        team_id,
        quantity,
        managerId,
        notes,
      );

      res.status(200).json({
        success: true,
        message: "Supply distributed successfully",
        data: distribution.toJSON(),
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to distribute supply",
          error: error.message,
        });
    }
  }

  static async getMyTeamDistributions(req, res) {
    try {
      const userId = req.user.id;
      const team = await require("../services/rescue_team").getTeamByUserId(
        userId,
      );
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "No team associated with this account",
          error: "No team associated with this account",
        });
      }
      const { page = 1, limit = 20 } = req.query;
      const result = await SupplyService.getDistributionsByTeamId(
        team.id,
        page,
        limit,
      );
      res.status(200).json({
        success: true,
        message: "My team distributions retrieved successfully",
        data: result.distributions,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to retrieve my team distributions",
        error: error.message,
      });
    }
  }

  static async getDistributions(req, res) {
    try {
      const { page = 1, limit = 20, team_id, supply_id } = req.query;
      const filters = { team_id, supply_id };
      Object.keys(filters).forEach(
        (k) => filters[k] === undefined && delete filters[k],
      );

      const result = await SupplyService.getDistributions(filters, page, limit);
      res.status(200).json({
        success: true,
        message: "Distributions retrieved successfully",
        data: result.distributions,
        pagination: result.pagination,
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to retrieve distributions",
          error: error.message,
        });
    }
  }
}

module.exports = SupplyController;
