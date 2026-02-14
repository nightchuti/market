const mongoose = require("mongoose");

const profileLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  changedFields: {
    type: Object, // เก็บว่าฟิลด์ไหนเปลี่ยนจากอะไรเป็นอะไร
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ProfileLog", profileLogSchema);