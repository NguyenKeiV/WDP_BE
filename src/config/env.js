const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Environment configuration with validation and defaults
const env = {
    // Server Configuration
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT) || 3000,

    // Database Configuration
    DATABASE: {
        HOST: process.env.DB_HOST || 'localhost',
        PORT: parseInt(process.env.DB_PORT) || 5432,
        NAME: process.env.DB_DATABASE || 'postgres',
        USER: process.env.DB_USERNAME || 'db_user',
        PASSWORD: process.env.DB_PASSWORD || 'db_password',
        SSL: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        SYNC: process.env.DB_SYNC === 'true',
        POOL: {
            MAX: parseInt(process.env.DB_POOL_MAX) || 20,
            IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
            CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
        }
    },

    JWT: {
        SECRET: process.env.JWT_SECRET || 'your-default-secret-key',
        EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
    },

    CORS: {
        ORIGIN: process.env.FRONTEND_URL || 'http://localhost:3000',
        CREDENTIALS: true
    },

    // Security Configuration
    BCRYPT: {
        ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12
    }
};

// Validation function to check required environment variables
const validateEnv = () => {
    const required = [];

    // Check database connection (either DATABASE_URL or individual DB configs)
    if (!env.DATABASE.URL && !env.DATABASE.HOST) {
        required.push('DATABASE_URL or DB_HOST');
    }

    if (!env.JWT.SECRET || env.JWT.SECRET === 'your-default-secret-key') {
        console.warn('⚠️  Warning: Using default JWT secret. Please set JWT_SECRET in .env file for production!');
    }

    if (required.length > 0) {
        console.error('❌ Missing required environment variables:', required.join(', '));
        console.error('💡 Please check your .env file and ensure all required variables are set.');
        process.exit(1);
    }

    console.log('✅ Environment variables loaded successfully');
};

// Utility function to check if running in development
const isDevelopment = () => env.NODE_ENV === 'development';

// Utility function to check if running in production
const isProduction = () => env.NODE_ENV === 'production';

module.exports = {
    env,
    validateEnv,
    isDevelopment,
    isProduction
};