const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", required: true
  },
  offeredProduct: {
    type: String, required: true
  },
  wantedCategory: { type: String, required: true },

  description: { type: String },

  wantedPriceRange: { type: String },

  status: { 
    type: String, 
    default: "Open", 
    enum: ["Open", "Matched", "Locked", "Completed", "Cancelled"] },

  // พิกัด (ไม่ใส่ required เพื่อกัน Error แต่แนะนำให้ส่งจากหน้าบ้าน)
  lat: { type: Number },
  lng: { type: Number },
  
  // AI Data
  embeddings: { type: [Number], default: [] },
  matchedWith: { type: mongoose.Schema.Types.ObjectId, ref: "Trade" },
  verificationCode: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Trade", tradeSchema);