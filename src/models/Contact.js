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
      enum: ["offline", "online", "private", "more", "collab"],
    },
    youtubeChannel: { type: String, trim: true },
    facebook: { type: String, trim: true },
    telegramSent: { type: Boolean, default: false },
    telegramError: { type: String },
    isRead: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["new", "contacted", "processing", "done"],
      default: "new",
    },
    assignedTo: { type: String, trim: true, default: null },
    conversionRate: { type: Number, default: null },
    situation: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("Contact", contactSchema);
