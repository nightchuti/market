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
        required: true
      },
      quantity: Number,
      price: Number
    }
  ],

  shippingAddress: {
    dormName: String,
    room: String,
    note: String,
    lat: Number,
    lng: Number
  },

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
      "Completed",
      "Cancelled",
      "Disputed"
    ],
    default: "PendingPayment"
  },

  deliveryDetails: {
    riderName: String,
    riderPhone: String,
    trackingUrl: String,
    deliveryId: String
  },

  paidAt: Date,
  completedAt: Date

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
