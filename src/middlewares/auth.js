const UserService = require("../services/user");

/**
 * Optional authentication middleware
 * If token is provided, authenticate user and attach to req.user
 * If no token, allow request to continue (req.user will be undefined)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.replace("Bearer ", "");

    if (token) {
      try {
        const user = await UserService.verifyToken(token);
        req.user = user;
      } catch (error) {
        // Invalid token, but continue anyway
        console.log("Invalid token provided, continuing without auth");
      }
    }

    next();
  } catch (error) {
    // Any error, just continue without authentication
    next();
  }
};

/**
 * Required authentication middleware
 * Token must be provided and valid
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const user = await UserService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};

module.exports = {
  optionalAuth,
  requireAuth,
  requireAdmin,
};
