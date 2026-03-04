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
        comment: "Tên nhu yếu phẩm",
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
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "cái",
        comment: "Đơn vị: cái, kg, lít, thùng...",
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

  return Supply;
};
