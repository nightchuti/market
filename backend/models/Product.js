const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  price: {
    type: Number,
    required: true,
    min: [0, "ราคาต้องไม่ต่ำกว่า 0"]
  },
  category: {
    type: String,
    enum: [
      "เสื้อผ้า",
      "เครื่องใช้ไฟฟ้า",
      "หนังสือ",
      "เฟอร์นิเจอร์",
      "อุปกรณ์การเรียน",
      "อาหาร",
      "อุปกรณ์สัตว์เลี้ยง",
      "อุปกรณ์อิเล็กทรอนิกส์",
      "อื่นๆ"
    ],
    required: true
  },
  quantity: {
    type: Number,
    required: [true, "กรุณาระบุจำนวนสต็อก"],
    min: [0, "สินค้าในสต็อกไม่สามารถติดลบได้"],
    default: 0
  },
  images: [{ type: String }],
  isActive: {
    type: Boolean,
    default: true
  },
  deliveryType: {
    type: String,
    enum: ["meetup", "delivery", "both"],
    default: "delivery"
  },
  tradeOption: {
    type: String,
    enum: ["sell_only", "trade_allowed", "negotiable"],
    default: "sell_only"
  },
  lat: {
    type: Number,
    default: null
  },
  lng: {
    type: Number,
    default: null
  },
  locationName: {
    type: String,
    trim: true
  },
  embeddings: {
    type: [Number],
    default: []
  },
  status: {
    type: String,
    enum: ["available", "pending", "exchanged", "sold"],
    default: "available"
  },

  // ============================================
  // ✅ เพิ่ม 2 Fields นี้ เพื่อรองรับระบบ Boost
  // ============================================
  isBoosted: { 
    type: Boolean, 
    default: false 
  },
  boostExpireAt: { 
    type: Date,
    default: null
  },
  isLocked: {
  type: Boolean,
  default: false
},

lockedByRoom: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "ChatRoom",
  default: null
}

}, { timestamps: true });

// Index
productSchema.index({
  title: "text",
  description: "text"
});
productSchema.index({ user: 1 });
productSchema.index({ status: 1 });

// ✅ แก้ Index ตรงนี้: ให้ MongoDB เรียงข้อมูลเร็วขึ้นเวลาเราดึงหน้า Feed
// (เรียงคนจ่ายเงินขึ้นก่อน -> ตามด้วยของใหม่ล่าสุด)
productSchema.index({ isBoosted: -1, createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);