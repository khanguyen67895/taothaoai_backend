require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/database");
require("./config/passport"); // initialise passport strategies

const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

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

// Global rate limit: 100 requests per 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Quá nhiều yêu cầu, thử lại sau." },
  })
);

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

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server chạy tại http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}\n`);
  });
});

module.exports = app;
