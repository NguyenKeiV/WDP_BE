module.exports = (sequelize, DataTypes) => {
  const VolunteerCampaign = sequelize.define(
    "VolunteerCampaign",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      district: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      scheduled_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      max_volunteers: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "draft",
          "published",
          "ongoing",
          "completed",
          "cancelled",
        ),
        allowNull: false,
        defaultValue: "draft",
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelled_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "volunteer_campaigns",
      timestamps: true,
      paranoid: false,
      indexes: [
        { fields: ["created_by"] },
        { fields: ["status"] },
        { fields: ["district"] },
        { fields: ["scheduled_at"] },
      ],
    },
  );

  VolunteerCampaign.associate = function (models) {
    VolunteerCampaign.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
      onDelete: "CASCADE",
    });
    VolunteerCampaign.belongsTo(models.User, {
      foreignKey: "cancelled_by",
      as: "canceller",
      onDelete: "SET NULL",
    });
    VolunteerCampaign.hasMany(models.VolunteerCampaignInvitation, {
      foreignKey: "campaign_id",
      as: "invitations",
      onDelete: "CASCADE",
    });
  };

  return VolunteerCampaign;
};
