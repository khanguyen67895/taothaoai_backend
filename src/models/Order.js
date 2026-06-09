const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Billing info (copied at order time)
    name:  { type: String, required: true, trim: true },
    alias: { type: String, trim: true },     // tên đạo hiệu
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },

    method: {
      type: String,
      enum: ["momo", "vnpay", "bank", "card", "zalo"],
      required: true,
    },
    couponCode: { type: String, trim: true, uppercase: true },
    discount:   { type: Number, default: 0 }, // e.g. 0.3 = 30%
    baseAmount: { type: Number, required: true }, // before discount
    amount:     { type: Number, required: true }, // final amount (VND)

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paidAt: { type: Date },

    // Payment gateway refs
    gatewayRef:  { type: String },
    gatewayData: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
