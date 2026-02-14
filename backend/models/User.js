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
  gender: { 
    type: String, 
    default: "" 
  },
  bio: { 
    type: String, 
    default: "" 
  },
  profileImage: { 
    type: String, 
    default: "" 
  },
  birthday: { 
    type: String, 
    default: "" 
  },
  lastProfileUpdate: { 
    type: Date, 
    default: null 
  },
  lastImageUpdate: { 
    type: Date, 
    default: null },
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
