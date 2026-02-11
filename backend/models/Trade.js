const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  offeredProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },

  wantedCategory: {
    type: String,
    required: true
  },

  wantedPriceRange: {
    min: Number,
    max: Number
  },

  status: {
    type: String,
    enum: ["Open", "Matched", "Accepted", "Rejected", "Completed"],
    default: "Open"
  },

  matchedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trade",
    default: null
  },

  verificationCode: { type: String }, // OTP สำหรับยืนยันเมื่อเจอกัน
  meetingLocation: { 
    name: String, 
    lat: Number, 
    lng: Number 
  },
  confirmedByOwner: { type: Boolean, default: false },
  confirmedByPartner: { type: Boolean, default: false },

  // เพิ่มฟิลด์นี้เข้าไปใน tradeSchema
  embeddings: {
    type: [Number], // เก็บชุดตัวเลขจาก AI
    select: false   // ไม่ต้องดึงออกมาทุกครั้งที่ query ปกติ
  },
  aiMatchScore: { type: Number, default: 0 },

  embeddings: {
    type: [Number], // ต้องเป็น Array ของตัวเลข
    default: []
},

image: { type: String, required: true }, // เก็บ URL จาก Cloudinary หรือ Firebase
embeddings: { type: [Number], default: [] } // ตัวเลข Vector จากรูปภาพ

}, { timestamps: true });

module.exports = mongoose.model("Trade", tradeSchema);
