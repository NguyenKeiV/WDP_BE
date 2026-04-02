const { db, transaction } = require("../config/database");
const { env } = require("../config/env");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const MailService = require("./mail");

const crypto = require("crypto");

const generateSecurePassword = (length = 12) => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";
  const all = lowercase + uppercase + numbers + symbols;
  let password = "";
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  return password
    .split("")
    .sort(() => crypto.randomBytes(1)[0] / 256 - 0.5)
    .join("");
};

class UserService {
  // Get User model from database instance
  static get UserModel() {
    return db.User;
  }

  // Get all users with pagination
  static async getAllUsers(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = {};

      if (filters.role) {
        where.role = filters.role;
      }

      if (filters.q && String(filters.q).trim()) {
        const q = String(filters.q).trim();
        where[Op.or] = [
          { username: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
        ];
      }

      const { count, rows: users } = await this.UserModel.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
      });

      return {
        users: users.map((user) => user.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
          offset,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  static async getUserById(id) {
    try {
      const user = await this.UserModel.findByPk(id);
      if (!user) {
        throw new Error("User not found");
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Get user by email (with password for authentication)
  static async getUserByEmail(email) {
    try {
      const user = await this.UserModel.scope("withPassword").findOne({
        where: { email },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Create new user
  static async createUser(userData) {
    try {
      const { username, email, password, role = "user" } = userData;

      // Check if user already exists
      const existingUser = await this.UserModel.findOne({
        where: { email },
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, env.BCRYPT.ROUNDS);

      // Create user using transaction
      const user = await transaction(async (t) => {
        return await this.UserModel.create(
          {
            username,
            email,
            password: hashedPassword,
            role,
          },
          { transaction: t },
        );
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Update user
  static async updateUser(id, updateData) {
    try {
      const user = await this.getUserById(id);

      // If password is being updated, hash it
      if (updateData.password) {
        updateData.password = await bcrypt.hash(
          updateData.password,
          env.BCRYPT.ROUNDS,
        );
      }

      await user.update(updateData);
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Delete user (soft delete)
  static async deleteUser(id) {
    try {
      const user = await this.getUserById(id);
      await user.destroy();
      return { message: "User deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  // Authenticate user
  static async authenticate(email, password) {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new Error("Invalid email or password");
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error("Invalid email or password");
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        env.JWT.SECRET,
        { expiresIn: env.JWT.EXPIRES_IN },
      );

      return {
        token,
        user: user.toJSON(),
      };
    } catch (error) {
      throw error;
    }
  }

  // Verify JWT token
  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, env.JWT.SECRET);
      const user = await this.getUserById(decoded.id);
      return user;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }
  static async createTeamLeaderAccount({ email, username }) {
    if (!email || !String(email).trim()) throw new Error("Email là bắt buộc");
    if (!username || !String(username).trim()) throw new Error("Username là bắt buộc");

    const existing = await this.UserModel.findOne({ where: { email } });
    if (existing) throw new Error("Email đã được sử dụng");

    const plainPassword = generateSecurePassword(12);
    const hashedPassword = await bcrypt.hash(plainPassword, env.BCRYPT.ROUNDS);

    const user = await transaction(async (t) =>
      this.UserModel.create(
        { username: username.trim(), email: email.trim(), password: hashedPassword, role: "manager" },
        { transaction: t },
      )
    );

    await MailService.sendTeamLeaderWelcome({
      toEmail: email.trim(),
      username: username.trim(),
      plainPassword,
    });

    return { user: user.toJSON(), plainPassword };
  }

  // Change password (for authenticated team leader)
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await this.UserModel.scope("withPassword").findByPk(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error("Mật khẩu hiện tại không đúng");
    }

    if (newPassword.length < 6) {
      throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự");
    }

    const hashed = await bcrypt.hash(newPassword, env.BCRYPT.ROUNDS);
    await user.update({ password: hashed });
    return { message: "Đổi mật khẩu thành công" };
  }

  static async updatePushToken(userId, token) {
    try {
      const user = await this.getUserById(userId);
      await user.update({ expo_push_token: token });
      return user;
    } catch (error) {
      throw error;
    }
  }
  static async sendPushNotification(expoPushToken, title, body, data = {}) {
    try {
      if (!expoPushToken) return;
      const message = {
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data,
      };
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error("Push notification error:", error);
    }
  }
}

module.exports = UserService;
