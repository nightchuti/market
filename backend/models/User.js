const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phonenumber: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["nisit", "staff", "shop"],
    default: "nisit"
  },
  dormAddress: {
    type: String
  },
  favorites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
