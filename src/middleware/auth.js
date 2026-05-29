const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Vui lòng đăng nhập" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Tài khoản không tồn tại" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

exports.requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Không có quyền truy cập" });
  }
  next();
};
