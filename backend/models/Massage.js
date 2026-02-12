// backend/models/Message.js
const messageSchema = new mongoose.Schema({
  roomId: { // เปลี่ยนจาก tradeId เป็น roomId เพื่อให้ตรงกับ logic
    type: mongoose.Schema.Types.ObjectId, 
    ref: "ChatRoom", 
    required: true 
  },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
}, { timestamps: true });