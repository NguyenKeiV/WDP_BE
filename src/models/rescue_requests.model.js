module.exports = (sequelize, DataTypes) => {
  const RescueRequest = sequelize.define(
    "RescueRequest",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      category: {
        type: DataTypes.ENUM("rescue", "relief"),
        allowNull: false,
      },
      district: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { notEmpty: true },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { notEmpty: true, len: [10, 5000] },
      },
      num_people: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 },
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "urgent"),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "new",
          "pending_verification",
          "verified",
          "assigned", // ← THÊM MỚI: chờ team xác nhận
          "on_mission",
          "completed",
          "partially_completed",
          "rejected",
        ),
        allowNull: false,
        defaultValue: "new",
      },
      location_type: {
        type: DataTypes.ENUM("gps", "manual"),
        allowNull: false,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        validate: { min: -90, max: 90 },
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        validate: { min: -180, max: 180 },
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      media_urls: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      verified_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      assigned_team_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      assigned_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      assignment_history: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      team_reject_reason: {
        // ← THÊM MỚI: lý do team từ chối
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Lý do team từ chối nhiệm vụ",
      },
      team_report: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
      },
      coordinator_confirmation: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
      },
      citizen_confirmation: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
      },
      completion_media_urls: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
    },
    {
      tableName: "rescue_requests",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["status"] },
        { fields: ["category"] },
        { fields: ["district"] },
        { fields: ["user_id"] },
        { fields: ["assigned_team_id"] },
        { fields: ["created_at"] },
      ],
    },
  );

  RescueRequest.associate = function (models) {
    RescueRequest.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "creator",
      onDelete: "SET NULL",
    });
    RescueRequest.belongsTo(models.User, {
      foreignKey: "verified_by",
      as: "verifier",
      onDelete: "SET NULL",
    });
    RescueRequest.belongsTo(models.User, {
      foreignKey: "assigned_by",
      as: "assigner",
      onDelete: "SET NULL",
    });
    RescueRequest.belongsTo(models.RescueTeam, {
      foreignKey: "assigned_team_id",
      as: "assigned_team",
      onDelete: "SET NULL",
    });
    RescueRequest.hasMany(models.SupplyUsage, {
      foreignKey: "rescue_request_id",
      as: "supply_usages",
    });
  };

  return RescueRequest;
};
