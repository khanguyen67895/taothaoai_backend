const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    problem: { type: String, required: true, trim: true },
    otherProblem: { type: String, trim: true },
    mode: {
      type: String,
      required: true,
      enum: ["offline", "online", "private", "more"],
    },
    telegramSent: { type: Boolean, default: false },
    telegramError: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contact", contactSchema);
