const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http"); // THÊM

const { env, validateEnv } = require("./src/config/env");
const { initializeDatabase } = require("./src/config/database");
const { initSocket } = require("./src/config/socket"); // SỬA đường dẫn

validateEnv();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const path = require("path");
const routes = require("./src/routes/index");
app.use("/api", routes);
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

app.use((err, req, res, next) => {
  console.error("Error:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// THÊM: tạo http server từ express app
const server = http.createServer(app);

const startServer = async () => {
  try {
    await initializeDatabase();
    console.log("❤️  Database initialized successfully");

    // THÊM: khởi tạo socket
    initSocket(server);
    console.log("🔌 Socket.io initialized");

    // SỬA: dùng server.listen thay vì app.listen
    server.listen(env.PORT, () => {
      console.log(`🚀 Server is running on port ${env.PORT}`);
      console.log(`📍 Environment: ${env.NODE_ENV}`);
      console.log(
        `💾 Database: ${env.DATABASE.HOST}:${env.DATABASE.PORT}/${env.DATABASE.NAME}`,
      );
      console.log(
        `🔄 Database Sync: ${env.DATABASE.SYNC ? "Enabled" : "Disabled"}`,
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
