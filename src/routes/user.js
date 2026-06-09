const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getDashboard, getLeaderboard } = require("../controllers/userController");

// GET /api/user/dashboard — dữ liệu tổng quan dashboard
router.get("/dashboard", protect, getDashboard);

// GET /api/user/leaderboard — bảng phong thần theo linhKhi
router.get("/leaderboard", protect, getLeaderboard);

module.exports = router;
