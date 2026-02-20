const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["trade", "normal"],
    default: "normal"
  },
  // ✅ ปรับปรุงโครงสร้าง Array ของ Participants
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }],
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    //required: null
    default: null
  },

  // Trade Fields
  offeredProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    default: null
  },
  tradeStatus: {
    type: String,
    enum: ["pending", "negotiating", "accepted", "rejected", "cancelled", "completed"],
    default: "pending"
    //default: null
  },
  isLocked: { type: Boolean, default: false },
  lockedProductSnapshot: { type: Object, default: null },
  lockedOfferedProductSnapshot: { type: Object, default: null },
  completedAt: { type: Date, default: null },
  // Metadata
  lastMessage: { type: String, default: "" },
  lastMessageAt: { type: Date, default: Date.now },
  // 🔥 เพิ่ม tradeId
  tradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trade"
  },
  unreadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

// ✅ เพิ่ม Validation ตรวจสอบจำนวนผู้เข้าร่วม (ป้องกัน participants.1 required)
chatRoomSchema.path('participants').validate(function (value) {
  return value.length === 2;
}, 'ต้องมีผู้เข้าร่วมแชท 2 คน (ผู้ซื้อและผู้ขาย)');

chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ lastMessageAt: -1 });

// 🔥 เพิ่ม index สำหรับ tradeStatus
chatRoomSchema.index({ tradeStatus: 1 });

// 🔥 กัน normal room มี trade data
chatRoomSchema.pre("save", function (next) {

  if (this.type === "normal") {
    this.tradeId = undefined;
    this.tradeStatus = undefined;
    this.isLocked = false;
    this.lockedProductSnapshot = null;
    this.lockedOfferedProductSnapshot = null;
  }

  next();
});

// 🔥 เพิ่ม index
chatRoomSchema.index({ tradeId: 1 });


// 🔥 ป้องกัน participants ซ้ำ
chatRoomSchema.path("participants").validate(function (value) {
  if (value.length !== 2) return false;
  return value[0].toString() !== value[1].toString();
}, "ต้องมีผู้เข้าร่วม 2 คน และต้องไม่ใช่คนเดียวกัน");


chatRoomSchema.pre("validate", function (next) {
  if (this.type === "trade") {
    if (!this.productId || !this.offeredProductId) {
      return next(new Error("Trade room must have both productId and offeredProductId"));
    }
  }
  next();
});

module.exports = mongoose.model("ChatRoomTalk", chatRoomSchema);