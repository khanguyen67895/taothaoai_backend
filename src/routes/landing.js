const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const landingController = require("../controllers/landingController");
const { protect, requireAdmin } = require("../middleware/auth");

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
  body("mode").optional().trim(),
  body("otherProblem").optional().trim(),
  body("youtubeChannel").optional().trim(),
  body("facebook").optional().trim(),
];

const ysuRules = [
  body("zalo")
    .trim()
    .notEmpty()
    .withMessage("Số Zalo là bắt buộc")
    .matches(/^[0-9+\s\-()]{9,15}$/)
    .withMessage("Số Zalo không hợp lệ"),
  body("symptoms")
    .isArray({ min: 1, max: 2 })
    .withMessage("Chọn 1–2 triệu chứng"),
  body("symptoms.*").isString().trim(),
  body("youtubeChannel").optional().trim(),
];

router.get("/media", landingController.getMedia);
router.post("/contact", contactRules, landingController.submitContact);
router.post("/ysu", ysuRules, landingController.submitYSuContact);
router.patch("/contact/:id", protect, requireAdmin, landingController.updateContact);
router.delete("/contact/:id", protect, requireAdmin, landingController.deleteContact);

module.exports = router;
