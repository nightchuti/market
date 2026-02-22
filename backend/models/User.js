const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
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
      enum: ["nisit", "staff", "shop", "admin"],
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
      default: null
    },
    dormAddress: {
      type: String,
      default: ""
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      }
    ],
    membershipTier: {
      type: String,
      enum: ["FREE", "PRO"],
      default: "FREE"
    },
    
    // โควตาสำหรับการกด Boost (พรีเมียมได้ 3-5, เด็กใหม่ได้ 1)
    boostQuota: {
      type: Number,
      default: 1 // 🔥 ให้ 1 สิทธิ์ฟรีทันทีสำหรับ New User (กลุ่มที่ 3)
    },

    // กรณีเป็น PRO ต้องรู้วันหมดอายุเพื่อตัดกลับเป็น FREE
    premiumUntil: {
      type: Date,
      default: null
    },

    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
