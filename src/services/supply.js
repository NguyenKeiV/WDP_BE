const { db, transaction } = require("../config/database");
const { Op, fn, col, literal } = require("sequelize");

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

  static get UsageModel() {
    return db.SupplyUsage;
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
  static async bulkDistribute(items, managerId) {
    // items = [{ supply_id, team_id, quantity, notes }, ...]
    try {
      if (!items || items.length === 0) {
        throw new Error("Danh sách mặt hàng không được rỗng");
      }

      const results = await transaction(async (t) => {
        const distributions = [];

        for (const item of items) {
          const { supply_id, team_id, quantity, notes } = item;

          if (!supply_id || !team_id || !quantity) {
            throw new Error(
              "Mỗi mặt hàng cần có supply_id, team_id và quantity",
            );
          }

          const supply = await this.SupplyModel.findByPk(supply_id);
          if (!supply) throw new Error(`Mặt hàng ${supply_id} không tồn tại`);

          const team = await db.RescueTeam.findByPk(team_id);
          if (!team) throw new Error(`Đội ${team_id} không tồn tại`);

          // Lấy các lô còn hàng, FIFO theo hạn SD
          const imports = await this.SupplyImportModel.findAll({
            where: { supply_id },
            include: [
              {
                model: db.ImportBatch,
                as: "batch",
                where: { status: "completed" },
              },
            ],
            order: [["expiry_date", "ASC NULLS LAST"]],
            transaction: t,
          });

          const totalAvailable = imports.reduce(
            (sum, i) => sum + i.remaining,
            0,
          );
          if (totalAvailable < quantity) {
            throw new Error(
              `Không đủ số lượng cho "${supply.name}". Hiện có: ${totalAvailable} ${supply.unit}`,
            );
          }

          // Trừ FIFO
          let remaining = quantity;
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
              supply_id,
              team_id,
              quantity,
              distributed_by: managerId,
              notes: notes || null,
            },
            { transaction: t },
          );

          distributions.push(distribution);
        }

        return distributions;
      });

      return results;
    } catch (error) {
      throw error;
    }
  }

  static async getDistributionsByTeamId(teamId, page = 1, limit = 20) {
    return this.getDistributions({ team_id: teamId }, page, limit);
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

  // ==================== SUPPLY USAGE ====================

  /**
   * Đội cứu hộ báo cáo đã sử dụng vật phẩm cho một nhiệm vụ.
   * Validate: quantity_used <= (tổng nhận - tổng đã dùng) cho supply đó của team.
   */
  static async reportUsage(data) {
    try {
      const { supply_id, team_id, rescue_request_id, quantity_used, reported_by, notes } = data;

      if (!supply_id || !team_id || !rescue_request_id || !quantity_used) {
        throw new Error("Thiếu thông tin bắt buộc: supply_id, team_id, rescue_request_id, quantity_used");
      }

      const supply = await this.SupplyModel.findByPk(supply_id);
      if (!supply) throw new Error("Mặt hàng không tồn tại");

      const team = await db.RescueTeam.findByPk(team_id);
      if (!team) throw new Error("Đội cứu hộ không tồn tại");

      const request = await db.RescueRequest.findByPk(rescue_request_id);
      if (!request) throw new Error("Nhiệm vụ không tồn tại");

      if (request.assigned_team_id !== team_id) {
        throw new Error("Nhiệm vụ này không được giao cho đội của bạn");
      }

      const totalReceived = await this.DistributionModel.sum("quantity", {
        where: { team_id, supply_id },
      }) || 0;

      const totalUsed = await this.UsageModel.sum("quantity_used", {
        where: { team_id, supply_id },
      }) || 0;

      const remaining = totalReceived - totalUsed;

      if (quantity_used > remaining) {
        throw new Error(
          `Không đủ số lượng. Đã nhận: ${totalReceived}, đã dùng: ${totalUsed}, còn lại: ${remaining} ${supply.unit}`,
        );
      }

      const usage = await this.UsageModel.create({
        supply_id,
        team_id,
        rescue_request_id,
        quantity_used,
        reported_by,
        notes: notes || null,
      });

      await usage.reload({
        include: [
          { model: db.Supply, as: "supply", attributes: ["id", "name", "category", "unit"] },
          { model: db.RescueTeam, as: "team", attributes: ["id", "name"] },
          { model: db.RescueRequest, as: "rescue_request", attributes: ["id", "category", "status", "district"] },
        ],
      });

      return usage;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Báo cáo sử dụng hàng loạt cho một nhiệm vụ.
   * items = [{ supply_id, quantity_used, notes }, ...]
   */
  static async bulkReportUsage(items, teamId, rescueRequestId, reportedBy) {
    try {
      if (!items || items.length === 0) {
        throw new Error("Danh sách vật phẩm không được rỗng");
      }

      const team = await db.RescueTeam.findByPk(teamId);
      if (!team) throw new Error("Đội cứu hộ không tồn tại");

      const request = await db.RescueRequest.findByPk(rescueRequestId);
      if (!request) throw new Error("Nhiệm vụ không tồn tại");

      if (request.assigned_team_id !== teamId) {
        throw new Error("Nhiệm vụ này không được giao cho đội của bạn");
      }

      const results = await transaction(async (t) => {
        const usages = [];

        for (const item of items) {
          const { supply_id, quantity_used, notes } = item;

          if (!supply_id || !quantity_used) {
            throw new Error("Mỗi mục cần có supply_id và quantity_used");
          }

          const supply = await this.SupplyModel.findByPk(supply_id);
          if (!supply) throw new Error(`Mặt hàng ${supply_id} không tồn tại`);

          const totalReceived = await this.DistributionModel.sum("quantity", {
            where: { team_id: teamId, supply_id },
            transaction: t,
          }) || 0;

          const totalUsed = await this.UsageModel.sum("quantity_used", {
            where: { team_id: teamId, supply_id },
            transaction: t,
          }) || 0;

          const remaining = totalReceived - totalUsed;

          if (quantity_used > remaining) {
            throw new Error(
              `Không đủ "${supply.name}". Còn lại: ${remaining} ${supply.unit}`,
            );
          }

          const usage = await this.UsageModel.create(
            {
              supply_id,
              team_id: teamId,
              rescue_request_id: rescueRequestId,
              quantity_used,
              reported_by: reportedBy,
              notes: notes || null,
            },
            { transaction: t },
          );

          usages.push(usage);
        }

        return usages;
      });

      return results;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tồn kho của đội: tổng nhận − tổng đã dùng = còn lại, group by supply.
   */
  static async getTeamInventory(teamId) {
    try {
      const team = await db.RescueTeam.findByPk(teamId);
      if (!team) throw new Error("Đội cứu hộ không tồn tại");

      const distributions = await this.DistributionModel.findAll({
        where: { team_id: teamId },
        attributes: [
          "supply_id",
          [fn("SUM", col("quantity")), "total_received"],
        ],
        group: ["supply_id"],
        raw: true,
      });

      const usages = await this.UsageModel.findAll({
        where: { team_id: teamId },
        attributes: [
          "supply_id",
          [fn("SUM", col("quantity_used")), "total_used"],
        ],
        group: ["supply_id"],
        raw: true,
      });

      const usageMap = {};
      usages.forEach((u) => {
        usageMap[u.supply_id] = parseInt(u.total_used) || 0;
      });

      const supplyIds = distributions.map((d) => d.supply_id);
      const supplies = await this.SupplyModel.findAll({
        where: { id: { [Op.in]: supplyIds } },
        attributes: ["id", "name", "category", "unit"],
      });

      const supplyMap = {};
      supplies.forEach((s) => {
        supplyMap[s.id] = s.toJSON();
      });

      const inventory = distributions.map((d) => {
        const totalReceived = parseInt(d.total_received) || 0;
        const totalUsed = usageMap[d.supply_id] || 0;
        const remaining = totalReceived - totalUsed;

        return {
          supply: supplyMap[d.supply_id] || { id: d.supply_id },
          total_received: totalReceived,
          total_used: totalUsed,
          remaining,
        };
      });

      return {
        team: { id: team.id, name: team.name },
        inventory,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lịch sử sử dụng vật phẩm (filter by team, supply, mission).
   */
  static async getUsages(filters = {}, page = 1, limit = 20) {
    try {
      const { team_id, supply_id, rescue_request_id } = filters;
      const offset = (page - 1) * limit;

      const where = {};
      if (team_id) where.team_id = team_id;
      if (supply_id) where.supply_id = supply_id;
      if (rescue_request_id) where.rescue_request_id = rescue_request_id;

      const { count, rows } = await this.UsageModel.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
        include: [
          { model: db.Supply, as: "supply", attributes: ["id", "name", "category", "unit"] },
          { model: db.RescueTeam, as: "team", attributes: ["id", "name"] },
          { model: db.RescueRequest, as: "rescue_request", attributes: ["id", "category", "status", "district"] },
          { model: db.User, as: "reporter", attributes: ["id", "username", "email"] },
        ],
      });

      return {
        usages: rows.map((u) => u.toJSON()),
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

  /**
   * Báo cáo sử dụng cho 1 nhiệm vụ cụ thể.
   */
  static async getUsagesByMission(rescueRequestId) {
    try {
      const request = await db.RescueRequest.findByPk(rescueRequestId);
      if (!request) throw new Error("Nhiệm vụ không tồn tại");

      const usages = await this.UsageModel.findAll({
        where: { rescue_request_id: rescueRequestId },
        include: [
          { model: db.Supply, as: "supply", attributes: ["id", "name", "category", "unit"] },
          { model: db.RescueTeam, as: "team", attributes: ["id", "name"] },
          { model: db.User, as: "reporter", attributes: ["id", "username", "email"] },
        ],
        order: [["created_at", "DESC"]],
      });

      return usages.map((u) => u.toJSON());
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SupplyService;
