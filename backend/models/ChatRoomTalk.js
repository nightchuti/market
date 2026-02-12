const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema({
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }], // เก็บ ID ของคู่สนทนาทั้ง 2 คน
  
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product" 
  }, // (Optional) สินค้าที่กำลังคุยกัน
  
  tradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trade"
  }, // (Optional) ถ้าคุยเรื่อง Trade ให้ใส่ ID Trade ด้วย

  lastMessage: { type: String }, // เอาไว้โชว์ตัวอย่างข้อความล่าสุดในหน้ารายการ
  unreadCount: { type: Number, default: 0 } // (Optional)
}, { timestamps: true }); // timestamps จะช่วยเรียงลำดับห้องที่คุยล่าสุดให้

module.exports = mongoose.model("ChatRoom", chatRoomSchema);