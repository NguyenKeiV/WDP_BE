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
        validate: { notEmpty: true },
        comment: "Tên đội cứu hộ",
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { notEmpty: true },
        comment: "Số điện thoại liên lạc",
      },
      specialization: {
        type: DataTypes.ENUM("rescue", "relief"),
        allowNull: false,
        defaultValue: "rescue",
        comment: "Chuyên môn: cứu hộ / cứu trợ",
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        validate: { min: 1 },
        comment: "Số thành viên tối đa",
      },
      available_members: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
        comment: "Số thành viên sẵn sàng",
      },
      status: {
        type: DataTypes.ENUM("available", "on_mission", "unavailable"),
        allowNull: false,
        defaultValue: "available",
      },
      district: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Quận/Huyện tại TP.HCM",
      },
      equipment: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        comment: "Tài khoản trưởng nhóm (bắt buộc, role rescue_team)",
      },
    },
    {
      tableName: "rescue_teams",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["status"] },
        { fields: ["specialization"] },
        { fields: ["district"] },
        { fields: ["user_id"] },
      ],
    },
  );

  RescueTeam.associate = function (models) {
    RescueTeam.hasMany(models.RescueRequest, {
      foreignKey: "assigned_team_id",
      as: "assigned_requests",
    });
    RescueTeam.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "leader_account",
      onDelete: "RESTRICT",
    });
  };

  return RescueTeam;
};
