const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Lỗi máy chủ nội bộ";

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const fieldLabel = field === "email" ? "Email" : field === "username" ? "Username" : field;
    message = `${fieldLabel} đã được sử dụng`;
    statusCode = 409;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    statusCode = 400;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    message = "Token không hợp lệ";
    statusCode = 401;
  }
  if (err.name === "TokenExpiredError") {
    message = "Token đã hết hạn";
    statusCode = 401;
  }

  if (process.env.NODE_ENV === "development") {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
