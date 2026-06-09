const User  = require("../models/User");
const Order = require("../models/Order");
const { sendTelegramMessage } = require("../utils/telegram");

// ─── Linh Căn profiles (maps to frontend LINH_CAN array) ────────────────────
const LINH_CAN_PROFILES = [
  "Lưu Bị",
  "Trương Phi",
  "Quan Vũ",
  "Khổng Minh",
  "Tư Mã Ý",
];

// ─── Coupon codes ────────────────────────────────────────────────────────────
const normalizeLinhCanIndex = (answer) => {
  const value =
    typeof answer === "object" && answer !== null
      ? answer.resultIdx ?? answer.linhCanIdx ?? answer.linhCanIndex ?? answer.profileIdx ?? answer.value
      : answer;

  const idx = Number(value);
  return Number.isInteger(idx) && idx >= 0 && idx < LINH_CAN_PROFILES.length ? idx : null;
};

const calculateLinhCanResult = (answers) => {
  const scores = LINH_CAN_PROFILES.map(() => 0);

  answers.forEach((answer) => {
    if (answer && typeof answer === "object" && answer.scores && typeof answer.scores === "object") {
      LINH_CAN_PROFILES.forEach((_profile, idx) => {
        const score = Number(answer.scores[idx]);
        if (Number.isFinite(score) && score > 0) scores[idx] += score;
      });
      return;
    }

    const idx = normalizeLinhCanIndex(answer);
    if (idx !== null) scores[idx] += 1;
  });

  const maxScore = Math.max(...scores);
  if (maxScore <= 0) return null;

  const resultIdx = scores.findIndex((score) => score === maxScore);
  return {
    resultIdx,
    profile: LINH_CAN_PROFILES[resultIdx],
    scores,
  };
};

const DISCOUNT_CODES = {
  HOA_DAO_30: 0.3,
};

const BASE_PRICE = 24_000_000;

