const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true   // ✅ แนะนำเพิ่ม
      },
      quantity: {
        type: Number,
        required: true,
        min: 1           // ✅ กันจำนวนติดลบ
      },
      price: {
        type: Number,
        required: true,
        min: 0           // ✅ กันราคาติดลบ
      }
    }
  ],

  shippingAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true }
  },

  shippingAddress: {
    dormName: String,
    room: String,
    note: String,
    lat: Number,
    lng: Number
  },

  couponCode: {
    type: String,
    default: null
  },

  paymentMethod: {
    type: String,
    enum: ["COD", "PROMPTPAY"],
    default: "COD"
  },

  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },

  status: {
    type: String,
    enum: ["Pending", "Paid", "Shipped", "Completed", "Cancelled"],
    default: "Pending"
  }

  


}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
