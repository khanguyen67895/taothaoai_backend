const mongoose = require("mongoose");

const toolLeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    toolId: { type: String, required: true, trim: true },
    toolName: { type: String, required: true, trim: true },
    telegramSent: { type: Boolean, default: false },
    telegramError: { type: String },
    isRead: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["new", "contacting", "converted", "lost"],
      default: "new",
    },
    assignedTo: { type: String, trim: true, default: null },
    notes: { type: String, trim: true },
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

module.exports = mongoose.model("ToolLead", toolLeadSchema);
