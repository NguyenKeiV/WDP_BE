const { db, transaction } = require("../config/database");

class SupplyService {
  static get SupplyModel() {
    return db.Supply;
  }

  static get DistributionModel() {
    return db.SupplyDistribution;
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

      return {
        supplies: rows.map((s) => s.toJSON()),
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
      const { name, category, quantity, unit, province_city, notes } = data;
      if (!name || !category || !province_city) {
        throw new Error("Missing required fields");
      }
      const supply = await this.SupplyModel.create({
        name,
        category,
        quantity: quantity || 0,
        unit: unit || "cái",
        province_city,
        notes,
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
        "quantity",
        "unit",
        "province_city",
        "notes",
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
      await supply.destroy();
      return { message: "Supply deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  static async distributeSupply(supplyId, teamId, quantity, managerId, notes) {
    try {
      const supply = await this.getSupplyById(supplyId);

      if (supply.quantity < quantity) {
        throw new Error(
          `Không đủ số lượng. Hiện có: ${supply.quantity} ${supply.unit}`,
        );
      }

      const team = await db.RescueTeam.findByPk(teamId);
      if (!team) throw new Error("Team not found");

      const result = await transaction(async (t) => {
        // Trừ số lượng trong kho
        await supply.update(
          { quantity: supply.quantity - quantity },
          { transaction: t },
        );

        // Tạo bản ghi phân phối
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
            attributes: ["id", "name", "leader_name"],
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
