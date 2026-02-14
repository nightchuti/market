const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  
  // === ตั้งค่าส่วนลด ===
  discountType: { type: String, enum: ['PERCENT', 'AMOUNT'], default: 'AMOUNT' }, // ลด % หรือ ลดบาท
  discountValue: { type: Number, required: true }, // ค่าที่ลด (เช่น 10% หรือ 100บาท)
  maxDiscountAmount: { type: Number, default: 0 }, // เพดานส่วนลด (0=ไม่จำกัด) **สำคัญมากสำหรับ %**
  
  // === เงื่อนไข ===
  minSpend: { type: Number, default: 0 }, // ซื้อขั้นต่ำ
  
  // === โควตา (Inventory) ===
  quotaLimit: { type: Number, default: 0 }, // แจกทั้งหมดกี่ใบ (0=ไม่จำกัด)
  quotaUsed: { type: Number, default: 0 },  // ใช้ไปแล้วกี่ใบ (Atomic Count)
  
  // === จำกัดต่อคน ===
  limitPerUser: { type: Number, default: 1 }, // 1 คนใช้ได้กี่ครั้ง

  // === ระบบสมาชิก ===
  requiredTier: { 
    type: String, 
    enum: ['GENERAL', 'SILVER', 'GOLD', 'PLATINUM'], 
    default: 'GENERAL' 
  },

  expireAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Index ช่วยค้นหาเร็วขึ้น
couponSchema.index({ code: 1 });
couponSchema.index({ expireAt: 1, isActive: 1 });

module.exports = mongoose.model("Coupon", couponSchema);