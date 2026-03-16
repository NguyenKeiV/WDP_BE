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
        comment:
          "Phân loại: rescue (cứu hộ người/tài sản) | relief (cứu trợ nhu yếu phẩm)",
      },
      district: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Quận/Huyện tại TP.HCM",
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { notEmpty: true },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [10, 5000],
        },
        comment: "Mô tả tình huống",
      },
      num_people: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 },
        comment: "Số người gặp nạn",
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "urgent"),
        allowNull: true,
        comment: "Mức độ ưu tiên",
      },
      status: {
        type: DataTypes.ENUM(
          "new",
          "pending_verification",
          "verified",
          "on_mission",
          "completed",
          "rejected",
        ),
        allowNull: false,
        defaultValue: "new",
        comment: "Trạng thái xử lý",
      },
      location_type: {
        type: DataTypes.ENUM("gps", "manual"),
        allowNull: false,
        comment: "Loại vị trí: GPS hoặc nhập tay",
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
        comment: "Địa chỉ nhập tay",
      },
      media_urls: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "NULL nếu guest",
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
      completion_media_urls: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Ảnh báo cáo từ đội cứu hộ khi hoàn thành",
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
  };

  return RescueRequest;
};
