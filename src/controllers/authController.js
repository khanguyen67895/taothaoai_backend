const jwt          = require("jsonwebtoken");
const { createHash, randomBytes, randomUUID } = require("crypto");
const { validationResult } = require("express-validator");
const User         = require("../models/User");
const RefreshToken = require("../models/RefreshToken");

// ── Token helpers ─────────────────────────────────────────────────────────────

const sha256 = (v) => createHash("sha256").update(v).digest("hex");

const ACCESS_TTL  = process.env.JWT_EXPIRES_IN       || "15m";
const REFRESH_TTL = Number(process.env.REFRESH_TOKEN_TTL || 604800); // seconds, default 7 days

function signAccess(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

async function issueRefreshToken(userId) {
  const raw = randomBytes(48).toString("base64url");
  const id  = randomUUID();
  await RefreshToken.create({
    _id:       id,
    userId,
    tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + REFRESH_TTL * 1000),
  });
  return `${id}.${raw}`;
}

// Returns userId if valid, null otherwise.
// On hash mismatch (possible theft) → revokes ALL tokens for that user.
async function consumeRefreshToken(token) {
  const dotIdx = (token || "").indexOf(".");
  if (dotIdx === -1) return null;
  const id  = token.slice(0, dotIdx);
  const raw = token.slice(dotIdx + 1);

  const rec = await RefreshToken.findById(id);
  if (!rec || rec.revoked || rec.expiresAt < new Date()) return null;

  if (rec.tokenHash !== sha256(raw)) {
    // Possible token theft — invalidate all sessions for this user
    await RefreshToken.updateMany({ userId: rec.userId }, { revoked: true });
    return null;
  }

  // Rotation: revoke consumed token (new one issued by caller)
  await RefreshToken.findByIdAndUpdate(id, { revoked: true });
  return rec.userId.toString();
}

// ── Shared response helper ────────────────────────────────────────────────────

async function sendTokenPair(user, statusCode, res) {
  const [accessToken, refreshToken] = await Promise.all([
    Promise.resolve(signAccess(user._id)),
    issueRefreshToken(user._id),
  ]);

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toPublicJSON ? user.toPublicJSON() : user,
  });
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { fullName, username, email, phone, password, zaloName } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ success: false, message: "Email đã được sử dụng" });
    }
    if (username && await User.findOne({ username })) {
      return res.status(409).json({ success: false, message: "Username đã tồn tại" });
    }

    const user = await User.create({ fullName, username, email, phone, password, zaloName });
    await sendTokenPair(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { emailOrUsername, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email:    emailOrUsername.toLowerCase() },
        { username: emailOrUsername.toLowerCase() },
      ],
    }).select("+password");

    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: "Tài khoản hoặc mật khẩu không đúng" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Tài khoản hoặc mật khẩu không đúng" });
    }

    await sendTokenPair(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

exports.refresh = async (req, res, next) => {
  try {
    const token = req.body.refreshToken;
    if (!token) {
      return res.status(400).json({ success: false, message: "refreshToken là bắt buộc" });
    }

    const userId = await consumeRefreshToken(token);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Refresh token không hợp lệ hoặc đã hết hạn" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "Tài khoản không tồn tại" });
    }

    await sendTokenPair(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

exports.logout = async (req, res, next) => {
  try {
    const token = req.body.refreshToken;
    if (token) {
      const dotIdx = token.indexOf(".");
      if (dotIdx !== -1) {
        const id = token.slice(0, dotIdx);
        await RefreshToken.findByIdAndUpdate(id, { revoked: true });
      }
    }
    res.json({ success: true, message: "Đã đăng xuất" });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản" });
    }
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/google/callback ─────────────────────────────────────────────

exports.googleCallback = async (req, res) => {
  try {
    const accessToken  = signAccess(req.user._id);
    const refreshToken = await issueRefreshToken(req.user._id);
    const frontendUrl  = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(
      `${frontendUrl}/auth/callback?token=${accessToken}&refreshToken=${encodeURIComponent(refreshToken)}`
    );
  } catch {
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=server_error`);
  }
};
