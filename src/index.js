require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cron = require("node-cron");
const os = require("os");

const connectDB = require("./config/database");
require("./config/passport"); // initialise passport strategies

const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const { sendTelegramMessage } = require("./utils/telegram");

// ─── App ─────────────────────────────────────────────────────────────────────

const app = express();

// ─── Security & Logging ───────────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── Body Parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use("/api", routes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Endpoint không tồn tại" });
});

// Error handler (must be last)
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

// ─── Heartbeat ────────────────────────────────────────────────────────────────

const startFEMonitor = () => {
  const feUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  let failCount = 0;
  let feDown = false;

  cron.schedule("* * * * *", async () => {
    try {
      await axios.get(feUrl, { timeout: 5000 });
      failCount = 0;
      if (feDown) {
        feDown = false;
        const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        await sendTelegramMessage(
          `✅ <b>FRONTEND SERVER ĐÃ KHÔI PHỤC</b>\n\n` +
          `🌐 <b>URL:</b> ${feUrl}\n` +
          `🕐 <b>Thời gian:</b> ${now}`
        ).catch(() => {});
      }
    } catch (err) {
      failCount++;
      if (failCount === 2) {
        feDown = true;
        const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        await sendTelegramMessage(
          `🚨 <b>FRONTEND SERVER CÓ VẤN ĐỀ</b>\n\n` +
          `🌐 <b>URL:</b> ${feUrl}\n` +
          `❌ <b>Lỗi:</b> ${err.message}\n` +
          `🕐 <b>Thời gian:</b> ${now}`
        ).catch(() => {});
      }
    }
  });

  console.log(`🖥  FE Monitor đã khởi động — ping ${feUrl} mỗi 1 phút`);
};

const startHeartbeat = () => {
  // Chạy mỗi 5 phút: "*/5 * * * *"
  cron.schedule("*/5 * * * *", async () => {
    try {
      const uptimeSec  = Math.floor(process.uptime());
      const hours      = Math.floor(uptimeSec / 3600);
      const minutes    = Math.floor((uptimeSec % 3600) / 60);
      const memUsedMB  = Math.round(process.memoryUsage().rss / 1024 / 1024);
      const freeMemMB  = Math.round(os.freemem() / 1024 / 1024);
      const now        = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

      await sendTelegramMessage(
        `✅ <b>TAOTHAO AI — APP ĐANG HOẠT ĐỘNG</b>\n\n` +
        `🕐 <b>Thời gian:</b> ${now}\n` +
        `⏱ <b>Uptime:</b> ${hours}h ${minutes}m\n` +
        `💾 <b>RAM dùng:</b> ${memUsedMB} MB\n` +
        `🖥 <b>RAM trống:</b> ${freeMemMB} MB`
      );
    } catch (err) {
      console.error("[Heartbeat] Gửi Telegram thất bại:", err.message);
    }
  });

  console.log("💓 Heartbeat đã khởi động — thông báo mỗi 5 phút");
};

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server chạy tại http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}\n`);
    startHeartbeat();
    startFEMonitor();
  });
});

module.exports = app;
