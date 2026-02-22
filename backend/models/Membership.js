const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  plan: { type: String, default: "PRO" },
  price: { type: Number, default: 99 },
  slip: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  expireAt: Date
}, { timestamps: true });

module.exports = mongoose.model("Membership", membershipSchema);