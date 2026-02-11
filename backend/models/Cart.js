const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
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

      quantity: {
        type: Number,
        default: 1
      },

      selected: {
        type: Boolean,
        default: true   // ⭐ สำคัญมาก
      }
    }
  ]
});

module.exports = mongoose.model("Cart", cartSchema);
