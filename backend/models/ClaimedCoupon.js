// 📄 backend/models/ClaimedCoupon.js
const mongoose = require("mongoose");

const claimedSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
  isUsed: { type: Boolean, default: false },
  claimedAt: { type: Date, default: Date.now }
});

// ทำ Index เพื่อห้ามเก็บคูปองใบเดิมซ้ำ และช่วยให้ค้นหาเร็วขึ้น
claimedSchema.index({ userId: 1, couponId: 1 }, { unique: true });

module.exports = mongoose.model("ClaimedCoupon", claimedSchema);