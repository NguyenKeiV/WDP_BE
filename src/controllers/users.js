const UserService = require('../services/user');

class UserController {
    // Get all users with pagination
    static async getAllUsers(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const result = await UserService.getAllUsers(page, limit);

            res.status(200).json({
                success: true,
                message: 'Users retrieved successfully',
                data: result.users,
                pagination: result.pagination
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Failed to retrieve users',
                error: error.message
            });
        }
    }

    // Get user by ID
    static async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await UserService.getUserById(id);

            res.status(200).json({
                success: true,
                message: 'User retrieved successfully',
                data: user.toJSON()
            });
        } catch (error) {
            const statusCode = error.message === 'User not found' ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: 'Failed to retrieve user',
                error: error.message
            });
        }
    }

    // Create new user
    static async createUser(req, res) {
        try {
            const userData = req.body;
            const user = await UserService.createUser(userData);

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: user.toJSON()
            });
        } catch (error) {
            const statusCode = error.message.includes('already exists') ? 409 : 400;
            res.status(statusCode).json({
                success: false,
                message: 'Failed to create user',
                error: error.message
            });
        }
    }

    // Update user
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const user = await UserService.updateUser(id, updateData);

            res.status(200).json({
                success: true,
                message: 'User updated successfully',
                data: user.toJSON()
            });
        } catch (error) {
            const statusCode = error.message === 'User not found' ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: 'Failed to update user',
                error: error.message
            });
        }
    }

    // Delete user
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const result = await UserService.deleteUser(id);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            const statusCode = error.message === 'User not found' ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: 'Failed to delete user',
                error: error.message
            });
        }
    }

    // Login user
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await UserService.authenticate(email, password);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    token: result.token,
                    user: result.user
                }
            });
        } catch (error) {
            res.status(401).json({
                success: false,
                message: 'Login failed',
                error: error.message
            });
        }
    }

    // Get current user profile
    static async getProfile(req, res) {
        try {
            // req.user should be set by authentication middleware
            const user = req.user;

            res.status(200).json({
                success: true,
                message: 'Profile retrieved successfully',
                data: user.toJSON()
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Failed to retrieve profile',
                error: error.message
            });
        }
    }
}

module.exports = UserController;
