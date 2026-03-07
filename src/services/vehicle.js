const { db, transaction } = require("../config/database");

class VehicleService {
  static get VehicleModel() {
    return db.Vehicle;
  }

  static async getAllVehicles(filters = {}, page = 1, limit = 20) {
    try {
      const { status, type, province_city } = filters;
      const offset = (page - 1) * limit;

      const where = {};
      if (status) where.status = status;
      if (type) where.type = type;
      if (province_city) where.province_city = province_city;

      const { count, rows } = await this.VehicleModel.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
        include: [
          {
            model: db.RescueTeam,
            as: "assigned_team",
            required: false,
            attributes: ["id", "name", "phone_number", "district"],
          },
        ],
      });

      return {
        vehicles: rows.map((v) => v.toJSON()),
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

  static async getVehicleById(id) {
    try {
      const vehicle = await this.VehicleModel.findByPk(id, {
        include: [
          {
            model: db.RescueTeam,
            as: "assigned_team",
            attributes: ["id", "name", "phone_number", "district"],
          },
        ],
      });
      if (!vehicle) throw new Error("Vehicle not found");
      return vehicle;
    } catch (error) {
      throw error;
    }
  }

  static async createVehicle(data) {
    try {
      const { name, type, license_plate, province_city, notes } = data;
      if (!name || !type || !province_city) {
        throw new Error("Missing required fields");
      }
      const vehicle = await this.VehicleModel.create({
        name,
        type,
        license_plate,
        province_city,
        notes,
        status: "available",
      });
      return vehicle;
    } catch (error) {
      throw error;
    }
  }

  static async updateVehicle(id, data) {
    try {
      const vehicle = await this.getVehicleById(id);
      const allowedFields = [
        "name",
        "type",
        "license_plate",
        "status",
        "assigned_team_id",
        "province_city",
        "notes",
      ];
      const filtered = {};
      allowedFields.forEach((f) => {
        if (data[f] !== undefined) filtered[f] = data[f];
      });
      await vehicle.update(filtered);
      return vehicle;
    } catch (error) {
      throw error;
    }
  }

  static async deleteVehicle(id) {
    try {
      const vehicle = await this.getVehicleById(id);
      if (vehicle.status === "in_use") {
        throw new Error("Cannot delete vehicle that is currently in use");
      }
      await vehicle.destroy();
      return { message: "Vehicle deleted successfully" };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = VehicleService;
