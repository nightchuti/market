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
    trim: true // ตัดช่องว่างหัวท้าย
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
  // เปลี่ยนจาก quantity เฉยๆ เป็นการกำหนดค่าตรวจสอบด้วย
  quantity: { 
    type: Number,
    required: [true, "กรุณาระบุจำนวนสต็อก"],
    min: [0, "สินค้าในสต็อกไม่สามารถติดลบได้"], // สำคัญมากสำหรับการตัดสต็อก
    default: 0
  },
  images: [
    {
      type: String
    }
  ],
  isActive: { // เพิ่มสถานะเปิด/ปิดการขาย
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
    default: [] // สำหรับเก็บ AI Vector ของตัวสินค้าเอง
  },
  status: { 
    type: String, 
    enum: ["available", "pending", "exchanged", "sold"], 
    default: "available" 
  },

}, { timestamps: true });

// ทำ Index เพื่อให้ค้นหาด้วยชื่อหรือหมวดหมู่ได้เร็วขึ้น
productSchema.index({ title: "text", category: 1 });

module.exports = mongoose.model("Product", productSchema);