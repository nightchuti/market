const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      default: ""
    },
    // ประเภทข้อความพิเศษ
    messageType: {
      type: String,
      enum: ["text", "system", "trade_request", "trade_accept", "trade_reject", "trade_cancel", "trade_complete"],
      default: "text"
    },
    // ข้อมูลเพิ่มเติม (เช่น snapshot สินค้าตอนส่ง trade request)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);