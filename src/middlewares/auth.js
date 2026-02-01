const UserService = require("../services/user");

/**
 * Optional authentication middleware
 * If token is provided, authenticate user and attach to req.user
 * If no token, allow request to continue (req.user will be undefined)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Debug log
    console.log(
      "🔍 OptionalAuth - Authorization header:",
      authHeader ? "EXISTS" : "NOT FOUND",
    );

    if (!authHeader) {
      // No token provided, continue without authentication
      console.log("⚠️  No authorization header, continuing without auth");
      return next();
    }

    const token = authHeader.replace("Bearer ", "");

    console.log(
      "🔑 Token extracted:",
      token ? "EXISTS (length: " + token.length + ")" : "NOT FOUND",
    );

    if (token) {
      try {
        const user = await UserService.verifyToken(token);
        req.user = user;
        console.log("✅ User authenticated:", user.id, user.email);
      } catch (error) {
        // Invalid token, but continue anyway
        console.log("❌ Invalid token provided:", error.message);
        console.log("⚠️  Continuing without auth");
      }
    }

    next();
  } catch (error) {
    // Any error, just continue without authentication
    console.log("❌ Error in optionalAuth:", error.message);
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

    console.log(
      "🔍 RequireAuth - Authorization header:",
      authHeader ? "EXISTS" : "NOT FOUND",
    );

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

    console.log("✅ User authenticated (required):", user.id, user.email);

    next();
  } catch (error) {
    console.log("❌ Auth failed:", error.message);
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
