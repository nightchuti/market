const mongoose = require("mongoose");

const couponUsageSchema = new mongoose.Schema({
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }, // ผูกกับออเดอร์ (Optional)
  
  discountSnapshot: { type: Number, required: true }, // บันทึกว่าลดไปกี่บาทตอนนั้น
  usedAt: { type: Date, default: Date.now }
});

// Index สำคัญมาก: ช่วยเช็คว่า "User คนนี้ ใช้ Coupon นี้ ไปกี่ครั้งแล้ว"
couponUsageSchema.index({ userId: 1, couponId: 1 });

module.exports = mongoose.model("CouponUsage", couponUsageSchema);