module.exports = (sequelize, DataTypes) => {
  const CharityCampaign = sequelize.define(
    "CharityCampaign",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      manager_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      // Chỉ cần "thời gian" để hiển thị; dùng DATEONLY cho phù hợp FE hiện tại.
      start_at: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_at: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      poster_urls: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
    },
    {
      tableName: "charity_campaigns",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["status"] },
        { fields: ["start_at"] },
        { fields: ["manager_id"] },
      ],
    },
  );

  CharityCampaign.associate = function (models) {
    CharityCampaign.belongsTo(models.User, {
      foreignKey: "manager_id",
      as: "manager",
    });
  };

  return CharityCampaign;
};

