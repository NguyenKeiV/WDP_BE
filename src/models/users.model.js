// Sequelize User Model Definition
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [3, 50],
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          notEmpty: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [6, 255],
        },
      },
      role: {
        type: DataTypes.ENUM(
          "user",
          "admin",
          "coordinator",
          "rescue_team",
          "manager",
        ),
        allowNull: false,
        defaultValue: "user",
      },
      expo_push_token: {
        type: DataTypes.STRING(200),
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      tableName: "users",
      timestamps: true,
      paranoid: true,
      defaultScope: {
        attributes: { exclude: ["password"] },
      },
      scopes: {
        withPassword: {
          attributes: { include: ["password"] },
        },
      },
    },
  );

  // Class methods
  User.associate = function (models) {
    // Định nghĩa associates
    // Example: User.hasMany(models.Post, { foreignKey: 'userId' });
    User.hasMany(models.VolunteerCampaign, {
      foreignKey: "created_by",
      as: "createdCampaigns",
      onDelete: "CASCADE",
    });
    User.hasMany(models.VolunteerCampaignInvitation, {
      foreignKey: "user_id",
      as: "campaignInvitations",
      onDelete: "CASCADE",
    });
    User.hasMany(models.VolunteerRegistration, {
      foreignKey: "user_id",
      as: "volunteerRegistrations",
      onDelete: "CASCADE",
    });
  };

  return User;
};
