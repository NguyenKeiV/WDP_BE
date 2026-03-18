module.exports = (sequelize, DataTypes) => {
  const SupplyUsage = sequelize.define(
    "SupplyUsage",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      supply_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Mặt hàng đã sử dụng",
      },
      team_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Đội cứu hộ sử dụng",
      },
      rescue_request_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Nhiệm vụ liên quan",
      },
      quantity_used: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 },
        comment: "Số lượng đã sử dụng",
      },
      reported_by: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Người báo cáo (team leader)",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "supply_usages",
      timestamps: true,
      indexes: [
        { fields: ["team_id"] },
        { fields: ["supply_id"] },
        { fields: ["rescue_request_id"] },
        { fields: ["team_id", "supply_id"] },
      ],
    },
  );

  SupplyUsage.associate = function (models) {
    SupplyUsage.belongsTo(models.Supply, {
      foreignKey: "supply_id",
      as: "supply",
    });
    SupplyUsage.belongsTo(models.RescueTeam, {
      foreignKey: "team_id",
      as: "team",
    });
    SupplyUsage.belongsTo(models.RescueRequest, {
      foreignKey: "rescue_request_id",
      as: "rescue_request",
    });
    SupplyUsage.belongsTo(models.User, {
      foreignKey: "reported_by",
      as: "reporter",
    });
  };

  return SupplyUsage;
};
