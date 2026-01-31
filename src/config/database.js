const { Sequelize, DataTypes } = require('sequelize');
const { env } = require('./env');
const path = require('path');
const fs = require('fs');

// Create Sequelize instance with PostgreSQL configuration
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: env.DATABASE.HOST,
    port: env.DATABASE.PORT,
    database: env.DATABASE.NAME,
    username: env.DATABASE.USER,
    password: env.DATABASE.PASSWORD,
    logging: false, // Tắt hoàn toàn SQL logging
    dialectOptions: {
        ssl: env.DATABASE.SSL
    },
    pool: {
        max: env.DATABASE.POOL.MAX,
        min: 0,
        acquire: env.DATABASE.POOL.CONNECTION_TIMEOUT,
        idle: env.DATABASE.POOL.IDLE_TIMEOUT,
    },
    define: {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        underscored: true,
    },
});

// Object to store all models
const db = {
    sequelize,
    Sequelize,
    DataTypes,
};

// Function to auto-load models
const loadModels = () => {
    const modelsDir = path.join(__dirname, '../models');
    
    if (!fs.existsSync(modelsDir)) {
        console.warn('Models directory not found:', modelsDir);
        return;
    }

    const files = fs.readdirSync(modelsDir);
    
    files.forEach(file => {
        // Load files that contain '.model' in their name and end with .js
        if (file.includes('.model') && file.endsWith('.js')) {
            const modelPath = path.join(modelsDir, file);
            const model = require(modelPath);
            
            // Check if the model exports a function (Sequelize model definition)
            if (typeof model === 'function') {
                const modelInstance = model(sequelize, DataTypes);
                if (modelInstance && modelInstance.name) {
                    db[modelInstance.name] = modelInstance;
                    console.log(`✅ Model loaded: ${modelInstance.name}`);
                }
            }
        }
    });
};

// Function to setup associations between models
const setupAssociations = () => {
    Object.keys(db).forEach(modelName => {
        if (db[modelName].associate && typeof db[modelName].associate === 'function') {
            db[modelName].associate(db);
            console.log(`✅ Associations setup for: ${modelName}`);
        }
    });
};

// Function to initialize database
const initializeDatabase = async () => {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection has been established successfully.');

        // Load all models
        loadModels();
        
        // Setup model associations
        setupAssociations();
        
        // Sync database if DB_SYNC is true
        if (env.DATABASE.SYNC) {
            await sequelize.sync({ alter: env.DATABASE.SYNC === 'true' });
            console.log('✅ Database synchronized successfully.');
        }
        
        return db;
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        throw error;
    }
};

// Helper function for transactions
const transaction = async (callback) => {
    const t = await sequelize.transaction();
    try {
        const result = await callback(t);
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

// Export database instance and utilities
module.exports = {
    db,
    sequelize,
    Sequelize,
    DataTypes,
    transaction,
    initializeDatabase,
};