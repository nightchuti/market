// models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoomTalk", // ✅ แก้จาก "ChatRoom" → ตรงกับ ChatRoomTalk model
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      default: "",
    },

    // ── ประเภทข้อความ ─────────────────────────────────────
    messageType: {
      type: String,
      enum: [
        "text",
        "system",
        "trade_request",  // A ขอเทรด
        "trade_accept",   // B ยอมรับ
        "trade_reject",   // B ปฏิเสธ
        "trade_cancel",   // ฝ่ายใดฝ่ายหนึ่งยกเลิก
        "trade_confirm",  // ✅ แก้จาก "trade_complete" → ตรงกับที่ socketManager + chatController ส่ง
      ],
      default: "text",
    },

    // ── metadata ─────────────────────────────────────────
    // ✅ เปลี่ยนเป็น Mixed (Schema.Types.Mixed) เพื่อรับ structure ได้ทุกแบบ
    // เหตุผล: trade_request ส่ง { offeredProduct, targetProduct }
    //         trade_accept/cancel ส่ง {} หรือ { method }
    //         การ strict schema ทำให้ field ที่ไม่ได้ประกาศถูกตัดทิ้งเงียบๆ
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// ── Index ─────────────────────────────────────────────────
// เร็วขึ้นมากเวลา getMessages ดึงทั้งห้อง
messageSchema.index({ roomId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);