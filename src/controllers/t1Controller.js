const Order = require("../models/Order");
const {
  findProgress,
  upsertProgress,
  mapT1Response,
  calculateLinhCanResult,
  validateCouponCode,
  calcFinalAmount,
  genOrderId,
  BASE_PRICE,
} = require("../services/courseProgress.service");
const { sendTelegramMessage } = require("../utils/telegram");

const TIER = "t1";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/t1/progress
// ─────────────────────────────────────────────────────────────────────────────
exports.getProgress = async (req, res, next) => {
  try {
    const cp = await findProgress(req.user.id, TIER);
    res.json({ success: true, progress: mapT1Response(cp) });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/t1/progress
// ─────────────────────────────────────────────────────────────────────────────
exports.saveProgress = async (req, res, next) => {
  try {
    const { currentStep, completedSteps, linhKhi } = req.body;
    const fields = {};
    if (currentStep    !== undefined) fields.currentStep    = currentStep;
    if (completedSteps !== undefined) fields.completedSteps = completedSteps;
    if (linhKhi        !== undefined) fields.linhKhi        = linhKhi;

    await upsertProgress(req.user.id, TIER, fields);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/t1/survey  — step 0: Lập Thệ
// ─────────────────────────────────────────────────────────────────────────────
exports.saveSurvey = async (req, res, next) => {
  try {
    const { name, source, youtube } = req.body;
    await upsertProgress(req.user.id, TIER, {
      "surveyData.lapTheName":    name    || "",
      "surveyData.lapTheSource":  source  || "",
      "surveyData.lapTheYoutube": youtube || "",
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/t1/quiz/linh-can  — step 1
// ─────────────────────────────────────────────────────────────────────────────
exports.saveLinhCan = async (req, res, next) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: "answers phải là mảng và không được rỗng" });
    }

    const result = calculateLinhCanResult(answers);
    if (!result) {
      return res.status(400).json({ success: false, message: "Không xác định được linh căn từ câu trả lời" });
    }

    await upsertProgress(req.user.id, TIER, {
      "quizData.linhCanAnswers":   answers,
      "quizData.linhCanResultIdx": result.resultIdx,
    });

    res.json({ success: true, resultIdx: result.resultIdx, profile: result.profile, scores: result.scores });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/t1/quiz/thien-kiep  — step 8
// ─────────────────────────────────────────────────────────────────────────────
exports.saveThienKiep = async (req, res, next) => {
  try {
    const { answers, niche } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: "answers phải là mảng" });
    }

    await upsertProgress(req.user.id, TIER, {
      "quizData.thienKiepAnswers": answers,
      "quizData.thienKiepNiche":   niche || "",
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/t1/coupon/validate
// ─────────────────────────────────────────────────────────────────────────────
exports.validateCoupon = (req, res) => {
  const { valid, discount, code } = validateCouponCode(req.body.code);
  res.json({ success: true, valid, discount, ...(valid ? { code } : {}) });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/t1/order
// ─────────────────────────────────────────────────────────────────────────────
exports.createOrder = async (req, res, next) => {
  try {
    const { name, alias, email, phone, method, couponCode, amount } = req.body;
    if (!name || !email || !phone || !method) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }

    const { discount } = validateCouponCode(couponCode);
    const finalAmount  = calcFinalAmount(couponCode, amount);

    let orderId, attempts = 0;
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

    res.status(201).json({ success: true, orderId: order.orderId, status: order.status });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/t1/order/:orderId
// ─────────────────────────────────────────────────────────────────────────────
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId, userId: req.user.id }).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }
    res.json({
      success: true,
      order: {
        orderId:   order.orderId,
        status:    order.status,
        amount:    order.amount,
        method:    order.method,
        createdAt: order.createdAt,
        paidAt:    order.paidAt,
      },
    });
  } catch (err) {
    next(err);
  }
};
