const axios = require("axios");
const { validationResult } = require("express-validator");
const Contact = require("../models/Contact");

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sendTelegramMessage = async (text) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error("Telegram chưa được cấu hình");
  }

  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  });
};

const LEARNING_MODE_LABEL = {
  offline: "Offline tại Đà Nẵng",
  online: "Online qua Zoom",
  private: "Kèm riêng 1-1",
  more: "Tư vấn thêm",
};

// ─── Controllers ─────────────────────────────────────────────────────────────

// GET /api/landing/media
// Returns list of hero videos and images for landing page
exports.getMedia = (_req, res) => {
  // In production, these URLs would come from a DB or CMS.
  // For now they are static pointers — swap URLs when you have real hosted content.
  const media = {
    videos: [
      {
        id: "hero-1",
        title: "Giới thiệu khoá học Tào Tháo AI Training",
        url: process.env.VIDEO_HERO_URL || null,
        thumbnail: process.env.VIDEO_HERO_THUMBNAIL || null,
        type: "hero",
      },
      {
        id: "demo-1",
        title: "Demo làm phim AI Drama bằng Seedance 2.0",
        url: process.env.VIDEO_DEMO_URL || null,
        thumbnail: process.env.VIDEO_DEMO_THUMBNAIL || null,
        type: "demo",
      },
    ],
    images: [
      {
        id: "mascot",
        url: "/mascot-3d-taothao.png",
        alt: "Tào Tháo mascot",
        type: "mascot",
      },
    ],
  };

  res.json({ success: true, data: media });
};

// POST /api/landing/contact
// Validates and forwards CTA form data to Telegram + saves to DB
exports.submitContact = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, phone, email, problem, otherProblem, mode } = req.body;

    // 1. Lưu vào DB trước
    const contact = await Contact.create({ name, phone, email, problem, otherProblem, mode });

    // 2. Gửi Telegram (không block response nếu lỗi)
    const problemText =
      problem === "Other" && otherProblem ? `Khác: ${otherProblem}` : problem;
    const modeLabel = LEARNING_MODE_LABEL[mode] || mode;
    const message =
      `📩 <b>ĐĂNG KÝ TƯ VẤN MỚI</b>\n\n` +
      `👤 <b>Họ và tên:</b> ${name}\n` +
      `📞 <b>Số điện thoại:</b> ${phone}\n` +
      `📧 <b>Email:</b> ${email || "Không cung cấp"}\n` +
      `❓ <b>Vấn đề:</b> ${problemText}\n` +
      `📚 <b>Hình thức học:</b> ${modeLabel}\n\n` +
      `🕐 <i>${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</i>`;

    sendTelegramMessage(message)
      .then(() => Contact.findByIdAndUpdate(contact._id, { telegramSent: true }))
      .catch((err) => Contact.findByIdAndUpdate(contact._id, { telegramError: err.message }));

    res.status(201).json({
      success: true,
      message: "Đã gửi thông tin thành công. Chúng tôi sẽ liên hệ sớm!",
    });
  } catch (err) {
    next(err);
  }
};
