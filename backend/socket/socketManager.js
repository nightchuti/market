const Message = require("../models/Message");
const ChatRoom = require("../models/ChatRoomTalk");

const socketManager = (io) => {
  const onlineUsers = new Map(); // userId -> socketId

  io.on("connection", (socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    socket.on("user_online", (userId) => {
      if (!userId) return;
      onlineUsers.set(String(userId), socket.id);
      socket.userId = String(userId);
      io.emit("user_status", { userId, status: "online" });
    });

    socket.on("join_room", (roomId) => { socket.join(roomId); });
    socket.on("leave_room", (roomId) => { socket.leave(roomId); });

    // ✅ send_message: บันทึก DB + ส่ง real-time
    socket.on("send_message", async (data) => {
      const { roomId, sender, text } = data || {};
      if (!roomId || !sender || !String(text || "").trim()) return;

      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) return socket.emit("chat_error", { message: "ไม่พบห้องแชท" });

        const participants = room.participants.map(String);
        if (!participants.includes(String(sender)))
          return socket.emit("chat_error", { message: "คุณไม่มีสิทธิ์ในห้องนี้" });

        if (room.type === "trade" && ["rejected","cancelled","completed"].includes(room.tradeStatus))
          return socket.emit("chat_error", { message: "ห้องนี้ปิดแล้ว" });

        if (room.type === "normal" && room.inquiryStatus === "closed")
          return socket.emit("chat_error", { message: "ห้องนี้ปิดแล้ว" });

        // บันทึกลง MongoDB
        const saved = await Message.create({ roomId, sender, text: text.trim(), messageType: "text" });

        // อัปเดต ChatRoom
        const others = participants.filter((p) => p !== String(sender));
        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage: text.trim(),
          lastMessageAt: new Date(),
          $addToSet: { unreadBy: { $each: others } },
        });

        // Populate แล้ว broadcast
        const populated = await saved.populate("sender", "username profileImage");
        io.in(roomId).emit("receive_message", populated);

        // Push notification
        others.forEach((uid) => {
          const sid = onlineUsers.get(uid);
          if (sid) io.to(sid).emit("new_message_notification", {
            roomId, senderName: populated.sender?.username, text: text.trim(),
          });
        });
      } catch (err) {
        console.error("send_message error:", err);
        socket.emit("chat_error", { message: "เกิดข้อผิดพลาด" });
      }
    });

    socket.on("typing", ({ roomId, userId, username }) => {
      socket.to(roomId).emit("user_typing", { userId, username });
    });
    socket.on("stop_typing", ({ roomId, userId }) => {
      socket.to(roomId).emit("user_stop_typing", { userId });
    });

    socket.on("trade_status_update", ({ roomId, status, updatedBy }) => {
      io.in(roomId).emit("trade_updated", { roomId, status, updatedBy });
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