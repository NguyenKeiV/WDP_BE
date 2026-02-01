// Sequelize Rescue Team Model Definition
module.exports = (sequelize, DataTypes) => {
  const RescueTeam = sequelize.define(
    "RescueTeam",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
        comment: "Tên đội cứu hộ",
      },
      leader_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Tên đội trưởng",
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        comment: "Số điện thoại liên lạc",
      },
      specialization: {
        type: DataTypes.ENUM("general", "medical", "vehicle", "supplies"),
        allowNull: false,
        defaultValue: "general",
        comment:
          "Chuyên môn: tổng hợp, y tế, cứu hộ xe, phân phối nhu yếu phẩm",
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        validate: {
          min: 1,
        },
        comment: "Số người tối đa trong đội",
      },
      current_members: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
        comment: "Số người hiện tại",
      },
      status: {
        type: DataTypes.ENUM("available", "on_mission", "unavailable"),
        allowNull: false,
        defaultValue: "available",
        comment: "Trạng thái: rảnh, đang làm nhiệm vụ, không khả dụng",
      },
      province_city: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Khu vực hoạt động chính",
      },
      equipment: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Danh sách trang thiết bị",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Ghi chú thêm",
      },
    },
    {
      tableName: "rescue_teams",
      timestamps: true,
      paranoid: true, // Soft delete
      indexes: [
        {
          fields: ["status"],
        },
        {
          fields: ["specialization"],
        },
        {
          fields: ["province_city"],
        },
      ],
    },
  );

  // Associations
  RescueTeam.associate = function (models) {
    // Has many RescueRequests
    RescueTeam.hasMany(models.RescueRequest, {
      foreignKey: "assigned_team_id",
      as: "assigned_requests",
    });
  };

  return RescueTeam;
};
