const { transporter } = require("../config/mail");
const { env } = require("../config/env");

const TEAM_LEADER_WELCOME_TEMPLATE = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { background: #ffffff; border-radius: 8px; max-width: 600px; margin: 0 auto;
                  padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #2563eb; color: white; padding: 24px; border-radius: 8px 8px 0 0;
              text-align: center; margin: -40px -40px 32px -40px; }
    .header h1 { margin: 0; font-size: 22px; }
    .credentials { background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px;
                   padding: 20px; margin: 24px 0; }
    .credential-row { display: flex; justify-content: space-between; padding: 8px 0;
                      border-bottom: 1px solid #e0f2fe; }
    .credential-row:last-child { border-bottom: none; }
    .label { color: #6b7280; font-size: 13px; }
    .value { font-weight: bold; color: #1e40af; font-size: 14px; word-break: break-all; }
    .password-value { background: #1e293b; color: #f8fafc; padding: 4px 10px; border-radius: 4px;
                       font-family: monospace; font-size: 16px; letter-spacing: 2px; }
    .warning { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;
               padding: 16px; font-size: 13px; color: #92400e; margin-top: 24px; }
    .btn { display: inline-block; background: #2563eb; color: white; text-decoration: none;
           padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 24px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tài khoản Trưởng nhóm Tình nguyện viên</h1>
    </div>

    <p>Xin chào <strong>${data.username}</strong>,</p>

    <p>Ban Quản trị đã tạo tài khoản cho bạn tham gia nền tảng <strong>WDP Food Relief</strong> với vai trò <strong>Trưởng nhóm Tình nguyện viên</strong>.</p>

    <p>Dưới đây là thông tin đăng nhập của bạn:</p>

    <div class="credentials">
      <div class="credential-row">
        <span class="label">Email đăng nhập</span>
        <span class="value">${data.email}</span>
      </div>
      <div class="credential-row">
        <span class="label">Mật khẩu tạm thời</span>
        <span class="value password-value">${data.plainPassword}</span>
      </div>
      <div class="credential-row">
        <span class="label">Vai trò</span>
        <span class="value">Trưởng nhóm Tình nguyện viên</span>
      </div>
    </div>

    <div class="warning">
      <strong>Vì lý do bảo mật:</strong> Vui lòng đăng nhập và đổi mật khẩu ngay sau khi nhận được email này.
      Không chia sẻ thông tin đăng nhập cho bất kỳ ai.
    </div>

    <p style="margin-top: 32px;">Nếu bạn gặp bất kỳ vấn đề gì, vui lòng liên hệ bộ phận hỗ trợ.</p>

    <div class="footer">
      <p>Email này được gửi tự động từ hệ thống WDP Food Relief.<br>
      Vui lòng không trả lời trực tiếp email này.</p>
    </div>
  </div>
</body>
</html>
`;

class MailService {
  static async sendTeamLeaderWelcome({ toEmail, username, plainPassword }) {
    const mailOptions = {
      from: `"${env.MAIL.FROM_NAME}" <${env.MAIL.FROM_EMAIL}>`,
      to: toEmail,
      subject: "Tài khoản Trưởng nhóm Tình nguyện viên — WDP Food Relief",
      html: TEAM_LEADER_WELCOME_TEMPLATE({ email: toEmail, username, plainPassword }),
    };

    if (!env.MAIL.USER || !env.MAIL.PASS) {
      console.log("📧 [MAIL MOCK — not sent] To:", toEmail);
      console.log("   Subject:", mailOptions.subject);
      console.log("   Plain password:", plainPassword);
      return;
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Email sent:", info.messageId, "to:", toEmail);
      return info;
    } catch (error) {
      console.error("❌ Failed to send email:", error.message);
      throw error;
    }
  }
}

module.exports = MailService;
