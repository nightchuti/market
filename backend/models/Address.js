const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  dormName: String,
  room: String,
  note: String,

  lat: Number,
  lng: Number,

  isDefault: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Address", addressSchema);
