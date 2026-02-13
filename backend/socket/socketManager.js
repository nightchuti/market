const Message = require("../models/Message");
const ChatRoom = require("../models/ChatRoomTalk");

const socketManager = (io) => {
  const onlineUsers = new Map(); // เก็บ userId -> socketId

  io.on("connection", (socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    // เมื่อ User แจ้งสถานะออนไลน์
    socket.on("user_online", (userId) => {
      if (!userId) return;
      onlineUsers.set(String(userId), socket.id);
      socket.userId = String(userId);
      io.emit("user_status", { userId, status: "online" });
    });

    // การเข้าห้องแชท (สำคัญมาก: ถ้าไม่ Join จะไม่ได้รับข้อความ Real-time)
    socket.on("join_room", (roomId) => {
      socket.join(String(roomId));
      console.log(`📡 Socket ${socket.id} joined room: ${roomId}`);
    });

    // ✅ รับข้อความ บันทึก DB และส่งกระจาย
    socket.on("send_message", async (data) => {
      const { roomId, sender, text } = data || {};
      if (!roomId || !sender || !text?.trim()) return;

      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) return socket.emit("chat_error", { message: "ไม่พบห้องแชท" });

        // ตรวจสอบสิทธิ์คนส่ง (ต้องเป็นหนึ่งใน participants)
        const participants = room.participants.map(p => String(p._id || p));
        if (!participants.includes(String(sender))) {
          return socket.emit("chat_error", { message: "คุณไม่มีสิทธิ์ส่งข้อความในห้องนี้" });
        }

        // 1. บันทึกลง MongoDB
        const saved = await Message.create({
          roomId,
          sender: String(sender),
          text: text.trim(),
          messageType: "text"
        });

        // 2. อัปเดตข้อมูลล่าสุดของห้องแชท
        const others = participants.filter(p => p !== String(sender));
        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage: text.trim(),
          lastMessageAt: new Date(),
          $addToSet: { unreadBy: { $each: others } }
        });

        // 3. Populate ข้อมูลผู้ส่งและกระจายข้อความให้ทุกคนในห้อง (รวมถึงคนส่งด้วย)
        const populated = await saved.populate("sender", "username profileImage");
        io.to(String(roomId)).emit("receive_message", populated);

        // 4. ส่ง Notification สำหรับคนที่ไม่ได้อยู่ในหน้าแชทขณะนั้น
        others.forEach(uid => {
          const sid = onlineUsers.get(uid);
          if (sid) {
            io.to(sid).emit("new_message_notification", {
              roomId,
              senderName: populated.sender?.username,
              text: text.trim()
            });
          }
        });

      } catch (err) {
        console.error("🔥 send_message error:", err);
        socket.emit("chat_error", { message: "เกิดข้อผิดพลาดในการส่ง" });
      }
    });

    socket.on("typing", ({ roomId, userId, username }) => {
      socket.to(String(roomId)).emit("user_typing", { userId, username });
    });

    socket.on("stop_typing", ({ roomId, userId }) => {
      socket.to(String(roomId)).emit("user_stop_typing", { userId });
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit("user_status", { userId: socket.userId, status: "offline" });
      }
    });
  });
};

module.exports = socketManager;