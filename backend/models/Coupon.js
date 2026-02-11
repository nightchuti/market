const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // ส่วนลดแบบเปอร์เซ็นต์
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // ส่วนลดแบบจำนวนเงิน
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // ฟรีค่าจัดส่ง
  freeShipping: {
    type: Boolean,
    default: false
  },
  
  // ยอดขั้นต่ำ
  minSpend: {
    type: Number,
    default: 0
  },
  
  // จำกัดจำนวนการใช้ทั้งหมด (0 = ไม่จำกัด)
  maxUse: {
    type: Number,
    default: 0
  },
  
  // รายการ user ที่ใช้แล้ว
  usedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  
  // วันหมดอายุ
  expireAt: {
    type: Date,
    required: true
  },
  
  // สถานะ
  isActive: {
    type: Boolean,
    default: true
  }
  
}, {
  timestamps: true
});

module.exports = mongoose.model("Coupon", couponSchema);