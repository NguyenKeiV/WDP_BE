const nodemailer = require("nodemailer");
const { env } = require("./env");

const transporter = nodemailer.createTransport({
  host: env.MAIL.HOST,
  port: env.MAIL.PORT,
  secure: env.MAIL.SECURE,
  auth: {
    user: env.MAIL.USER,
    pass: env.MAIL.PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  socketTimeout: 100000,
});

const verifyConnection = async () => {
  if (!env.MAIL.USER || !env.MAIL.PASS) {
    console.warn("⚠️  Mail credentials not configured — emails will be logged only");
    return;
  }
  try {
    await transporter.verify();
    console.log("✅ SMTP mail server connected");
  } catch (error) {
    console.error("❌ SMTP connection failed:", error.message);
  }
};

module.exports = { transporter, verifyConnection };
