const jwt  = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, code: "UNAUTHENTICATED", message: "Vui lòng đăng nhập" });
    }

    const token = header.slice(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const code = err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
      return res.status(401).json({ success: false, code, message: "Token không hợp lệ hoặc đã hết hạn" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, code: "USER_NOT_FOUND", message: "Tài khoản không tồn tại" });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

exports.requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Không có quyền truy cập" });
  }
  next();
};
