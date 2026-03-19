const { db, transaction } = require("../config/database");

class CharityService {
  static get DonorModel() {
    return db.CharityDonor;
  }

  static get HistoryModel() {
    return db.CharityHistory;
  }

  static get SupplyImportModel() {
    return db.SupplyImport;
  }

  static get SupplyModel() {
    return db.Supply;
  }

  static normalizePhone(phone) {
    if (typeof phone !== "string") return "";
    return phone.trim();
  }

  // Regex đơn giản cho SĐT VN: bắt đầu bằng 0 và đủ 10 chữ số.
  static isValidVNPhone(phone) {
    return /^0\d{9}$/.test(phone);
  }

  static generateReceiptCode(batch) {
    // batch.import_date: DATEONLY => "YYYY-MM-DD"
    const rawDate = batch.import_date ? String(batch.import_date) : "";
    const datePart =
      rawDate && rawDate.includes("-") ? rawDate.replaceAll("-", "") : "";
    const shortId = String(batch.id).substring(0, 8);
    const safeDate = datePart || new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `DON-${safeDate}-${shortId}`;
  }

  /**
   * Ghi nhận lịch sử quyên góp khi batch donate được complete.
   * - Idempotent theo `import_batch_id`.
   */
  static async recordDonationHistoryForBatch(batch, t = null, managerId = null) {
    if (!batch || batch.source !== "donate") return null;
    if (!batch.donor_phone) throw new Error("donor_phone is required for donate");

    const donorPhone = this.normalizePhone(batch.donor_phone);
    if (!this.isValidVNPhone(donorPhone)) {
      throw new Error("Invalid donor_phone");
    }

    const run = async (trx) => {
      // 1) Upsert donor
      const [donorRecord] = await this.DonorModel.findOrCreate({
        where: { phone_number: donorPhone },
        defaults: {
          phone_number: donorPhone,
          donor_name: batch.donor_name || null,
          user_id: null,
        },
        transaction: trx,
      });

      if (batch.donor_name && donorRecord.donor_name !== batch.donor_name) {
        await donorRecord.update(
          { donor_name: batch.donor_name },
          { transaction: trx },
        );
      }

      // 2) Idempotency: nếu đã có history theo import_batch_id => không tạo lại.
      const existing = await this.HistoryModel.findOne({
        where: { import_batch_id: batch.id },
        transaction: trx,
      });
      if (existing) return existing;

      const receipt_code = this.generateReceiptCode(batch);

      const history = await this.HistoryModel.create(
        {
          donor_id: donorRecord.id,
          import_batch_id: batch.id,
          receipt_code,
          manager_id: managerId || batch.created_by,
        },
        { transaction: trx },
      );

      return history;
    };

    if (t) return run(t);
    return transaction((trx) => run(trx));
  }

  static async getDonationHistoryByPhone(donorPhone, page = 1, limit = 20) {
    const phone = this.normalizePhone(donorPhone);
    if (!this.isValidVNPhone(phone)) {
      throw new Error("Invalid donor_phone");
    }

    const offset = (page - 1) * limit;

    const donor = await this.DonorModel.findOne({
      where: { phone_number: phone },
      attributes: ["id", "phone_number", "donor_name", "user_id"],
    });

    if (!donor) {
      return {
        histories: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0,
        },
      };
    }

    const { count, rows } = await this.HistoryModel.findAndCountAll({
      where: { donor_id: donor.id },
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: db.User,
          as: "manager",
          attributes: ["id", "username"],
        },
        {
          model: db.ImportBatch,
          as: "batch",
          attributes: ["id", "import_date", "name"],
        },
        {
          model: this.DonorModel,
          as: "donor",
          attributes: ["id", "phone_number", "donor_name"],
        },
      ],
    });

    // Tổng hợp items từ supply_imports (quantity nhập ban đầu).
    const histories = await Promise.all(
      rows.map(async (h) => {
        const itemsRaw = await this.SupplyImportModel.findAll({
          where: { batch_id: h.import_batch_id },
          attributes: ["supply_id", "quantity"],
          include: [
            {
              model: this.SupplyModel,
              as: "supply",
              attributes: ["id", "name", "unit"],
            },
          ],
          order: [["created_at", "ASC"]],
        });

        const itemMap = {};
        for (const it of itemsRaw) {
          const sid = it.supply_id;
          if (!itemMap[sid]) {
            itemMap[sid] = {
              supply_id: sid,
              supply_name: it.supply?.name,
              unit: it.supply?.unit,
              quantity: 0,
            };
          }
          itemMap[sid].quantity += parseInt(it.quantity) || 0;
        }

        return {
          receipt_code: h.receipt_code,
          import_batch_id: h.import_batch_id,
          import_date: h.batch?.import_date,
          donor_name: h.donor?.donor_name || null,
          donor_phone: h.donor?.phone_number,
          manager: {
            id: h.manager?.id,
            username: h.manager?.username,
          },
          items: Object.values(itemMap),
        };
      }),
    );

    return {
      histories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }
}

module.exports = CharityService;

