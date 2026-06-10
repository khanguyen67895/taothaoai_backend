const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Họ và tên là bắt buộc"],
      trim: true,
      maxlength: [100, "Họ và tên không được quá 100 ký tự"],
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // allow null for Google-only users
      trim: true,
      lowercase: true,
      minlength: [3, "Username tối thiểu 3 ký tự"],
      maxlength: [30, "Username tối đa 30 ký tự"],
      match: [/^[a-z0-9_]+$/, "Username chỉ chứa chữ thường, số và dấu _"],
    },
    email: {
      type: String,
      required: [true, "Email là bắt buộc"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\s\-()]{9,15}$/, "Số điện thoại không hợp lệ"],
    },
    password: {
      type: String,
      minlength: [6, "Mật khẩu tối thiểu 6 ký tự"],
      select: false, // don't return password by default
    },
    zaloName: {
      type: String,
      trim: true,
      maxlength: [100, "Tên Zalo không được quá 100 ký tự"],
    },
    googleId: {
      type: String,
      sparse: true,
    },
    avatar: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // ─── Gamification ───────────────────────────────────────────────────
    // Course progress (T1-T10) lives in the CourseProgress collection,
    // one document per (user, tier). See src/models/CourseProgress.js.
    streakDays:     { type: Number, default: 0 },
    lastActiveDate: { type: Date },
    reviveCount:    { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    username: this.username,
    email: this.email,
    phone: this.phone,
    zaloName: this.zaloName,
    avatar: this.avatar,
    isEmailVerified: this.isEmailVerified,
    role: this.role,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
