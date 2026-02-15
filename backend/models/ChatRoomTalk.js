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
      required: null 
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
    },
    isLocked: { type: Boolean, default: false },
    lockedProductSnapshot: { type: Object, default: null },
    lockedOfferedProductSnapshot: { type: Object, default: null },
    completedAt: { type: Date, default: null },
    // Metadata
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    unreadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

// ✅ เพิ่ม Validation ตรวจสอบจำนวนผู้เข้าร่วม (ป้องกัน participants.1 required)
chatRoomSchema.path('participants').validate(function (value) {
    return value.length === 2;
}, 'ต้องมีผู้เข้าร่วมแชท 2 คน (ผู้ซื้อและผู้ขาย)');

chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model("ChatRoomTalk", chatRoomSchema);