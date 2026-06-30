const express = require("express");
const router  = express.Router();
const { body } = require("express-validator");

const t1 = require("../controllers/t1Controller");
const { protect } = require("../middleware/auth");

// All T1 routes require a logged-in user
router.use(protect);

// ─── Progress ────────────────────────────────────────────────────────────────
router.get("/progress", t1.getProgress);
router.put(
  "/progress",
  [
    body("currentStep").optional().isInt({ min: 0, max: 11 }),
    body("completedSteps").optional().isArray(),
    body("linhKhi").optional().isInt({ min: 0 }),
  ],
  t1.saveProgress
);

// ─── Survey (Step 1 — Lập Thệ) ───────────────────────────────────────────────
router.post(
  "/survey",
  [
    body("name").trim().notEmpty().withMessage("Tên là bắt buộc"),
    body("source").optional().trim(),
    body("youtube").optional().trim(),
  ],
  t1.saveSurvey
);

// ─── Quizzes ─────────────────────────────────────────────────────────────────
router.post(
  "/quiz/linh-can",
  [body("answers").isArray({ min: 1 }).withMessage("answers phai la mang va khong duoc rong")],
  t1.saveLinhCan
);

router.post(
  "/quiz/thien-kiep",
  [
    body("answers").isArray().withMessage("answers phải là mảng"),
    body("niche").optional().trim(),
  ],
  t1.saveThienKiep
);

// ─── Coupon ──────────────────────────────────────────────────────────────────
router.post(
  "/coupon/validate",
  [body("code").trim().notEmpty().withMessage("Code là bắt buộc")],
  t1.validateCoupon
);

// ─── Daily Chest ─────────────────────────────────────────────────────────────
router.get("/chest/status", t1.getChestStatus);
router.post("/chest/claim", t1.claimChest);

// ─── Step 2 Chat ─────────────────────────────────────────────────────────────
router.get("/step2-chat/status", t1.getStep2ChatStatus);
router.post(
  "/step2-chat/done",
  [body("linhCanIdx").isInt({ min: 0, max: 9 }).withMessage("linhCanIdx phải là số nguyên 0–9")],
  t1.markStep2ChatDone
);

// ─── Orders ──────────────────────────────────────────────────────────────────
router.post(
  "/order",
  [
    body("name").trim().notEmpty().withMessage("Tên là bắt buộc"),
    body("email").isEmail().normalizeEmail().withMessage("Email không hợp lệ"),
    body("phone")
      .trim()
      .matches(/^(\+84|0)[3-9]\d{8}$/)
      .withMessage("Số điện thoại không hợp lệ"),
    body("method")
      .isIn(["momo", "vnpay", "bank", "card", "zalo"])
      .withMessage("Phương thức thanh toán không hợp lệ"),
  ],
  t1.createOrder
);

router.get("/order/:orderId", t1.getOrder);

module.exports = router;
