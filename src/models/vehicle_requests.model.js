module.exports = (sequelize, DataTypes) => {
  const VehicleRequest = sequelize.define(
    "VehicleRequest",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      rescue_request_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Yêu cầu cứu hộ liên quan",
      },
      team_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Đội cần cấp phương tiện",
      },
      requested_by: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Coordinator tạo yêu cầu",
      },
      approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "Manager duyệt yêu cầu",
      },
      vehicle_type: {
        type: DataTypes.ENUM(
          "car",
          "boat",
          "helicopter",
          "truck",
          "motorcycle",
          "other",
        ),
        allowNull: false,
        comment: "Loại phương tiện cần",
      },
      quantity_needed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 },
        comment: "Số lượng phương tiện cần",
      },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected", "returned"),
        allowNull: false,
        defaultValue: "pending",
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Lý do cần phương tiện",
      },
      reject_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Lý do từ chối (nếu rejected)",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "vehicle_requests",
      timestamps: true,
      paranoid: true,
    },
  );

  VehicleRequest.associate = function (models) {
    VehicleRequest.belongsTo(models.RescueRequest, {
      foreignKey: "rescue_request_id",
      as: "rescue_request",
    });
    VehicleRequest.belongsTo(models.RescueTeam, {
      foreignKey: "team_id",
      as: "team",
    });
    VehicleRequest.belongsTo(models.User, {
      foreignKey: "requested_by",
      as: "coordinator",
    });
    VehicleRequest.belongsTo(models.User, {
      foreignKey: "approved_by",
      as: "manager",
    });
    VehicleRequest.hasMany(models.Vehicle, {
      foreignKey: "vehicle_request_id",
      as: "assigned_vehicles",
    });
  };

  return VehicleRequest;
};
