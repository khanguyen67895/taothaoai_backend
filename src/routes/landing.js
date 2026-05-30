const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const landingController = require("../controllers/landingController");
const { protect, requireAdmin } = require("../middleware/auth");

// Rate limit: max 5 contact submissions per IP per 15 minutes
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau 15 phút.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const contactRules = [
  body("name").trim().notEmpty().withMessage("Họ và tên là bắt buộc"),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Số điện thoại là bắt buộc")
    .matches(/^[0-9+\s\-()]{9,15}$/)
    .withMessage("Số điện thoại không hợp lệ"),
  body("email").optional().trim().isEmail().withMessage("Email không hợp lệ"),
  body("problem").trim().notEmpty().withMessage("Vui lòng chọn vấn đề"),
  body("mode")
    .trim()
    .notEmpty()
    .withMessage("Vui lòng chọn hình thức học")
    .isIn(["offline", "online", "private", "more", "collab"])
    .withMessage("Hình thức học không hợp lệ"),
  body("otherProblem").optional().trim(),
  body("youtubeChannel").optional().trim(),
  body("facebook").optional().trim(),
];

router.get("/media", landingController.getMedia);
router.post("/contact", contactLimiter, contactRules, landingController.submitContact);
router.patch("/contact/:id", protect, requireAdmin, landingController.updateContact);
router.delete("/contact/:id", protect, requireAdmin, landingController.deleteContact);

module.exports = router;
