module.exports = (sequelize, DataTypes) => {
  const VolunteerRegistration = sequelize.define(
    "VolunteerRegistration",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      support_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      district: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "approved",
          "active",
          "completed",
          "rejected",
          "cancelled",
        ),
        allowNull: false,
        defaultValue: "pending",
      },
      coordinator_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "volunteer_registrations",
      timestamps: true,
      paranoid: false,
      indexes: [{ fields: ["user_id"] }, { fields: ["status"] }],
    },
  );

  VolunteerRegistration.associate = function (models) {
    VolunteerRegistration.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "citizen",
      onDelete: "CASCADE",
    });
    VolunteerRegistration.belongsTo(models.User, {
      foreignKey: "reviewed_by",
      as: "reviewer",
      onDelete: "SET NULL",
    });
    VolunteerRegistration.hasMany(models.VolunteerCampaignInvitation, {
      foreignKey: "user_id",
      as: "campaignInvitations",
      onDelete: "CASCADE",
    });
  };

  return VolunteerRegistration;
};
