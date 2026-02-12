const Message = require("../models/Message"); // เพิ่มจุดเป็นสองจุด (..)
const ChatRoom = require("../models/ChatRoomTalk");


const socketManager = (io) => {
  io.on("connection", (socket) => {
    console.log(`🟢 User Connected: ${socket.id}`);

    // 1. เข้าห้องแชท (Join Room)
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`User joined room: ${roomId}`);
    });

    // 2. ส่งข้อความ (Send Message)
    socket.on("send_message", async (data) => {
      // data = { roomId, sender, text }
      try {
        const { roomId, sender, text } = data;

        // A. บันทึกข้อความลง DB
        const newMessage = await Message.create({
          roomId,
          sender,
          text
        });

        // B. อัปเดตข้อมูลห้องแชท (เพื่อให้หน้ารายการแชทรู้ว่ามีข้อความใหม่มา)
        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage: text,
          updatedAt: new Date() // ดันห้องนี้ขึ้นบนสุด
        });

        // C. เตรียมข้อมูลส่งกลับ (Populate ชื่อและรูปคนส่ง)
        const populatedMessage = await newMessage.populate("sender", "username profileImage");

        // D. ส่งให้ทุกคนในห้องนั้น (Real-time)
        io.in(roomId).emit("receive_message", populatedMessage);

      } catch (err) {
        console.error("❌ Chat Error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 User Disconnected");
    });
  });
};

module.exports = socketManager;