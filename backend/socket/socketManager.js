// socket/socketManager.js — เพิ่ม mark_read event
const Message  = require("../models/Message");
const ChatRoom = require("../models/ChatRoomTalk");

const socketManager = (io) => {
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    socket.on("user_online", (userId) => {
      if (!userId) return;
      onlineUsers.set(String(userId), socket.id);
      socket.userId = String(userId);
      io.emit("user_status", { userId, status: "online" });
    });

    socket.on("join_room", (roomId) => {
      socket.join(String(roomId));
    });

    // ── ✅ mark-read เมื่อ user เปิดห้อง ──────────────────
    socket.on("mark_read", async ({ roomId, userId }) => {
      try {
        await ChatRoom.findByIdAndUpdate(roomId, { $pull: { unreadBy: userId } });
        // แจ้ง ChatFloating ให้อัปเดต badge
        socket.emit("unread_updated", { roomId, unreadCount: 0 });
      } catch (err) {
        console.error("mark_read:", err.message);
      }
    });

    // ── ส่งข้อความ ────────────────────────────────────────
    socket.on("send_message", async (data) => {
      const { roomId, sender, text } = data || {};
      if (!roomId || !sender || !text?.trim()) return;
      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) return socket.emit("chat_error", { message: "ไม่พบห้องแชท" });

        const participants = room.participants.map(p => String(p._id || p));
        if (!participants.includes(String(sender)))
          return socket.emit("chat_error", { message: "คุณไม่มีสิทธิ์ส่งข้อความ" });

        const saved = await Message.create({
          roomId, sender: String(sender),
          text: text.trim(), messageType: "text",
        });

        const others = participants.filter(p => p !== String(sender));

        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage:   text.trim(),
          lastMessageAt: new Date(),
          $addToSet:     { unreadBy: { $each: others } },
        });

        const populated = await saved.populate("sender", "username profileImage");

        // ✅ เติม avatarUrl ก่อนส่ง
        const obj = populated.toObject();
        if (obj.sender && !obj.sender.profileImage) {
          obj.sender.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(obj.sender.username || "U")}&background=475569&color=fff&size=80`;
        }

        io.to(String(roomId)).emit("receive_message", obj);

        // notification ให้ online users ที่ไม่ได้อยู่ในห้อง
        others.forEach(uid => {
          const sid = onlineUsers.get(uid);
          if (sid) {
            io.to(sid).emit("new_message_notification", {
              roomId,
              senderName: obj.sender?.username,
              text: text.trim(),
            });
          }
        });

      } catch (err) {
        console.error("🔥 send_message:", err);
        socket.emit("chat_error", { message: "เกิดข้อผิดพลาดในการส่ง" });
      }
    });

    socket.on("typing",      ({ roomId, userId, username }) =>
      socket.to(String(roomId)).emit("user_typing", { userId, username }));
    socket.on("stop_typing", ({ roomId, userId }) =>
      socket.to(String(roomId)).emit("user_stop_typing", { userId }));

    // trade status update
    socket.on("trade_status_update", ({ roomId, status, updatedBy }) => {
      socket.to(String(roomId)).emit("trade_updated", { status, updatedBy });
    });

    socket.on("leave_room", (roomId) => socket.leave(String(roomId)));

    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit("user_status", { userId: socket.userId, status: "offline" });
      }
    });
  });
};

module.exports = socketManager;