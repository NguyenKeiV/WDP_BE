const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const { env, validateEnv } = require('./src/config/env');
const { initializeDatabase } = require('./src/config/database');
validateEnv();

const app = express();

app.use(cors({
    origin: env.CORS.ORIGIN,
    credentials: env.CORS.CREDENTIALS
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

const routes = require('./src/routes/index');
app.use('/api', routes);

app.use((err, req, res, next) => {
    console.error('Error:', err);

    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Initialize database and start server
const startServer = async () => {
    try {
        // Initialize Sequelize database
        await initializeDatabase();
        console.log('❤️  Database initialized successfully');

        // Start server
        app.listen(env.PORT, () => {
            console.log(`🚀 Server is running on port ${env.PORT}`);
            console.log(`📍 Environment: ${env.NODE_ENV}`);
            console.log(`💾 Database: ${env.DATABASE.HOST}:${env.DATABASE.PORT}/${env.DATABASE.NAME}`);
            console.log(`🔄 Database Sync: ${env.DATABASE.SYNC ? 'Enabled' : 'Disabled'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Start the application
startServer();