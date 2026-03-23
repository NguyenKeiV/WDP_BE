module.exports = (sequelize, DataTypes) => {
  const CharityCampaign = sequelize.define(
    "CharityCampaign",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      image_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("active", "ended"),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "charity_campaigns",
      timestamps: true,
    },
  );

  CharityCampaign.associate = function (models) {
    CharityCampaign.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });
  };

  return CharityCampaign;
};
