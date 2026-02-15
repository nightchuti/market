const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: "ส่วนลดพิเศษสำหรับชาว KU" },
  discountType: { type: String, enum: ['PERCENT', 'AMOUNT'], default: 'AMOUNT' },
  discountValue: { type: Number, required: true },
  maxDiscountAmount: { type: Number, default: 0 },
  minSpend: { type: Number, default: 0 },
  quotaLimit: { type: Number, default: 0 },
  quotaUsed: { type: Number, default: 0 },
  limitPerUser: { type: Number, default: 1 },
  requiredTier: { type: String, enum: ['FREE', 'PRO'], default: 'FREE' },
  expireAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Coupon", couponSchema);