const User = require("../models/User");

// LK tối đa T1: 12 bước, mỗi bước tích lũy linh khí
const T1_EXP_TOTAL = 1200;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: cập nhật streak khi user vào dashboard
// ─────────────────────────────────────────────────────────────────────────────
async function updateStreak(userId, user) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  if (lastActive) lastActive.setHours(0, 0, 0, 0);

  const isToday = lastActive && lastActive.getTime() === today.getTime();
  if (isToday) return user.streakDays ?? 0;

  const isYesterday =
    lastActive && today.getTime() - lastActive.getTime() === 86_400_000;

  let streakDays;
  if (!lastActive) {
    streakDays = 1; // lần đầu đăng nhập
  } else if (isYesterday) {
    streakDays = (user.streakDays ?? 0) + 1;
  } else {
    streakDays = 1; // chuỗi bị đứt
  }

  await User.findByIdAndUpdate(userId, {
    $set: { streakDays, lastActiveDate: new Date() },
  });

  return streakDays;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/dashboard
// ─────────────────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    const streakDays = await updateStreak(req.user.id, user);
    const t1 = user.t1 || {};
    const linhKhi = t1.linhKhi ?? 0;

    res.json({
      success: true,
      profile: {
        fullName:   user.fullName,
        lapTheName: t1.lapTheName || "",
        avatar:     user.avatar || null,
        email:      user.email,
      },
      gamification: {
        linhKhi,
        streakDays,
        reviveCount:  user.reviveCount ?? 1,
        currentTier:  1,
        tierName:     "Phàm Nhân",
        expTotal:     T1_EXP_TOTAL,
      },
      t1: {
        currentStep:     t1.currentStep    ?? 0,
        completedSteps:  t1.completedSteps ?? [],
        linhKhi,
        lapTheName:      t1.lapTheName     || "",
        thienKiepNiche:  t1.thienKiepNiche || "",
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/leaderboard
// Trả về top 5 người dùng theo linhKhi + vị trí của user hiện tại
// ─────────────────────────────────────────────────────────────────────────────
exports.getLeaderboard = async (req, res, next) => {
  try {
    const myId = req.user.id.toString();

    // Lấy top 5
    const top5 = await User.find({ "t1.linhKhi": { $gt: 0 } })
      .sort({ "t1.linhKhi": -1 })
      .limit(5)
      .select("fullName avatar t1.linhKhi t1.lapTheName")
      .lean();

    // Xếp hạng của user hiện tại
    const me = await User.findById(myId).select("fullName t1.linhKhi t1.lapTheName").lean();
    const myLinhKhi = me?.t1?.linhKhi ?? 0;
    const myRank =
      (await User.countDocuments({ "t1.linhKhi": { $gt: myLinhKhi } })) + 1;

    const isInTop5 = top5.some((u) => u._id.toString() === myId);

    const RANK_COLORS = { 1: "#F5C842", 2: "#B0B0B0", 3: "#CD7F32" };

    const entries = top5.map((u, i) => ({
      rank:  i + 1,
      name:  u.t1?.lapTheName || u.fullName,
      lk:    `${(u.t1?.linhKhi ?? 0).toLocaleString("vi-VN")} LK`,
      color: RANK_COLORS[i + 1] || null,
      isYou: u._id.toString() === myId,
    }));

    // Nếu user không nằm trong top 5, thêm vị trí của họ vào cuối
    if (!isInTop5) {
      entries.push({
        rank:  myRank,
        name:  me?.t1?.lapTheName || me?.fullName || "Tu Sĩ",
        lk:    `${myLinhKhi.toLocaleString("vi-VN")} LK`,
        color: null,
        isYou: true,
      });
    }

    res.json({
      success:      true,
      myRank,
      weeklyChange: 0, // TODO: cần lịch sử xếp hạng theo tuần
      entries,
    });
  } catch (err) {
    next(err);
  }
};
