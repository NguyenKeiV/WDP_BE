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
        console.log(
          "✅ User authenticated:",
          user.id,
          user.email,
          `(${user.role})`,
        );
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

    console.log(
      "✅ User authenticated (required):",
      user.id,
      user.email,
      `(${req.user.role})`,
    );

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
const requireAdmin = async (req, res, next) => {
  try {
    // First authenticate
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

    // Then check role
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    console.log("✅ Admin access granted:", user.email);
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
 * Require coordinator role (or admin)
 */
const requireCoordinator = async (req, res, next) => {
  try {
    // First authenticate
    const authHeader = req.headers.authorization;

    console.log(
      "🔍 RequireCoordinator - Authorization header:",
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

    console.log(
      "✅ User authenticated:",
      user.id,
      user.email,
      `(${user.role})`,
    );

    // Then check role
    if (user.role !== "coordinator" && user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Coordinator access required",
      });
    }

    console.log("✅ Coordinator access granted:", user.email, `(${user.role})`);
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
 * Require admin or coordinator role
 * This middleware handles both authentication AND authorization
 */
const requireAdminOrCoordinator = async (req, res, next) => {
  try {
    // First authenticate
    const authHeader = req.headers.authorization;

    console.log(
      "🔍 RequireAdminOrCoordinator - Authorization header:",
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

    console.log(
      "✅ User authenticated:",
      user.id,
      user.email,
      `(${user.role})`,
    );

    // Then check role
    if (!["admin", "coordinator"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Admin or Coordinator access required",
      });
    }

    console.log(
      "✅ Admin/Coordinator access granted:",
      user.email,
      `(${user.role})`,
    );
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
const requireRescueTeam = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided",
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const user = await UserService.verifyToken(token);
    req.user = user;

    if (!["rescue_team", "admin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Rescue team access required",
      });
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
};

module.exports = {
  optionalAuth,
  requireAuth,
  requireAdmin,
  requireCoordinator,
  requireAdminOrCoordinator,
  requireRescueTeam,
};
