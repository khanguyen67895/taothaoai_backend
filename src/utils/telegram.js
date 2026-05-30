const axios = require("axios");

const sendTelegramMessage = async (text) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_ID || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!botToken || chatIds.length === 0) {
    throw new Error("Telegram chưa được cấu hình");
  }

  const results = await Promise.allSettled(
    chatIds.map((chatId) =>
      axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      })
    )
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length === chatIds.length) {
    throw new Error(failed[0].reason?.message || "Gửi Telegram thất bại");
  }
};

module.exports = { sendTelegramMessage };
