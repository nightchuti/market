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
    // ✅ ลบ trim: true ออก (ใช้ไม่ได้กับ enum)
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
  }
}, { timestamps: true });


// Index
productSchema.index({ title: "text", category: 1 });
productSchema.index({ user: 1 });
productSchema.index({ status: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);