// ─── Helper: generate orderId ─────────────────────────────────────────────────
function genOrderId() {
  const d    = new Date();
  const ds   = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `#TTA${ds}${rand}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/t1/progress
// ─────────────────────────────────────────────────────────────────────────────
exports.getProgress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    const t1   = user.t1 || {};

    res.json({
      success: true,
      progress: {
        currentStep:      t1.currentStep    ?? 0,
        completedSteps:   t1.completedSteps ?? [],
        linhKhi:          t1.linhKhi        ?? 0,
        lapTheName:       t1.lapTheName    || "",
        lapTheSource:     t1.lapTheSource  || "",
        lapTheYoutube:    t1.lapTheYoutube || "",
        linhCanAnswers:   t1.linhCanAnswers   || [],
        linhCanResultIdx: t1.linhCanResultIdx ?? null,
        thienKiepAnswers: t1.thienKiepAnswers || [],
        thienKiepNiche:   t1.thienKiepNiche  || "",
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/t1/progress  — save currentStep / completedSteps / linhKhi
// ─────────────────────────────────────────────────────────────────────────────
exports.saveProgress = async (req, res, next) => {
  try {
    const { currentStep, completedSteps, linhKhi } = req.body;

    const update = {};
    if (currentStep    !== undefined) update["t1.currentStep"]    = currentStep;
    if (completedSteps !== undefined) update["t1.completedSteps"] = completedSteps;
    if (linhKhi        !== undefined) update["t1.linhKhi"]        = linhKhi;

    await User.findByIdAndUpdate(req.user.id, { $set: update });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/t1/survey  — step 1: Lập Thệ survey
// ─────────────────────────────────────────────────────────────────────────────
exports.saveSurvey = async (req, res, next) => {
  try {
    const { name, source, youtube } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        "t1.lapTheName":    name    || "",
        "t1.lapTheSource":  source  || "",
        "t1.lapTheYoutube": youtube || "",
      },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/t1/quiz/linh-can  — step 4: 5-question quiz
// Body: { answers: number[] }   (5 items, each 0-3)
// ─────────────────────────────────────────────────────────────────────────────
exports.saveLinhCan = async (req, res, next) => {
  try {
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: "answers phai la mang va khong duoc rong" });
    }

    const result = calculateLinhCanResult(answers);
    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Khong xac dinh duoc linh can tu cau tra loi",
      });
    }

    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        "t1.linhCanAnswers":   answers,
        "t1.linhCanResultIdx": result.resultIdx,
      },
    });

    res.json({
      success:   true,
      resultIdx: result.resultIdx,
      profile:   result.profile,
      scores:    result.scores,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/t1/quiz/thien-kiep  — step 10: quiz + niche
// Body: { answers: number[], niche: string }
// ─────────────────────────────────────────────────────────────────────────────
exports.saveThienKiep = async (req, res, next) => {
  try {
    const { answers, niche } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: "answers phải là mảng" });
    }

    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        "t1.thienKiepAnswers": answers,
        "t1.thienKiepNiche":   niche || "",
      },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/t1/coupon/validate
// Body: { code: string }
// ─────────────────────────────────────────────────────────────────────────────
exports.validateCoupon = async (req, res) => {
  const code     = (req.body.code || "").trim().toUpperCase();
  const discount = DISCOUNT_CODES[code];

  if (discount) {
    res.json({ success: true, valid: true, discount, code });
  } else {
    res.json({ success: true, valid: false, discount: 0 });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/t1/order  — create order
// Body: { name, alias, email, phone, method, couponCode?, amount }
// ─────────────────────────────────────────────────────────────────────────────
exports.createOrder = async (req, res, next) => {
  try {
    const { name, alias, email, phone, method, couponCode, amount } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !method) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }

    const discount    = couponCode ? (DISCOUNT_CODES[couponCode.toUpperCase()] ?? 0) : 0;
    const discountAmt = Math.round(BASE_PRICE * discount);
    const finalAmount = amount ?? (BASE_PRICE - discountAmt);

    // Unique orderId — retry on collision (extremely rare)
    let orderId;
    let attempts = 0;
    do {
      orderId = genOrderId();
      attempts++;
    } while (attempts < 5 && (await Order.exists({ orderId })));

    const order = await Order.create({
      orderId,
      userId:     req.user.id,
      name,
      alias:      alias || "",
      email:      email.toLowerCase(),
      phone,
      method,
      couponCode: couponCode ? couponCode.toUpperCase() : undefined,
      discount,
      baseAmount: BASE_PRICE,
      amount:     finalAmount,
      status:     "pending",
    });

    // Notify Telegram
    try {
      await sendTelegramMessage(
        `🛒 <b>ĐƠN HÀNG MỚI — T1 PHÀM NHÂN</b>\n\n` +
        `📋 <b>Mã đơn:</b> ${orderId}\n` +
        `👤 <b>Tên:</b> ${name} (${alias || "—"})\n` +
        `📧 <b>Email:</b> ${email}\n` +
        `📱 <b>SĐT:</b> ${phone}\n` +
        `💳 <b>Phương thức:</b> ${method.toUpperCase()}\n` +
        `🏷 <b>Coupon:</b> ${couponCode || "Không có"}\n` +
        `💰 <b>Số tiền:</b> ${finalAmount.toLocaleString("vi-VN")}đ`
      );
    } catch (e) {
      console.error("[t1/order] Telegram notify failed:", e.message);
    }

    res.status(201).json({
      success: true,
      orderId: order.orderId,
      status:  order.status,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/t1/order/:orderId
// ─────────────────────────────────────────────────────────────────────────────
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      orderId: req.params.orderId,
      userId:  req.user.id,
    }).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    res.json({
      success: true,
      order: {
        orderId:    order.orderId,
        status:     order.status,
        amount:     order.amount,
        method:     order.method,
        createdAt:  order.createdAt,
        paidAt:     order.paidAt,
      },
    });
  } catch (err) {
    next(err);
  }
};
