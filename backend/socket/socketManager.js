// socket/socketManager.js
const Message   = require("../models/Message");
const ChatRoom  = require("../models/ChatRoomTalk");
const Product   = require("../models/Product");

const socketManager = (io) => {
  const onlineUsers = new Map(); // userId → socketId

  io.on("connection", (socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    // ── Online ─────────────────────────────────────────────
    socket.on("user_online", (userId) => {
      if (!userId) return;
      onlineUsers.set(String(userId), socket.id);
      socket.userId = String(userId);
      io.emit("user_status", { userId, status: "online" });
    });

    socket.on("join_room", (roomId) => {
      socket.join(String(roomId));
    });

    // ── Mark Read ──────────────────────────────────────────
    socket.on("mark_read", async ({ roomId, userId }) => {
      try {
        await ChatRoom.findByIdAndUpdate(roomId, { $pull: { unreadBy: userId } });
        socket.emit("unread_updated", { roomId, unreadCount: 0 });
      } catch (err) {
        console.error("mark_read:", err.message);
      }
    });

    // ── ส่งข้อความปกติ ─────────────────────────────────────
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
        const obj = populated.toObject();
        if (obj.sender && !obj.sender.profileImage) {
          obj.sender.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(obj.sender.username || "U")}&background=475569&color=fff&size=80`;
        }

        io.to(String(roomId)).emit("receive_message", obj);

        // Notification ให้ online users ที่ไม่ได้อยู่ในห้อง
        others.forEach(uid => {
          const sid = onlineUsers.get(uid);
          if (sid) {
            io.to(sid).emit("new_message_notification", {
              roomId, senderName: obj.sender?.username, text: text.trim(),
            });
          }
        });

      } catch (err) {
        console.error("🔥 send_message:", err);
        socket.emit("chat_error", { message: "เกิดข้อผิดพลาดในการส่ง" });
      }
    });

    // ── ✅ ส่ง Trade Message ───────────────────────────────
    // messageType: trade_request | trade_accept | trade_reject | trade_cancel | trade_confirm
    socket.on("send_trade_message", async (data) => {
      const { roomId, sender, messageType, metadata } = data || {};
      if (!roomId || !sender || !messageType) return;

      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) return;

        const participants = room.participants.map(p => String(p._id || p));
        if (!participants.includes(String(sender))) return;

        // ── ✅ Lock/Unlock สินค้าตาม messageType ──────────
        if (messageType === "trade_accept" && room.productId && room.offeredProductId) {
          // Lock สินค้าทั้งสองชิ้นออกจาก listing
          await Promise.all([
            Product.findByIdAndUpdate(room.productId,        { status: "pending" }),
            Product.findByIdAndUpdate(room.offeredProductId, { status: "pending" }),
          ]);
          await ChatRoom.findByIdAndUpdate(roomId, { tradeStatus: "accepted", isLocked: true });

        } else if (["trade_reject", "trade_cancel"].includes(messageType)) {
          // Unlock สินค้าทั้งสองชิ้นกลับสู่ available
          await Promise.all([
            Product.findByIdAndUpdate(room.productId,        { status: "available" }),
            Product.findByIdAndUpdate(room.offeredProductId, { status: "available" }),
          ]);
          const newStatus = messageType === "trade_reject" ? "rejected" : "cancelled";
          await ChatRoom.findByIdAndUpdate(roomId, { tradeStatus: newStatus, isLocked: false });

        } else if (messageType === "trade_confirm") {
          // ทำเทรดสำเร็จ — mark traded
          await Promise.all([
            Product.findByIdAndUpdate(room.productId,        { status: "sold" }),
            Product.findByIdAndUpdate(room.offeredProductId, { status: "sold" }),
          ]);
          await ChatRoom.findByIdAndUpdate(roomId, { tradeStatus: "completed" });
        }

        // บันทึก message
        const saved = await Message.create({
          roomId, sender,
          messageType,
          metadata,
          text: tradeMessageText(messageType),
        });

        const others = participants.filter(p => p !== String(sender));
        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage:   tradeMessageText(messageType),
          lastMessageAt: new Date(),
          $addToSet:     { unreadBy: { $each: others } },
        });

        const populated = await saved.populate("sender", "username profileImage");

        // ✅ ส่งทั้งห้อง
        io.to(String(roomId)).emit("receive_trade_message", populated);

        // Notification ให้ฝ่ายตรงข้าม
        others.forEach(uid => {
          const sid = onlineUsers.get(uid);
          if (sid) {
            io.to(sid).emit("new_message_notification", {
              roomId,
              senderName: populated.sender?.username,
              text: tradeMessageText(messageType),
            });
          }
        });

      } catch (err) {
        console.error("send_trade_message:", err);
        socket.emit("chat_error", { message: "เกิดข้อผิดพลาดในการส่ง trade message" });
      }
    });

    // ── Typing ─────────────────────────────────────────────
    socket.on("typing",      ({ roomId, userId, username }) =>
      socket.to(String(roomId)).emit("user_typing",      { userId, username }));
    socket.on("stop_typing", ({ roomId, userId }) =>
      socket.to(String(roomId)).emit("user_stop_typing", { userId }));

    // ── Trade Status Update (REST → socket notify) ─────────
    socket.on("trade_status_update", ({ roomId, status, updatedBy }) => {
      socket.to(String(roomId)).emit("trade_updated", { status, updatedBy });
    });

    // ── Leave / Disconnect ─────────────────────────────────
    socket.on("leave_room", (roomId) => socket.leave(String(roomId)));

    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit("user_status", { userId: socket.userId, status: "offline" });
      }
    });
  });
};

// ── Helper: Text สำหรับ lastMessage ────────────────────────
function tradeMessageText(messageType) {
  const map = {
    trade_request: "🔄 ขอเทรดสินค้า",
    trade_accept:  "✅ ยืนยันรับเทรดแล้ว",
    trade_reject:  "❌ ปฏิเสธการเทรดแล้ว",
    trade_cancel:  "🚫 ยกเลิกการเทรดแล้ว",
    trade_confirm: "🎉 เทรดสำเร็จ!",
  };
  return map[messageType] || messageType;
}

module.exports = socketManager;