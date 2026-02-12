const Message = require("../models/Message");
const ChatRoom = require("../models/ChatRoomTalk");

const socketManager = (io) => {

  // เก็บ map userId -> socketId (สำหรับ online status)
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    // ===== USER ONLINE =====
    socket.on("user_online", (userId) => {
      onlineUsers.set(String(userId), socket.id);
      socket.userId = userId;
      // แจ้งทุกคนว่า user นี้ online
      io.emit("user_status", { userId, status: "online" });
    });

    // ===== JOIN ROOM =====
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.userId} joined room: ${roomId}`);
    });

    // ===== LEAVE ROOM =====
    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
    });

    // ===== SEND MESSAGE =====
    socket.on("send_message", async (data) => {
      // data = { roomId, sender, text }
      try {
        const { roomId, sender, text } = data;

        // ✅ ตรวจสอบว่าห้องยังเปิดอยู่และ sender มีสิทธิ์
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) return socket.emit("error", { message: "ไม่พบห้องแชท" });

        const isParticipant = chatRoom.participants.map(String).includes(String(sender));
        if (!isParticipant) return socket.emit("error", { message: "คุณไม่มีสิทธิ์ในห้องนี้" });

        // ถ้าเป็นห้องเทรดที่ถูก reject/cancelled/completed ห้ามส่งข้อความ
        if (chatRoom.type === "trade" &&
          ["rejected", "cancelled", "completed"].includes(chatRoom.tradeStatus)) {
          return socket.emit("error", { message: "ห้องนี้ปิดแล้ว ไม่สามารถส่งข้อความได้" });
        }

        // บันทึกข้อความ
        const newMessage = await Message.create({ roomId, sender, text });

        // อัปเดตข้อมูลห้อง
        const otherParticipants = chatRoom.participants.filter(p => String(p) !== String(sender));
        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage: text,
          lastMessageAt: new Date(),
          $addToSet: { unreadBy: { $each: otherParticipants } } // mark unread สำหรับอีกฝ่าย
        });

        const populatedMessage = await newMessage.populate("sender", "username profileImage");

        // ส่งให้ทุกคนในห้อง
        io.in(roomId).emit("receive_message", populatedMessage);

        // แจ้ง notification ให้อีกฝ่ายที่ไม่ได้อยู่ในห้อง
        otherParticipants.forEach(participantId => {
          const participantSocketId = onlineUsers.get(String(participantId));
          if (participantSocketId) {
            io.to(participantSocketId).emit("new_message_notification", {
              roomId,
              senderName: populatedMessage.sender.username,
              text
            });
          }
        });

      } catch (err) {
        console.error("❌ Chat Error:", err);
        socket.emit("error", { message: "เกิดข้อผิดพลาด" });
      }
    });

    // ===== TYPING INDICATOR =====
    socket.on("typing", ({ roomId, userId, username }) => {
      socket.to(roomId).emit("user_typing", { userId, username });
    });

    socket.on("stop_typing", ({ roomId, userId }) => {
      socket.to(roomId).emit("user_stop_typing", { userId });
    });

    // ===== TRADE EVENTS (Real-time) =====
    // เมื่อมีการยืนยัน/ปฏิเสธ/ยกเลิกเทรด จาก REST API ให้ emit event นี้
    socket.on("trade_status_update", ({ roomId, status, updatedBy }) => {
      io.in(roomId).emit("trade_updated", { roomId, status, updatedBy });
    });

    // ===== DISCONNECT =====
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(String(socket.userId));
        io.emit("user_status", { userId: socket.userId, status: "offline" });
      }
      console.log(`🔴 Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketManager;