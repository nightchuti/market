const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  title: {
    type: String,
    required: true
  },

  description: {
    type: String
  },

  price: {
    type: Number,
    required: true
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
      "อื่นๆ"
    ],
    required: true
  },

  quantity: {
    type: Number,
    default: 1
  },

  images: [
    {
      type: String
    }
  ],

  isRecommended: {
    type: Boolean,
    default: false
  },

  exchangeable: {
    type: Boolean,
    default: false
  }


}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
