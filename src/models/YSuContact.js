const mongoose = require("mongoose");

const ysuContactSchema = new mongoose.Schema(
  {
    symptoms:       { type: [String], default: [] },
    zalo:           { type: String, required: true, trim: true },
    youtubeChannel: { type: String, trim: true },
    telegramSent:   { type: Boolean, default: false },
    telegramError:  { type: String },
    isRead:         { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["new", "contacting", "converted", "lost"],
      default: "new",
    },
    assignedTo: { type: String, trim: true, default: null },
    notes:      { type: String, trim: true },
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

module.exports = mongoose.model("YSuContact", ysuContactSchema);
