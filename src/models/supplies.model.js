module.exports = (sequelize, DataTypes) => {
  const Supply = sequelize.define(
    "Supply",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Tên mặt hàng",
      },
      category: {
        type: DataTypes.ENUM(
          "food",
          "medicine",
          "water",
          "clothing",
          "equipment",
          "other",
        ),
        allowNull: false,
        defaultValue: "other",
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "cái",
        comment: "Đơn vị: cái, kg, lít, thùng...",
      },
      min_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
        comment: "Ngưỡng cảnh báo sắp hết hàng",
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
      tableName: "supplies",
      timestamps: true,
      paranoid: true,
    },
  );

  Supply.associate = function (models) {
    Supply.hasMany(models.SupplyImport, {
      foreignKey: "supply_id",
      as: "imports",
    });
    Supply.hasMany(models.SupplyDistribution, {
      foreignKey: "supply_id",
      as: "distributions",
    });
  };

  return Supply;
};
