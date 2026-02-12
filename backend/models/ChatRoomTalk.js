const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema({
    type: { 
      type: String, 
      enum: ["trade", "normal"], 
      default: "normal" },
    participants: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true }],
    productId: { type: mongoose.Schema.Types.ObjectId,
      ref: "Product", 
      required: true },
    
    // Trade Fields
    offeredProductId: { type: mongoose.Schema.Types.ObjectId, 
      ref: "Product", 
      efault: null },
    tradeStatus: { 
        type: String, 
        enum: ["pending", "negotiating", "accepted", "rejected", "cancelled", "completed"], 
        default: "pending" 
    },
    isLocked: { type: Boolean, default: false },
    lockedProductSnapshot: { type: Object, default: null },
    lockedOfferedProductSnapshot: { type: Object, default: null },

    // Metadata
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    unreadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

// เพิ่ม Index เพื่อความเร็วในการ Query
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model("ChatRoomTalk", chatRoomSchema);