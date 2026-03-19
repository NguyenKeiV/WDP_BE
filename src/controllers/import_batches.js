const ImportBatchService = require("../services/import_batch");

class ImportBatchController {
  static async getAllBatches(req, res) {
    try {
      const { page = 1, limit = 20, source, status } = req.query;
      const filters = { source, status };
      Object.keys(filters).forEach(
        (k) => filters[k] === undefined && delete filters[k],
      );

      const result = await ImportBatchService.getAllBatches(
        filters,
        page,
        limit,
      );
      res.status(200).json({
        success: true,
        message: "Import batches retrieved successfully",
        data: result.batches,
        pagination: result.pagination,
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to retrieve batches",
          error: error.message,
        });
    }
  }

  static async getBatchById(req, res) {
    try {
      const { id } = req.params;
      const batch = await ImportBatchService.getBatchById(id);
      res.status(200).json({
        success: true,
        message: "Import batch retrieved successfully",
        data: batch.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message === "Import batch not found" ? 404 : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to retrieve batch",
          error: error.message,
        });
    }
  }

  static async createBatch(req, res) {
    try {
      const managerId = req.user.id;
      const batch = await ImportBatchService.createBatch(req.body, managerId);
      res.status(201).json({
        success: true,
        message: "Import batch created successfully",
        data: batch.toJSON(),
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to create batch",
          error: error.message,
        });
    }
  }

  static async completeBatch(req, res) {
    try {
      const { id } = req.params;
      const managerId = req.user?.id || null;
      const batch = await ImportBatchService.completeBatch(id, managerId);
      res.status(200).json({
        success: true,
        message: "Batch completed successfully. Stock has been updated.",
        data: batch.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message === "Import batch not found" ? 404 : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to complete batch",
          error: error.message,
        });
    }
  }

  static async addItemToBatch(req, res) {
    try {
      const { id } = req.params;
      const item = await ImportBatchService.addItemToBatch(id, req.body);
      res.status(201).json({
        success: true,
        message: "Item added to batch successfully",
        data: item.toJSON(),
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to add item",
          error: error.message,
        });
    }
  }

  static async removeItemFromBatch(req, res) {
    try {
      const { id, itemId } = req.params;
      const result = await ImportBatchService.removeItemFromBatch(id, itemId);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      const statusCode = error.message.includes("not found") ? 404 : 400;
      res
        .status(statusCode)
        .json({
          success: false,
          message: "Failed to remove item",
          error: error.message,
        });
    }
  }

  static async getStockBySupply(req, res) {
    try {
      const { id } = req.params;
      const stock = await ImportBatchService.getStockBySupply(id);
      res.status(200).json({
        success: true,
        message: "Stock retrieved successfully",
        data: stock,
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to retrieve stock",
          error: error.message,
        });
    }
  }

  static async getWarehouseOverview(req, res) {
    try {
      const overview = await ImportBatchService.getWarehouseOverview();
      res.status(200).json({
        success: true,
        message: "Warehouse overview retrieved successfully",
        data: overview,
      });
    } catch (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Failed to retrieve overview",
          error: error.message,
        });
    }
  }
}

module.exports = ImportBatchController;
