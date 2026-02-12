// backend/models/Trade.js
const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // 🔴 จุดที่แก้: ต้องเป็น ObjectId และมี ref ไปที่ Product
  offeredProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product", // ชื่อต้องตรงกับ Model Product ของคุณ
    required: true
  },
  wantedCategory: { type: String, required: true },
  description: { type: String },
  wantedPriceRange: { type: String },
  
  status: {
    type: String,
    default: "Open",
    enum: ["Open", "Matched", "Locked", "Completed", "Cancelled"]
  },

  lat: { type: Number },
  lng: { type: Number },

  embeddings: { type: [Number], default: [] },
  matchedWith: { type: mongoose.Schema.Types.ObjectId, ref: "Trade" },
  verificationCode: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Trade", tradeSchema);