module.exports = (sequelize, DataTypes) => {
  const SupplyDistribution = sequelize.define(
    "SupplyDistribution",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      supply_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      team_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 },
      },
      distributed_by: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Manager thực hiện phân phối",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "supply_distributions",
      timestamps: true,
    },
  );

  SupplyDistribution.associate = function (models) {
    SupplyDistribution.belongsTo(models.Supply, {
      foreignKey: "supply_id",
      as: "supply",
    });
    SupplyDistribution.belongsTo(models.RescueTeam, {
      foreignKey: "team_id",
      as: "team",
    });
    SupplyDistribution.belongsTo(models.User, {
      foreignKey: "distributed_by",
      as: "manager",
    });
  };

  return SupplyDistribution;
};
