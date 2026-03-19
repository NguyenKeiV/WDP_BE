module.exports = (sequelize, DataTypes) => {
  const CharityHistory = sequelize.define(
    "CharityHistory",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      donor_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      import_batch_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      receipt_code: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      manager_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: "charity_histories",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["donor_id"] },
        { fields: ["import_batch_id"] },
        { fields: ["manager_id"] },
      ],
    },
  );

  CharityHistory.associate = function (models) {
    CharityHistory.belongsTo(models.CharityDonor, {
      foreignKey: "donor_id",
      as: "donor",
    });

    CharityHistory.belongsTo(models.ImportBatch, {
      foreignKey: "import_batch_id",
      as: "batch",
      onDelete: "CASCADE",
    });

    CharityHistory.belongsTo(models.User, {
      foreignKey: "manager_id",
      as: "manager",
      onDelete: "RESTRICT",
    });
  };

  return CharityHistory;
};

