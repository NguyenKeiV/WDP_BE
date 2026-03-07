const { db, transaction } = require("../config/database");

class SupplyService {
  static get SupplyModel() {
    return db.Supply;
  }

  static get DistributionModel() {
    return db.SupplyDistribution;
  }

  static get SupplyImportModel() {
    return db.SupplyImport;
  }

  // Tính tồn kho thực tế từ các lô nhập (FIFO)
  static async getAvailableStock(supplyId) {
    try {
      const imports = await this.SupplyImportModel.findAll({
        where: { supply_id: supplyId },
        include: [
          {
            model: db.ImportBatch,
            as: "batch",
            where: { status: "completed" },
            attributes: ["id", "status"],
          },
        ],
        order: [["expiry_date", "ASC NULLS LAST"]], // FIFO theo hạn SD
      });

      return imports.reduce((sum, i) => sum + i.remaining, 0);
    } catch (error) {
      return 0;
    }
  }

  static async getAllSupplies(filters = {}, page = 1, limit = 20) {
    try {
      const { category, province_city } = filters;
      const offset = (page - 1) * limit;

      const where = {};
      if (category) where.category = category;
      if (province_city) where.province_city = province_city;

      const { count, rows } = await this.SupplyModel.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
      });

      // Tính tồn kho thực tế cho từng supply
      const suppliesWithStock = await Promise.all(
        rows.map(async (s) => {
          const available = await this.getAvailableStock(s.id);
          const json = s.toJSON();
          return {
            ...json,
            quantity: available,
            is_low_stock: available < s.min_quantity,
          };
        }),
      );

      return {
        supplies: suppliesWithStock,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  static async getSupplyById(id) {
    try {
      const supply = await this.SupplyModel.findByPk(id);
      if (!supply) throw new Error("Supply not found");
      return supply;
    } catch (error) {
      throw error;
    }
  }

  static async createSupply(data) {
    try {
      const { name, category, unit, province_city, notes, min_quantity } = data;
      if (!name || !category || !province_city) {
        throw new Error("Missing required fields");
      }
      const supply = await this.SupplyModel.create({
        name,
        category,
        unit: unit || "cái",
        province_city,
        notes,
        min_quantity: min_quantity || 10,
      });
      return supply;
    } catch (error) {
      throw error;
    }
  }

  static async updateSupply(id, data) {
    try {
      const supply = await this.getSupplyById(id);
      const allowedFields = [
        "name",
        "category",
        "unit",
        "province_city",
        "notes",
        "min_quantity",
      ];
      const filtered = {};
      allowedFields.forEach((f) => {
        if (data[f] !== undefined) filtered[f] = data[f];
      });
      await supply.update(filtered);
      return supply;
    } catch (error) {
      throw error;
    }
  }

  static async deleteSupply(id) {
    try {
      const supply = await this.getSupplyById(id);
      const available = await this.getAvailableStock(id);
      if (available > 0) {
        throw new Error(`Không thể xóa mặt hàng còn ${available} trong kho`);
      }
      await supply.destroy();
      return { message: "Supply deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  // Phân phối theo FIFO — trừ từng lô theo hạn sử dụng
  static async distributeSupply(supplyId, teamId, quantity, managerId, notes) {
    try {
      const supply = await this.getSupplyById(supplyId);
      const team = await db.RescueTeam.findByPk(teamId);
      if (!team) throw new Error("Team not found");

      // Lấy các lô còn hàng, sắp xếp FIFO theo hạn SD
      const imports = await this.SupplyImportModel.findAll({
        where: { supply_id: supplyId },
        include: [
          {
            model: db.ImportBatch,
            as: "batch",
            where: { status: "completed" },
          },
        ],
        order: [["expiry_date", "ASC NULLS LAST"]],
      });

      const totalAvailable = imports.reduce((sum, i) => sum + i.remaining, 0);
      if (totalAvailable < quantity) {
        throw new Error(
          `Không đủ số lượng. Hiện có: ${totalAvailable} ${supply.unit}`,
        );
      }

      const result = await transaction(async (t) => {
        let remaining = quantity;

        // Trừ FIFO từng lô
        for (const importItem of imports) {
          if (remaining <= 0) break;
          if (importItem.remaining <= 0) continue;

          const toDeduct = Math.min(importItem.remaining, remaining);
          await importItem.update(
            { remaining: importItem.remaining - toDeduct },
            { transaction: t },
          );
          remaining -= toDeduct;
        }

        // Tạo phiếu xuất
        const distribution = await this.DistributionModel.create(
          {
            supply_id: supplyId,
            team_id: teamId,
            quantity,
            distributed_by: managerId,
            notes,
          },
          { transaction: t },
        );

        return distribution;
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getDistributions(filters = {}, page = 1, limit = 20) {
    try {
      const { team_id, supply_id } = filters;
      const offset = (page - 1) * limit;

      const where = {};
      if (team_id) where.team_id = team_id;
      if (supply_id) where.supply_id = supply_id;

      const { count, rows } = await this.DistributionModel.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
        include: [
          {
            model: db.Supply,
            as: "supply",
            attributes: ["id", "name", "category", "unit"],
          },
          {
            model: db.RescueTeam,
            as: "team",
            attributes: ["id", "name"],
          },
          {
            model: db.User,
            as: "manager",
            attributes: ["id", "username", "email"],
          },
        ],
      });

      return {
        distributions: rows.map((d) => d.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SupplyService;
