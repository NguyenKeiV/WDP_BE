module.exports = (sequelize, DataTypes) => {
  const Vehicle = sequelize.define(
    "Vehicle",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Tên phương tiện",
      },
      type: {
        type: DataTypes.ENUM(
          "car",
          "boat",
          "helicopter",
          "truck",
          "motorcycle",
          "other",
        ),
        allowNull: false,
        defaultValue: "car",
      },
      license_plate: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM("available", "in_use", "maintenance"),
        allowNull: false,
        defaultValue: "available",
      },
      assigned_team_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "Đội đang sử dụng phương tiện",
      },
      vehicle_request_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "Yêu cầu cấp phương tiện liên quan",
      },
      province_city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "vehicles",
      timestamps: true,
      paranoid: true,
    },
  );

  Vehicle.associate = function (models) {
    Vehicle.belongsTo(models.RescueTeam, {
      foreignKey: "assigned_team_id",
      as: "assigned_team",
      onDelete: "SET NULL",
    });
    Vehicle.belongsTo(models.VehicleRequest, {
      foreignKey: "vehicle_request_id",
      as: "vehicle_request",
      onDelete: "SET NULL",
    });
  };

  return Vehicle;
};
