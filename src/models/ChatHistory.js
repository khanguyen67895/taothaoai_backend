const mongoose = require("mongoose");

// Lưu lịch sử chat chatbot của user — tối đa MAX_MESSAGES tin nhắn gần nhất
// Dùng chung cho ChatbotWidget (general chat) và step2 chat theo linhCanIdx
const MAX_MESSAGES = 60;

const messageSchema = new mongoose.Schema(
  {
    role:    { type: String, enum: ["user", "assistant", "ai"], required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const chatHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    messages:     { type: [messageSchema], default: [] },
    userMsgCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

chatHistorySchema.statics.MAX_MESSAGES = MAX_MESSAGES;

module.exports = mongoose.model("ChatHistory", chatHistorySchema);
