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
    //default: "pending"
    default: null
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


chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ lastMessageAt: -1 });

// 🔥 เพิ่ม index สำหรับ tradeStatus
chatRoomSchema.index({ tradeStatus: 1 });

// 🔥 กัน normal room มี trade data
chatRoomSchema.pre("save", async function () {

  if (this.type === "normal") {
    this.tradeId = null;
    this.tradeStatus = null;
    this.isLocked = false;
    this.lockedProductSnapshot = null;
    this.lockedOfferedProductSnapshot = null;
    this.offeredProductId = null;
  }

  if (this.type === "trade" && !this.tradeStatus) {
    this.tradeStatus = "pending";
  }

});

// 🔥 เพิ่ม index
chatRoomSchema.index({ tradeId: 1 });

chatRoomSchema.path("participants").validate(function (value) {
  if (value.length !== 2) return false;
  return value[0].toString() !== value[1].toString();
}, "ต้องมีผู้เข้าร่วม 2 คน และต้องไม่ใช่คนเดียวกัน");



chatRoomSchema.pre("validate", function () {
  if (this.type === "trade") {
    if (!this.productId || !this.offeredProductId) {
      throw new Error("Trade room must have both productId and offeredProductId");
    }
  }
});

chatRoomSchema.index(
  { type: 1, productId: 1, participants: 1 },
  { unique: true }  
);

chatRoomSchema.index(
  { type: 1, productId: 1, offeredProductId: 1, participants: 1 },
  { unique: true }
);

module.exports = mongoose.model("ChatRoomTalk", chatRoomSchema);