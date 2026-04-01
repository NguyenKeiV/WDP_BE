module.exports = (sequelize, DataTypes) => {
  const VolunteerCampaignInvitation = sequelize.define(
    "VolunteerCampaignInvitation",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      campaign_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      invited_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "accepted", "declined"),
        allowNull: false,
        defaultValue: "pending",
      },
      declined_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      responded_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "volunteer_campaign_invitations",
      timestamps: true,
      paranoid: false,
      indexes: [
        { fields: ["campaign_id"] },
        { fields: ["user_id"] },
        { fields: ["status"] },
        {
          fields: ["campaign_id", "user_id"],
          unique: true,
        },
      ],
    },
  );

  VolunteerCampaignInvitation.associate = function (models) {
    VolunteerCampaignInvitation.belongsTo(models.VolunteerCampaign, {
      foreignKey: "campaign_id",
      as: "campaign",
      onDelete: "CASCADE",
    });
    VolunteerCampaignInvitation.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "volunteer",
      onDelete: "CASCADE",
    });
    VolunteerCampaignInvitation.belongsTo(models.User, {
      foreignKey: "invited_by",
      as: "inviter",
      onDelete: "SET NULL",
    });
  };

  return VolunteerCampaignInvitation;
};
