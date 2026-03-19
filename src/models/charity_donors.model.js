module.exports = (sequelize, DataTypes) => {
  const CharityDonor = sequelize.define(
    "CharityDonor",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      donor_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      // Optional: nếu sau này users có phone_number thì có thể link lại.
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "charity_donors",
      timestamps: true,
      paranoid: true,
      indexes: [{ fields: ["phone_number"] }],
    },
  );

  CharityDonor.associate = function (models) {
    CharityDonor.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "SET NULL",
    });
    CharityDonor.hasMany(models.CharityHistory, {
      foreignKey: "donor_id",
      as: "histories",
    });
  };

  return CharityDonor;
};

