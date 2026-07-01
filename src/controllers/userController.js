const User           = require("../models/User");
const CourseProgress = require("../models/CourseProgress");
const ChatHistory    = require("../models/ChatHistory");

const T1_EXP_TOTAL = 1200;

// ── Streak helper ─────────────────────────────────────────────────────────────

async function updateStreak(userId, user) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  if (lastActive) lastActive.setHours(0, 0, 0, 0);

  if (lastActive && lastActive.getTime() === today.getTime()) return user.streakDays ?? 0;

  const isYesterday = lastActive && today.getTime() - lastActive.getTime() === 86_400_000;
  const streakDays  = !lastActive ? 1 : isYesterday ? (user.streakDays ?? 0) + 1 : 1;

  await User.findByIdAndUpdate(userId, { $set: { streakDays, lastActiveDate: new Date() } });
  return streakDays;
}

// ── Determine current tier from all progress docs ─────────────────────────────
// Returns the highest tier (by number) that has at least 1 completed step.
// Falls back to tier 1 if the user has no progress at all.

async function resolveCurrentTier(userId) {
  const allProgress = await CourseProgress.find(
    { userId, completedSteps: { $not: { $size: 0 } } },
    { tier: 1 }
  ).lean();

  if (!allProgress.length) return { currentTier: 1, tierName: "Phàm Nhân" };

  const TIER_NAMES = {
    t1: "Phàm Nhân", t2: "Luyện Khí", t3: "Trúc Cơ",  t4: "Kim Đan",
    t5: "Nguyên Anh", t6: "Hóa Thần", t7: "Luyện Hư", t8: "Hợp Thể",
    t9: "Đại Thừa",  t10: "Độ Kiếp",
  };

  const nums   = allProgress.map((p) => parseInt(p.tier.replace("t", ""), 10));
  const maxNum = Math.max(...nums);
  const key    = `t${maxNum}`;
  return { currentTier: maxNum, tierName: TIER_NAMES[key] || key };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/dashboard
// ─────────────────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    const [streakDays, t1Progress, tierInfo] = await Promise.all([
      updateStreak(req.user.id, user),
      CourseProgress.findOne({ userId: req.user.id, tier: "t1" }).lean(),
      resolveCurrentTier(req.user.id),
    ]);

    const linhKhi = t1Progress?.linhKhi ?? 0;

    res.json({
      success: true,
      profile: {
        fullName:   user.fullName,
        lapTheName: t1Progress?.surveyData?.lapTheName || "",
        avatar:     user.avatar || null,
        email:      user.email,
      },
      gamification: {
        linhKhi,
        streakDays,
        reviveCount:  user.reviveCount ?? 1,
        currentTier:  tierInfo.currentTier,
        tierName:     tierInfo.tierName,
        expTotal:     T1_EXP_TOTAL,
      },
      t1: {
        currentStep:    t1Progress?.currentStep    ?? 0,
        completedSteps: t1Progress?.completedSteps ?? [],
        linhKhi,
        lapTheName:     t1Progress?.surveyData?.lapTheName    || "",
        thienKiepNiche: t1Progress?.quizData?.thienKiepNiche  || "",
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/chat-history
// ─────────────────────────────────────────────────────────────────────────────
exports.getChatHistory = async (req, res, next) => {
  try {
    const doc = await ChatHistory.findOne({ userId: req.user.id }).lean();
    res.json({
      success:      true,
      messages:     doc?.messages     ?? [],
      userMsgCount: doc?.userMsgCount ?? 0,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/user/chat-history
// ─────────────────────────────────────────────────────────────────────────────
exports.saveChatHistory = async (req, res, next) => {
  try {
    const { messages, userMsgCount } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: "messages phải là mảng" });
    }

    const MAX = ChatHistory.schema.statics.MAX_MESSAGES;
    const trimmed = messages.slice(-MAX);

    await ChatHistory.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { messages: trimmed, userMsgCount: userMsgCount ?? 0 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/leaderboard
// Xếp hạng theo linhKhi của T1. Khi thêm T2+ sẽ tổng hợp linhKhi qua tất cả tier.
// ─────────────────────────────────────────────────────────────────────────────
exports.getLeaderboard = async (req, res, next) => {
  try {
    const myId = req.user.id.toString();

    const top5 = await CourseProgress.find({ tier: "t1", linhKhi: { $gt: 0 } })
      .sort({ linhKhi: -1 })
      .limit(5)
      .populate("userId", "fullName avatar")
      .lean();

    const myProgress = await CourseProgress.findOne({ userId: myId, tier: "t1" })
      .populate("userId", "fullName")
      .lean();

    const myLinhKhi = myProgress?.linhKhi ?? 0;
    const myRank    = (await CourseProgress.countDocuments({ tier: "t1", linhKhi: { $gt: myLinhKhi } })) + 1;

    const isInTop5 = top5.some((p) => p.userId?._id.toString() === myId);

    const RANK_COLORS = { 1: "#F5C842", 2: "#B0B0B0", 3: "#CD7F32" };

    const entries = top5.map((p, i) => ({
      rank:  i + 1,
      name:  p.surveyData?.lapTheName || p.userId?.fullName || "Tu Sĩ",
      lk:    `${(p.linhKhi ?? 0).toLocaleString("vi-VN")} LK`,
      color: RANK_COLORS[i + 1] || null,
      isYou: p.userId?._id.toString() === myId,
    }));

    if (!isInTop5) {
      entries.push({
        rank:  myRank,
        name:  myProgress?.surveyData?.lapTheName || myProgress?.userId?.fullName || "Tu Sĩ",
        lk:    `${myLinhKhi.toLocaleString("vi-VN")} LK`,
        color: null,
        isYou: true,
      });
    }

    res.json({ success: true, myRank, weeklyChange: 0, entries });
  } catch (err) {
    next(err);
  }
};
