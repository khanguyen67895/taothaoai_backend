const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: user.toPublicJSON(),
  });
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { fullName, username, email, phone, password, zaloName } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res
        .status(409)
        .json({ success: false, message: "Email đã được sử dụng" });
    }

    if (username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res
          .status(409)
          .json({ success: false, message: "Username đã tồn tại" });
      }
    }

    const user = await User.create({
      fullName,
      username,
      email,
      phone,
      password,
      zaloName,
    });

    sendToken(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { emailOrUsername, password } = req.body;

    // Find by email or username
    const user = await User.findOne({
      $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername.toLowerCase() }],
    }).select("+password");

    if (!user || !user.password) {
      return res
        .status(401)
        .json({ success: false, message: "Tài khoản hoặc mật khẩu không đúng" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Tài khoản hoặc mật khẩu không đúng" });
    }

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tài khoản" });
    }
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/google/callback — called after passport authenticates
exports.googleCallback = (req, res) => {
  const token = signToken(req.user._id);
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  // Redirect to frontend with token in query (frontend should store in localStorage)
  res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
};
