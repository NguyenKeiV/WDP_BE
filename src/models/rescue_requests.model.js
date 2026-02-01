// Sequelize Rescue Request Model Definition
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
        type: DataTypes.ENUM("rescue", "supplies", "vehicle_rescue", "other"),
        allowNull: false,
        comment: "Phân loại: cần cứu hộ, cần nhu yếu phẩm, cần cứu hộ xe, khác",
      },
      province_city: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Tỉnh/Thành phố",
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
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
        validate: {
          min: 1,
        },
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
          "in_progress",
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
        validate: {
          min: -90,
          max: 90,
        },
        comment: "GPS latitude",
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        validate: {
          min: -180,
          max: 180,
        },
        comment: "GPS longitude",
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
        comment: "Mảng URLs của hình ảnh/video đính kèm",
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "ID người dùng tạo request (NULL nếu không đăng nhập)",
      },
      verified_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "ID admin/volunteer xác minh",
      },
      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Thời gian xác minh",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Ghi chú từ admin/volunteer",
      },
    },
    {
      tableName: "rescue_requests",
      timestamps: true,
      paranoid: true, // Soft delete
      indexes: [
        {
          fields: ["status"],
        },
        {
          fields: ["category"],
        },
        {
          fields: ["province_city"],
        },
        {
          fields: ["user_id"],
        },
        {
          fields: ["created_at"],
        },
      ],
    },
  );

  // Associations
  RescueRequest.associate = function (models) {
    // Belongs to User (creator)
    RescueRequest.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "creator",
      onDelete: "SET NULL",
    });

    // Belongs to User (verifier)
    RescueRequest.belongsTo(models.User, {
      foreignKey: "verified_by",
      as: "verifier",
      onDelete: "SET NULL",
    });
  };

  return RescueRequest;
};
