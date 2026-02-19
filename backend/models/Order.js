const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  seller: {   // 🔥 สำคัญมาก (ไม่ต้อง query ผ่าน product)
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      quantity: Number,
      price: Number
    }
  ],

  // 🔥 แยก delivery method ชัดเจน
  deliveryMode: {
    type: String,
    enum: ["DELIVERY", "PICKUP"],
    required: true
  },

  shippingAddress: {
    dormName: String,
    room: String,
    note: String,
    lat: Number,
    lng: Number
  },

  deliveryDetails: {
    riderName: String,
    riderPhone: String,
    trackingUrl: String,
    deliveryId: String,
    proofImage: String // รูปตอนส่งให้ไรเดอร์
  },

  // 🔥 Meetup Security
  meetupOTP: String,
  meetupVerified: {
    type: Boolean,
    default: false
  },

  // 🔥 Escrow Control
  escrowStatus: {
    type: String,
    enum: ["Holding", "Released", "Refunded"],
    default: "Holding"
  },

  autoReleaseAt: Date,

  couponCode: String,

  paymentMethod: {
    type: String,
    enum: ["COD", "PROMPTPAY"],
    default: "PROMPTPAY"
  },

  paymentSlip: String,

  subTotal: Number,
  discount: Number,
  deliveryFee: Number,
  totalPrice: Number,

  status: {
    type: String,
    enum: [
      "PendingPayment",
      "WaitingConfirm",
      "Paid",
      "Preparing",
      "ReadyToShip",
      "Shipping",
      "WaitingMeetup",
      "Completed",
      "Cancelled",
      "Disputed"
    ],
    default: "PendingPayment"
  },

  paidAt: Date,
  completedAt: Date,

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
