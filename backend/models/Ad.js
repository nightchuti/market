// backend/models/Ad.js
const mongoose = require("mongoose");

const adSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String, required: true },
  location: { type: String },
  priceRange: { type: String },
  link: { type: String },
  expireAt: { type: Date, required: true }, // 👈 ต้องมีตัวนี้
}, { timestamps: true });

module.exports = mongoose.model("Ad", adSchema);