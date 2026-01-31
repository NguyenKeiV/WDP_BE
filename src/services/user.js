const { db, transaction } = require('../config/database');
const { env } = require('../config/env');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserService {
    // Get User model from database instance
    static get UserModel() {
        return db.User;
    }

    // Get all users with pagination
    static async getAllUsers(page = 1, limit = 10) {
        try {
            const offset = (page - 1) * limit;
            
            const { count, rows: users } = await this.UserModel.findAndCountAll({
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['created_at', 'DESC']],
            });

            return {
                users: users.map(user => user.toJSON()),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit),
                    offset
                }
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
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            throw error;
        }
    }

    // Get user by email (with password for authentication)
    static async getUserByEmail(email) {
        try {
            const user = await this.UserModel.scope('withPassword').findOne({
                where: { email }
            });
            return user;
        } catch (error) {
            throw error;
        }
    }

    // Create new user
    static async createUser(userData) {
        try {
            const { username, email, password, role = 'user' } = userData;

            // Check if user already exists
            const existingUser = await this.UserModel.findOne({
                where: { email }
            });

            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, env.BCRYPT.ROUNDS);

            // Create user using transaction
            const user = await transaction(async (t) => {
                return await this.UserModel.create({
                    username,
                    email,
                    password: hashedPassword,
                    role
                }, { transaction: t });
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
                updateData.password = await bcrypt.hash(updateData.password, env.BCRYPT.ROUNDS);
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
            return { message: 'User deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    // Authenticate user
    static async authenticate(email, password) {
        try {
            const user = await this.getUserByEmail(email);
            if (!user) {
                throw new Error('Invalid email or password');
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw new Error('Invalid email or password');
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    role: user.role 
                },
                env.JWT.SECRET,
                { expiresIn: env.JWT.EXPIRES_IN }
            );

            return {
                token,
                user: user.toJSON()
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
            throw new Error('Invalid or expired token');
        }
    }
}

module.exports = UserService;
