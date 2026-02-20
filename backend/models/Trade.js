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
  matchedWith: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Trade" 
  },
  verificationCode: { type: String }
}, { timestamps: true });
tradeSchema.index({ owner: 1, status: 1 });
tradeSchema.index({ matchedWith: 1 });
// 🔥 เพิ่ม text index สำหรับ search
tradeSchema.index({ description: "text", wantedCategory: "text" });
// 🔥 ป้องกัน matchedWith ชี้ตัวเอง
tradeSchema.pre("save", function (next) {
  if (this.matchedWith && this.matchedWith.equals(this._id)) {
    return next(new Error("Trade cannot match itself"));
  }
  next();
});
// 🔥 ล้าง verificationCode ถ้าไม่ Locked
tradeSchema.pre("save", function (next) {
  if (this.status !== "Locked") {
    this.verificationCode = undefined;
  }
  next();
});
//คนสามารถสร้าง trade โดยเอาของคนอื่นมาเสนอได้ แต่ต้องเป็นของที่ตัวเองเป็นเจ้าของเท่านั้น
tradeSchema.pre("validate", async function (next) {
  if (!this.isModified("offeredProduct")) return next();

  const Product = mongoose.model("Product");
  const product = await Product.findById(this.offeredProduct);

  if (!product) {
    return next(new Error("Offered product not found"));
  }

  if (product.user.toString() !== this.owner.toString()) {
    return next(new Error("You are not the owner of the offered product"));
  }

  next();
});
module.exports = mongoose.model("Trade", tradeSchema);