const express = require("express");
const router = express.Router();
const passport = require("passport");
const { body } = require("express-validator");

const authController = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Validation rules
const registerRules = [
  body("fullName").trim().notEmpty().withMessage("Họ và tên là bắt buộc"),
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Username từ 3-20 ký tự"),
  body("email").isEmail().normalizeEmail().withMessage("Email không hợp lệ"),
  body("phone")
    .optional()
    .trim()
    .matches(/^[0-9+\s\-()]{9,15}$/)
    .withMessage("Số điện thoại không hợp lệ"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Mật khẩu tối thiểu 6 ký tự"),
  body("zaloName").optional().trim(),
];

const loginRules = [
  body("emailOrUsername")
    .trim()
    .notEmpty()
    .withMessage("Email hoặc username là bắt buộc"),
  body("password").notEmpty().withMessage("Mật khẩu là bắt buộc"),
];

// Local auth
router.post("/register", registerRules, authController.register);
router.post("/login", loginRules, authController.login);
router.get("/me", protect, authController.getMe);

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/api/auth/google/failure" }),
  authController.googleCallback
);

router.get("/google/failure", (_req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
});

module.exports = router;
