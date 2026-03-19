module.exports = (sequelize, DataTypes) => {
  const ImportBatch = sequelize.define(
    "ImportBatch",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: "Tên đợt nhập, VD: Đợt 1 tháng 3/2026",
      },
      source: {
        type: DataTypes.ENUM("donate", "purchase"),
        allowNull: false,
        comment: "Nguồn nhập: donate từ người dân / mua",
      },
      donor_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: "Tên người/tổ chức donate (nếu source = donate)",
      },
      donor_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: "SĐT người donate",
      },
      import_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: "Ngày nhập kho",
      },
      status: {
        type: DataTypes.ENUM("draft", "completed"),
        allowNull: false,
        defaultValue: "draft",
        comment: "draft: đang nhập / completed: đã hoàn tất",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Manager tạo phiếu nhập",
      },
    },
    {
      tableName: "import_batches",
      timestamps: true,
      paranoid: true,
    },
  );

  ImportBatch.associate = function (models) {
    ImportBatch.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "manager",
    });
    ImportBatch.hasMany(models.SupplyImport, {
      foreignKey: "batch_id",
      as: "items",
    });
    ImportBatch.hasMany(models.CharityHistory, {
      foreignKey: "import_batch_id",
      as: "charity_histories",
    });
  };

  return ImportBatch;
};
