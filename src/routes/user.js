const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { protect } = require("../middleware/auth");
const { getDashboard, getLeaderboard, getChatHistory, saveChatHistory } = require("../controllers/userController");

// GET /api/user/dashboard — dữ liệu tổng quan dashboard
router.get("/dashboard", protect, getDashboard);

// GET /api/user/leaderboard — bảng phong thần theo linhKhi
router.get("/leaderboard", protect, getLeaderboard);

// GET /api/user/chat-history — lịch sử chat chatbot
router.get("/chat-history", protect, getChatHistory);

// PUT /api/user/chat-history — lưu lịch sử chat chatbot
router.put(
  "/chat-history",
  protect,
  [body("messages").isArray().withMessage("messages phải là mảng")],
  saveChatHistory
);

module.exports = router;
