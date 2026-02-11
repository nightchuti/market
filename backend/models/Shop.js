const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: "My Shop"
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  address: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Shop", shopSchema);