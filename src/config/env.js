const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Parse DATABASE_URL if provided (for platforms like Render, Heroku)
const parseDatabaseUrl = (url) => {
  if (!url) return null;

  try {
    // Format: postgres://user:password@host:port/database or postgresql://user:password@host/database
    // Support both 'postgres://' and 'postgresql://'
    // Port is optional (defaults to 5432)
    const regex =
      /postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/(.+)/;
    const match = url.match(regex);

    if (match) {
      console.log("✅ Successfully parsed DATABASE_URL");
      return {
        USER: match[1],
        PASSWORD: match[2],
        HOST: match[3],
        PORT: match[4] ? parseInt(match[4]) : 5432,
        NAME: match[5],
      };
    } else {
      console.log("❌ Failed to parse DATABASE_URL - regex did not match");
      console.log("📍 URL format:", url.substring(0, 30) + "...");
    }
  } catch (error) {
    console.error("❌ Failed to parse DATABASE_URL:", error);
  }
  return null;
};

// Get database configuration from DATABASE_URL or individual variables
const getDatabaseConfig = () => {
  console.log(
    "🔍 DATABASE_URL from env:",
    process.env.DATABASE_URL ? "EXISTS" : "NOT FOUND",
  );

  const parsedUrl = parseDatabaseUrl(process.env.DATABASE_URL);

  if (parsedUrl) {
    console.log("✅ Using DATABASE_URL for database configuration");
    console.log("📍 Database Host:", parsedUrl.HOST);
    return {
      HOST: parsedUrl.HOST,
      PORT: parsedUrl.PORT,
      NAME: parsedUrl.NAME,
      USER: parsedUrl.USER,
      PASSWORD: parsedUrl.PASSWORD,
      URL: process.env.DATABASE_URL,
      SSL:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      SYNC: process.env.DB_SYNC === "true",
      POOL: {
        MAX: parseInt(process.env.DB_POOL_MAX) || 20,
        IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
        CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
      },
    };
  }

  console.log("✅ Using individual database environment variables");
  console.log("📍 DB_HOST:", process.env.DB_HOST || "NOT SET");
  console.log("📍 DB_DATABASE:", process.env.DB_DATABASE || "NOT SET");
  return {
    HOST: process.env.DB_HOST || "localhost",
    PORT: parseInt(process.env.DB_PORT) || 5432,
    NAME: process.env.DB_DATABASE || "postgres",
    USER: process.env.DB_USERNAME || "db_user",
    PASSWORD: process.env.DB_PASSWORD || "db_password",
    SSL:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    SYNC: process.env.DB_SYNC === "true",
    POOL: {
      MAX: parseInt(process.env.DB_POOL_MAX) || 20,
      IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    },
  };
};

// Environment configuration with validation and defaults
const env = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT) || 3000,

  // Database Configuration
  DATABASE: getDatabaseConfig(),

  JWT: {
    SECRET: process.env.JWT_SECRET || "your-default-secret-key",
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  },

  CORS: {
    ORIGIN: process.env.FRONTEND_URL || "http://localhost:3000",
    CREDENTIALS: true,
  },

  // Security Configuration
  BCRYPT: {
    ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  },
};

// Validation function to check required environment variables
const validateEnv = () => {
  const required = [];

  // Check database connection (either DATABASE_URL or individual DB configs)
  if (!process.env.DATABASE_URL && !env.DATABASE.HOST) {
    required.push("DATABASE_URL or DB_HOST");
  }

  if (!env.JWT.SECRET || env.JWT.SECRET === "your-default-secret-key") {
    console.warn(
      "⚠️  Warning: Using default JWT secret. Please set JWT_SECRET in .env file for production!",
    );
  }

  if (required.length > 0) {
    console.error(
      "❌ Missing required environment variables:",
      required.join(", "),
    );
    console.error(
      "💡 Please check your .env file and ensure all required variables are set.",
    );
    process.exit(1);
  }

  console.log("✅ Environment variables loaded successfully");
};

// Utility function to check if running in development
const isDevelopment = () => env.NODE_ENV === "development";

// Utility function to check if running in production
const isProduction = () => env.NODE_ENV === "production";

module.exports = {
  env,
  validateEnv,
  isDevelopment,
  isProduction,
};
