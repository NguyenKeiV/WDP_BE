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
      const role = req.user?.role;
      const canViewFull = ["admin", "coordinator", "manager"].includes(role);
      const safeData = canViewFull
        ? result.supplies
        : result.supplies.map((s) => ({
            id: s.id,
            name: s.name,
            unit: s.unit,
          }));

      res.status(200).json({
        success: true,
        message: "Supplies retrieved successfully",
        data: safeData,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to retrieve supplies",
        error: error.message,
      });
    }
  }

  static async getSupplyById(req, res) {
    try {
      const { id } = req.params;
      // Basic guard to avoid leaking DB UUID cast errors.
      const isUuidV4Like = /^[0-9a-fA-F-]{36}$/.test(id);
      if (!isUuidV4Like) {
        return res.status(400).json({
          success: false,
          message: "Invalid supply id",
        });
      }
      const supply = await SupplyService.getSupplyById(id);
      res.status(200).json({
        success: true,
        message: "Supply retrieved successfully",
        data: supply.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message === "Supply not found" ? 404 : 400;
      res.status(statusCode).json({
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
      res.status(400).json({
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
      res.status(statusCode).json({
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
      res.status(statusCode).json({
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
      res.status(400).json({
        success: false,
        message: "Failed to distribute supply",
        error: error.message,
      });
    }
  }
  static async bulkDistribute(req, res) {
    try {
      const { items } = req.body;
      const managerId = req.user.id;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "items array is required",
        });
      }

      const distributions = await SupplyService.bulkDistribute(
        items,
        managerId,
      );

      res.status(200).json({
        success: true,
        message: `Đã xuất ${distributions.length} loại mặt hàng thành công`,
        data: distributions,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Failed to bulk distribute supplies",
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
      res.status(400).json({
        success: false,
        message: "Failed to retrieve distributions",
        error: error.message,
      });
    }
  }

  // ==================== SUPPLY USAGE ====================

  static async reportUsage(req, res) {
    try {
      const userId = req.user.id;
      const team = await require("../services/rescue_team").getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đội liên kết với tài khoản này",
        });
      }

      const { supply_id, rescue_request_id, quantity_used, notes } = req.body;

      if (!supply_id || !rescue_request_id || !quantity_used) {
        return res.status(400).json({
          success: false,
          message: "supply_id, rescue_request_id và quantity_used là bắt buộc",
        });
      }

      const usage = await SupplyService.reportUsage({
        supply_id,
        team_id: team.id,
        rescue_request_id,
        quantity_used,
        reported_by: userId,
        notes,
      });

      res.status(201).json({
        success: true,
        message: "Báo cáo sử dụng vật phẩm thành công",
        data: usage.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message.includes("không tồn tại") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Báo cáo sử dụng thất bại",
        error: error.message,
      });
    }
  }

  static async bulkReportUsage(req, res) {
    try {
      const userId = req.user.id;
      const team = await require("../services/rescue_team").getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đội liên kết với tài khoản này",
        });
      }

      const { rescue_request_id, items } = req.body;

      if (!rescue_request_id) {
        return res.status(400).json({
          success: false,
          message: "rescue_request_id là bắt buộc",
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "items array là bắt buộc",
        });
      }

      const usages = await SupplyService.bulkReportUsage(
        items,
        team.id,
        rescue_request_id,
        userId,
      );

      res.status(201).json({
        success: true,
        message: `Đã báo cáo sử dụng ${usages.length} loại vật phẩm thành công`,
        data: usages,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Báo cáo sử dụng hàng loạt thất bại",
        error: error.message,
      });
    }
  }

  static async getMyTeamInventory(req, res) {
    try {
      const userId = req.user.id;
      const team = await require("../services/rescue_team").getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đội liên kết với tài khoản này",
        });
      }

      const result = await SupplyService.getTeamInventory(team.id);

      res.status(200).json({
        success: true,
        message: "Lấy tồn kho đội thành công",
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Lấy tồn kho đội thất bại",
        error: error.message,
      });
    }
  }

  static async getTeamInventory(req, res) {
    try {
      const { teamId } = req.params;
      const result = await SupplyService.getTeamInventory(teamId);

      res.status(200).json({
        success: true,
        message: "Lấy tồn kho đội thành công",
        data: result,
      });
    } catch (error) {
      const statusCode = error.message.includes("không tồn tại") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Lấy tồn kho đội thất bại",
        error: error.message,
      });
    }
  }

  static async getUsages(req, res) {
    try {
      const { page = 1, limit = 20, team_id, supply_id, rescue_request_id } = req.query;
      const filters = { team_id, supply_id, rescue_request_id };
      Object.keys(filters).forEach(
        (k) => filters[k] === undefined && delete filters[k],
      );

      const result = await SupplyService.getUsages(filters, page, limit);
      res.status(200).json({
        success: true,
        message: "Lấy danh sách sử dụng vật phẩm thành công",
        data: result.usages,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Lấy danh sách sử dụng vật phẩm thất bại",
        error: error.message,
      });
    }
  }

  static async getUsagesByMission(req, res) {
    try {
      const { missionId } = req.params;
      const usages = await SupplyService.getUsagesByMission(missionId);

      res.status(200).json({
        success: true,
        message: "Lấy báo cáo sử dụng vật phẩm cho nhiệm vụ thành công",
        data: usages,
      });
    } catch (error) {
      const statusCode = error.message.includes("không tồn tại") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Lấy báo cáo sử dụng vật phẩm thất bại",
        error: error.message,
      });
    }
  }

  static async getMyTeamUsages(req, res) {
    try {
      const userId = req.user.id;
      const team = await require("../services/rescue_team").getTeamByUserId(userId);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đội liên kết với tài khoản này",
        });
      }

      const { page = 1, limit = 20 } = req.query;
      const result = await SupplyService.getUsages({ team_id: team.id }, page, limit);

      res.status(200).json({
        success: true,
        message: "Lấy lịch sử sử dụng vật phẩm của đội thành công",
        data: result.usages,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Lấy lịch sử sử dụng vật phẩm thất bại",
        error: error.message,
      });
    }
  }
}

module.exports = SupplyController;
