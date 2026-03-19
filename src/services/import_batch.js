const { db, transaction } = require("../config/database");
const CharityService = require("./charity");

// Regex đơn giản cho SĐT VN: bắt đầu bằng 0 và đủ 10 chữ số.
const isValidVNPhone = (phone) => /^0\d{9}$/.test(String(phone || ""));

class ImportBatchService {
  static get BatchModel() {
    return db.ImportBatch;
  }

  static get SupplyImportModel() {
    return db.SupplyImport;
  }

  static async getAllBatches(filters = {}, page = 1, limit = 20) {
    try {
      const { source, status } = filters;
      const offset = (page - 1) * limit;
      const where = {};
      if (source) where.source = source;
      if (status) where.status = status;

      const { count, rows } = await this.BatchModel.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["import_date", "DESC"]],
        include: [
          {
            model: db.User,
            as: "manager",
            attributes: ["id", "username", "email"],
          },
          {
            model: db.SupplyImport,
            as: "items",
            include: [
              {
                model: db.Supply,
                as: "supply",
                attributes: ["id", "name", "category", "unit"],
              },
            ],
          },
        ],
      });

      return {
        batches: rows.map((b) => b.toJSON()),
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

  static async getBatchById(id) {
    try {
      const batch = await this.BatchModel.findByPk(id, {
        include: [
          {
            model: db.User,
            as: "manager",
            attributes: ["id", "username", "email"],
          },
          {
            model: db.SupplyImport,
            as: "items",
            include: [
              {
                model: db.Supply,
                as: "supply",
                attributes: ["id", "name", "category", "unit"],
              },
            ],
          },
        ],
      });
      if (!batch) throw new Error("Import batch not found");
      return batch;
    } catch (error) {
      throw error;
    }
  }

  static async createBatch(data, managerId) {
    try {
      const {
        name,
        source,
        donor_name,
        donor_phone,
        import_date,
        notes,
        items,
      } = data;

      if (!name || !source || !import_date) {
        throw new Error("Missing required fields: name, source, import_date");
      }

      if (source === "donate" && !donor_name) {
        throw new Error("Donor name is required for donate source");
      }

      if (source === "donate") {
        if (!donor_phone) {
          throw new Error("donor_phone is required for donate source");
        }
        if (!isValidVNPhone(donor_phone)) {
          throw new Error("Invalid donor_phone");
        }
      }

      if (!items || items.length === 0) {
        throw new Error("At least one item is required");
      }

      const result = await transaction(async (t) => {
        // Tạo đợt nhập
        const batch = await this.BatchModel.create(
          {
            name,
            source,
            donor_name,
            donor_phone,
            import_date,
            notes,
            status: "draft",
            created_by: managerId,
          },
          { transaction: t },
        );

        // Thêm từng mặt hàng
        for (const item of items) {
          const {
            supply_id,
            quantity,
            expiry_date,
            condition,
            notes: itemNotes,
          } = item;

          if (!supply_id || !quantity) {
            throw new Error("Each item requires supply_id and quantity");
          }

          // Kiểm tra supply tồn tại
          const supply = await db.Supply.findByPk(supply_id);
          if (!supply) throw new Error(`Supply ${supply_id} not found`);

          await this.SupplyImportModel.create(
            {
              batch_id: batch.id,
              supply_id,
              quantity,
              remaining: quantity,
              expiry_date: expiry_date || null,
              condition: condition || "new",
              notes: itemNotes || null,
            },
            { transaction: t },
          );
        }

        return batch;
      });

      return await this.getBatchById(result.id);
    } catch (error) {
      throw error;
    }
  }

  static async completeBatch(id, managerId = null) {
    try {
      return await transaction(async (t) => {
        const batch = await this.getBatchById(id);
        if (batch.status === "completed") {
          throw new Error("Batch is already completed");
        }
        if (batch.items.length === 0) {
          throw new Error("Cannot complete batch with no items");
        }

        await batch.update({ status: "completed" }, { transaction: t });

        // Side effect for donate: ghi nhận charity history + receipt_code
        if (batch.source === "donate") {
          await CharityService.recordDonationHistoryForBatch(
            batch,
            t,
            managerId,
          );
        }

        return batch;
      });
    } catch (error) {
      throw error;
    }
  }

  static async addItemToBatch(batchId, itemData) {
    try {
      const batch = await this.getBatchById(batchId);
      if (batch.status === "completed") {
        throw new Error("Cannot add items to completed batch");
      }

      const { supply_id, quantity, expiry_date, condition, notes } = itemData;
      if (!supply_id || !quantity) {
        throw new Error("supply_id and quantity are required");
      }

      const supply = await db.Supply.findByPk(supply_id);
      if (!supply) throw new Error("Supply not found");

      const item = await this.SupplyImportModel.create({
        batch_id: batchId,
        supply_id,
        quantity,
        remaining: quantity,
        expiry_date: expiry_date || null,
        condition: condition || "new",
        notes: notes || null,
      });

      return item;
    } catch (error) {
      throw error;
    }
  }

  static async removeItemFromBatch(batchId, itemId) {
    try {
      const batch = await this.getBatchById(batchId);
      if (batch.status === "completed") {
        throw new Error("Cannot remove items from completed batch");
      }

      const item = await this.SupplyImportModel.findOne({
        where: { id: itemId, batch_id: batchId },
      });
      if (!item) throw new Error("Item not found in this batch");

      await item.destroy();
      return { message: "Item removed successfully" };
    } catch (error) {
      throw error;
    }
  }

  // Lấy tồn kho thực tế của 1 supply (tổng remaining từ các lô đã completed)
  static async getStockBySupply(supplyId) {
    try {
      const imports = await this.SupplyImportModel.findAll({
        where: { supply_id: supplyId },
        include: [
          {
            model: db.ImportBatch,
            as: "batch",
            where: { status: "completed" },
            attributes: ["id", "name", "import_date"],
          },
        ],
        order: [["expiry_date", "ASC"]], // FIFO theo hạn SD
      });

      const totalRemaining = imports.reduce((sum, i) => sum + i.remaining, 0);

      // Cảnh báo sắp hết hạn (trong 7 ngày)
      const today = new Date();
      const warningDate = new Date();
      warningDate.setDate(today.getDate() + 7);

      const expiringItems = imports.filter((i) => {
        if (!i.expiry_date) return false;
        const expiry = new Date(i.expiry_date);
        return expiry <= warningDate && i.remaining > 0;
      });

      return {
        supply_id: supplyId,
        total_remaining: totalRemaining,
        lots: imports.map((i) => i.toJSON()),
        expiring_soon: expiringItems.map((i) => i.toJSON()),
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy tổng quan kho
  static async getWarehouseOverview() {
    try {
      const supplies = await db.Supply.findAll({
        paranoid: true,
      });

      const overview = await Promise.all(
        supplies.map(async (supply) => {
          const stock = await this.getStockBySupply(supply.id);
          return {
            ...supply.toJSON(),
            total_remaining: stock.total_remaining,
            expiring_soon: stock.expiring_soon.length,
            is_low_stock: stock.total_remaining < supply.min_quantity,
          };
        }),
      );

      return {
        total_items: overview.length,
        low_stock: overview.filter((s) => s.is_low_stock).length,
        expiring_soon: overview.filter((s) => s.expiring_soon > 0).length,
        supplies: overview,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ImportBatchService;
