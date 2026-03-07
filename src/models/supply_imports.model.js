module.exports = (sequelize, DataTypes) => {
  const SupplyImport = sequelize.define(
    "SupplyImport",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      batch_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Đợt nhập kho",
      },
      supply_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Mặt hàng",
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 },
        comment: "Số lượng nhập",
      },
      remaining: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Số lượng còn lại trong lô này (chưa xuất)",
      },
      expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Hạn sử dụng (nếu là thực phẩm/thuốc)",
      },
      condition: {
        type: DataTypes.ENUM("new", "good", "damaged"),
        allowNull: false,
        defaultValue: "new",
        comment: "Tình trạng hàng",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "supply_imports",
      timestamps: true,
    },
  );

  SupplyImport.associate = function (models) {
    SupplyImport.belongsTo(models.ImportBatch, {
      foreignKey: "batch_id",
      as: "batch",
    });
    SupplyImport.belongsTo(models.Supply, {
      foreignKey: "supply_id",
      as: "supply",
    });
  };

  return SupplyImport;
};
