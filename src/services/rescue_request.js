const { db, transaction } = require("../config/database");

class RescueRequestService {
  // Get RescueRequest model from database instance
  static get RescueRequestModel() {
    return db.RescueRequest;
  }

  static get UserModel() {
    return db.User;
  }

  /**
   * Create new rescue request
   * @param {Object} requestData - Rescue request data
   * @param {string|null} userId - User ID if logged in, null otherwise
   */
  static async createRescueRequest(requestData, userId = null) {
    try {
      const {
        category,
        province_city,
        phone_number,
        description,
        num_people,
        priority,
        location_type,
        latitude,
        longitude,
        address,
        media_urls,
      } = requestData;

      // Validation
      if (
        !category ||
        !province_city ||
        !phone_number ||
        !description ||
        !location_type
      ) {
        throw new Error("Missing required fields");
      }

      // Validate location data
      if (location_type === "gps") {
        if (!latitude || !longitude) {
          throw new Error("GPS coordinates are required for GPS location type");
        }
      } else if (location_type === "manual") {
        if (!address) {
          throw new Error("Address is required for manual location type");
        }
      }

      // Create rescue request
      const rescueRequest = await transaction(async (t) => {
        return await this.RescueRequestModel.create(
          {
            category,
            province_city,
            phone_number,
            description,
            num_people: num_people || 1,
            priority,
            status: "new", // Default status
            location_type,
            latitude: location_type === "gps" ? latitude : null,
            longitude: location_type === "gps" ? longitude : null,
            address: location_type === "manual" ? address : null,
            media_urls: media_urls || [],
            user_id: userId,
          },
          { transaction: t },
        );
      });

      return rescueRequest;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all rescue requests with filters and pagination
   */
  static async getAllRescueRequests(filters = {}, page = 1, limit = 20) {
    try {
      const { status, category, province_city, priority, user_id } = filters;

      const offset = (page - 1) * limit;

      // Build where clause
      const where = {};
      if (status) where.status = status;
      if (category) where.category = category;
      if (province_city) where.province_city = province_city;
      if (priority) where.priority = priority;
      if (user_id) where.user_id = user_id;

      const { count, rows: requests } =
        await this.RescueRequestModel.findAndCountAll({
          where,
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [["created_at", "DESC"]],
          include: [
            {
              model: this.UserModel,
              as: "creator",
              attributes: ["id", "username", "email"],
            },
          ],
        });

      return {
        requests: requests.map((req) => req.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
          offset,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get rescue request by ID
   */
  static async getRescueRequestById(id) {
    try {
      const request = await this.RescueRequestModel.findByPk(id, {
        include: [
          {
            model: this.UserModel,
            as: "creator",
            attributes: ["id", "username", "email"],
          },
          {
            model: this.UserModel,
            as: "verifier",
            attributes: ["id", "username", "email"],
          },
        ],
      });

      if (!request) {
        throw new Error("Rescue request not found");
      }

      return request;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update rescue request
   * @param {string} id - Request ID
   * @param {Object} updateData - Data to update
   * @param {string} userId - User ID performing the update
   */
  static async updateRescueRequest(id, updateData, userId = null) {
    try {
      const request = await this.getRescueRequestById(id);

      // Only allow updating certain fields
      const allowedFields = [
        "status",
        "priority",
        "notes",
        "verified_by",
        "verified_at",
      ];

      const filteredData = {};
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      // If status is being changed to 'verified', set verified_by and verified_at
      if (updateData.status === "verified" && userId) {
        filteredData.verified_by = userId;
        filteredData.verified_at = new Date();
      }

      await request.update(filteredData);
      return request;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete rescue request (soft delete)
   */
  static async deleteRescueRequest(id) {
    try {
      const request = await this.getRescueRequestById(id);
      await request.destroy();
      return { message: "Rescue request deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get statistics
   */
  static async getStatistics() {
    try {
      const total = await this.RescueRequestModel.count();
      const byStatus = await this.RescueRequestModel.findAll({
        attributes: [
          "status",
          [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
        ],
        group: ["status"],
      });
      const byCategory = await this.RescueRequestModel.findAll({
        attributes: [
          "category",
          [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
        ],
        group: ["category"],
      });

      return {
        total,
        by_status: byStatus.map((s) => s.toJSON()),
        by_category: byCategory.map((c) => c.toJSON()),
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = RescueRequestService;
