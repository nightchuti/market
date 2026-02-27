// backend/controllers/chatController.js
const ChatRoom = require("../models/ChatRoomTalk");
const Message = require("../models/Message");
const Product = require("../models/Product");

// ── helper ────────────────────────────────────────────────
const createProductSnapshot = (product) => ({
  title: product.title, price: product.price,
  images: product.images, description: product.description,
  lockedAt: new Date(),
});

const API_URL = process.env.REACT_APP_API_URL || "https://testt-zu9t.onrender.com";

const toAvatarUrl = (user) => {
  if (!user)
    return "https://ui-avatars.com/api/?name=U&background=475569&color=fff&size=80";

  if (user.profileImage) {
    return user.profileImage.startsWith("http")
      ? user.profileImage
      : `${API_URL}${user.profileImage}`;
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user.username || "U"
  )}&background=475569&color=fff&size=80`;
};

// ── 1. เริ่มแชทปกติ ───────────────────────────────────────
exports.initiateNormalChat = async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;
  try {
    if (!productId) return res.status(400).json({ error: "กรุณาส่ง productId" });

    const product = await Product.findById(productId).populate("user", "_id username");
    if (!product) return res.status(404).json({ error: "ไม่พบสินค้า" });

    const receiverId = String(product.user?._id || product.user);
    if (!receiverId || receiverId === "undefined")
      return res.status(400).json({ error: "ไม่พบเจ้าของสินค้า" });
    if (String(userId) === receiverId)
      return res.status(400).json({ error: "ไม่สามารถแชทกับตัวเองได้" });

    let chatRoom = await ChatRoom.findOne({
      type: "normal",
      participants: { $all: [userId, receiverId] },
      productId,
    });

    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        type: "normal", participants: [userId, receiverId], productId,
      });
    }

    await ChatRoom.findByIdAndUpdate(chatRoom._id, { $pull: { unreadBy: userId } });

    await chatRoom.populate([
      { path: "participants", select: "username profileImage" },
      { path: "productId", select: "title images price" },
    ]);

    res.json(chatRoom);
  } catch (err) {
    console.error("initiateNormalChat:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── 2. เริ่มแชทเทรด ───────────────────────────────────────
exports.initiateTradeChat = async (req, res) => {
  const { receiverId, productId, offeredProductId } = req.body;
  const userId = req.user.id;
  try {
    if (String(userId) === String(receiverId))
      return res.status(400).json({ error: "ไม่สามารถเทรดกับตัวเองได้" });

    const [product, offeredProduct] = await Promise.all([
      Product.findById(productId),
      Product.findById(offeredProductId),
    ]);
    if (!product) return res.status(404).json({ error: "ไม่พบสินค้าที่ต้องการ" });
    if (!offeredProduct) return res.status(404).json({ error: "ไม่พบสินค้าที่เสนอเทรด" });

    // ✅ ตรวจสถานะสินค้าทั้งคู่
    if (product.status !== "available")
      return res.status(400).json({ error: "สินค้าที่ต้องการไม่พร้อมสำหรับการเทรด" });
    if (offeredProduct.status !== "available")
      return res.status(400).json({ error: "สินค้าที่เสนอเทรดไม่พร้อม" });

    const offeredOwner = String(offeredProduct.user || offeredProduct.owner);
    if (offeredOwner !== String(userId))
      return res.status(403).json({ error: "คุณไม่ใช่เจ้าของสินค้าที่เสนอเทรด" });

    const existingRoom = await ChatRoom.findOne({
      type: "trade",
      participants: { $all: [userId, receiverId] },
      productId, offeredProductId,
      tradeStatus: { $in: ["pending", "negotiating", "accepted"] },
    });
    if (existingRoom)
      return res.status(400).json({ error: "มีคำขอเทรดอยู่แล้ว", roomId: existingRoom._id });

    const chatRoom = await ChatRoom.create({
      type: "trade",
      participants: [userId, receiverId],
      productId, offeredProductId,
      tradeStatus: "pending",
      isLocked: true,
      lockedProductSnapshot: createProductSnapshot(product),
      lockedOfferedProductSnapshot: createProductSnapshot(offeredProduct),
      lastMessage: `ขอเทรด: ${offeredProduct.title} ↔ ${product.title}`,
    });

    await Message.create({
      roomId: chatRoom._id, sender: userId,
      messageType: "trade_request",
      text: `🔄 ขอเทรด "${offeredProduct.title}" กับ "${product.title}"`,
      metadata: {
        offeredProduct: createProductSnapshot(offeredProduct),
        targetProduct: createProductSnapshot(product),
      },
    });

    await chatRoom.populate([
      { path: "participants", select: "username profileImage" },
      { path: "productId", select: "title images price" },
      { path: "offeredProductId", select: "title images price" },
    ]);

    res.status(201).json(chatRoom);
  } catch (err) {
    console.error("initiateTradeChat:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── 3. Accept Trade ────────────────────────────────────────
exports.acceptTrade = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  try {
    const chatRoom = await ChatRoom.findById(roomId).populate("productId", "user");
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });
    if (chatRoom.type !== "trade") return res.status(400).json({ error: "ห้องนี้ไม่ใช่ห้องเทรด" });

    // ✅ ตรวจ owner จาก productId.user ตรงๆ (ไม่ใช่ participants[1])
    const ownerId = String(chatRoom.productId?.user || "");
    if (ownerId !== String(userId))
      return res.status(403).json({ error: "เฉพาะเจ้าของสินค้าเท่านั้นที่ยืนยันได้" });

    if (!["pending", "negotiating"].includes(chatRoom.tradeStatus))
      return res.status(400).json({ error: "ไม่สามารถยืนยันในสถานะนี้" });

    // ✅ ตรวจสินค้าว่ายังว่างอยู่ไหม (ป้องกัน race condition)
    const [product, offeredProduct] = await Promise.all([
      Product.findById(chatRoom.productId),
      Product.findById(chatRoom.offeredProductId),
    ]);
    if (product?.status !== "available" && product?.status !== "pending")
      return res.status(400).json({ error: "สินค้าไม่พร้อมสำหรับการเทรดแล้ว" });

    chatRoom.tradeStatus = "accepted";
    chatRoom.isLocked = true;
    await chatRoom.save();

    // 🔒 Lock สินค้าทั้งคู่
    await Promise.all([
      Product.findByIdAndUpdate(chatRoom.productId, { status: "pending" }),
      Product.findByIdAndUpdate(chatRoom.offeredProductId, { status: "pending" }),
    ]);

    const systemMsg = await Message.create({
      roomId, sender: userId, messageType: "trade_accept",
      text: "✅ ยืนยันการเทรดแล้ว! ตกลงรายละเอียดการส่งสินค้าได้เลย",
    });

    res.json({ chatRoom, systemMsg });
  } catch (err) {
    console.error("acceptTrade:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── 4. Reject Trade ────────────────────────────────────────
exports.rejectTrade = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  try {
    const chatRoom = await ChatRoom.findById(roomId).populate("productId", "user");
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    // ✅ เช็ค owner จาก productId.user
    const ownerId = String(chatRoom.productId?.user || "");
    if (ownerId !== String(userId))
      return res.status(403).json({ error: "เฉพาะเจ้าของสินค้าเท่านั้นที่ปฏิเสธได้" });

    chatRoom.tradeStatus = "rejected";
    chatRoom.isLocked = false;
    await chatRoom.save();

    // 🔓 Unlock สินค้าทั้งคู่
    await Promise.all([
      Product.findByIdAndUpdate(chatRoom.productId, { status: "available" }),
      Product.findByIdAndUpdate(chatRoom.offeredProductId, { status: "available" }),
    ]);

    await Message.create({ roomId, sender: userId, messageType: "trade_reject", text: "❌ ปฏิเสธการเทรดแล้ว" });
    res.json({ message: "ปฏิเสธการเทรดสำเร็จ" });
  } catch (err) {
    console.error("rejectTrade:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── 5. Cancel Trade ────────────────────────────────────────
exports.cancelTrade = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  try {
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    if (!chatRoom.participants.map(String).includes(String(userId)))
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์ในห้องนี้" });
    if (chatRoom.tradeStatus === "completed")
      return res.status(400).json({ error: "ไม่สามารถยกเลิกการเทรดที่เสร็จสิ้นแล้ว" });

    chatRoom.tradeStatus = "cancelled";
    chatRoom.isLocked = false;
    await chatRoom.save();

    // 🔓 Unlock สินค้า
    await Promise.all([
      Product.findByIdAndUpdate(chatRoom.productId, { status: "available" }),
      Product.findByIdAndUpdate(chatRoom.offeredProductId, { status: "available" }),
    ]);

    await Message.create({ roomId, sender: userId, messageType: "trade_cancel", text: "🚫 ยกเลิกการเทรดแล้ว" });
    res.json({ message: "ยกเลิกการเทรดสำเร็จ" });
  } catch (err) {
    console.error("cancelTrade:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── 6. ✅ Confirm Swap (ใหม่) ───────────────────────────────
// เรียกเมื่อทั้งสองฝ่ายได้รับสินค้าแล้ว
// ── 6. ✅ Confirm Swap ─────────────────────────────────────
exports.confirmSwap = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  try {
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    if (!chatRoom.participants.map(String).includes(String(userId)))
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์ในห้องนี้" });
    if (chatRoom.tradeStatus !== "accepted")
      return res.status(400).json({ error: "ยืนยันได้เฉพาะตอน accepted เท่านั้น" });

    // กัน confirm ซ้ำ
    const alreadyConfirmed = chatRoom.confirmedBy?.map(String).includes(String(userId));
    if (alreadyConfirmed)
      return res.status(400).json({ error: "คุณยืนยันแล้ว" });

    chatRoom.confirmedBy = [...(chatRoom.confirmedBy || []), userId];

    const bothConfirmed = chatRoom.confirmedBy.length >= 2;

    if (bothConfirmed) {
      chatRoom.tradeStatus = "completed";
      chatRoom.isLocked = false;
      chatRoom.completedAt = new Date();
    }

    await chatRoom.save();

    if (bothConfirmed) {
      await Promise.all([
        Product.findByIdAndUpdate(chatRoom.productId, { status: "exchanged" }),
        Product.findByIdAndUpdate(chatRoom.offeredProductId, { status: "exchanged" }),
      ]);

      await Message.create({
        roomId, sender: userId, messageType: "trade_confirm",
        text: "🎉 เทรดสำเร็จ! ขอบคุณที่ใช้บริการ",
      });
    }

    res.json({
      completed: bothConfirmed,
      confirmedCount: chatRoom.confirmedBy.length,
      message: bothConfirmed ? "เทรดสำเร็จ" : "รอการยืนยันจากอีกฝ่าย"
    });
  } catch (err) {
    console.error("confirmSwap:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── 7. Get Messages ────────────────────────────────────────
exports.getMessages = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  try {
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    if (!chatRoom.participants.map(String).includes(String(userId)))
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์ดูห้องนี้" });

    const messages = await Message.find({ roomId })
      .populate("sender", "username profileImage")
      .sort({ createdAt: 1 });

    await ChatRoom.findByIdAndUpdate(roomId, { $pull: { unreadBy: userId } });

    const result = messages.map(m => {
      const obj = m.toObject();
      if (obj.sender) obj.sender.avatarUrl = toAvatarUrl(obj.sender);
      return obj;
    });

    res.json(result);
  } catch (err) {
    console.error("getMessages:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── 8. Send Message (REST fallback) ───────────────────────
exports.sendMessage = async (req, res) => {
  const { roomId } = req.params;
  const { text } = req.body;
  const userId = req.user.id;
  try {
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    if (!chatRoom.participants.map(String).includes(String(userId)))
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์ในห้องนี้" });

    const saved = await Message.create({
      roomId, sender: userId,
      text: String(text || "").trim(), messageType: "text",
    });

    const others = chatRoom.participants.map(String).filter(p => p !== String(userId));
    await ChatRoom.findByIdAndUpdate(roomId, {
      lastMessage: String(text).trim(),
      lastMessageAt: new Date(),
      $addToSet: { unreadBy: { $each: others } },
    });

    await saved.populate("sender", "username profileImage");
    const obj = saved.toObject();
    if (obj.sender) obj.sender.avatarUrl = toAvatarUrl(obj.sender);
    res.status(201).json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── 9. Get My Chats ────────────────────────────────────────
exports.getMyChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await ChatRoom.find({ participants: userId })
      .populate("participants", "username profileImage")
      .populate("productId", "title images price")
      .populate("offeredProductId", "title images price")
      .sort({ lastMessageAt: -1 });

    const result = chats.map(r => {
      const obj = r.toObject();
      obj.unreadCount = (r.unreadBy || [])
        .filter(id => String(id) === String(userId)).length;
      obj.participants = obj.participants.map(p => ({
        ...p, avatarUrl: toAvatarUrl(p),
      }));
      return obj;
    });

    res.json(result);
  } catch (err) {
    console.error("getMyChats:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── 10. Get Room Detail ─────────────────────────────────────
exports.getRoomDetail = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  try {
    const chatRoom = await ChatRoom.findByIdAndUpdate(
      roomId, { $pull: { unreadBy: userId } }, { new: true }
    )
      .populate("participants", "username profileImage")
      .populate("productId", "title images price description status user")
      .populate("offeredProductId", "title images price description status user");

    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    if (!chatRoom.participants.map(p => String(p._id)).includes(String(userId)))
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าห้องนี้" });

    const obj = chatRoom.toObject();
    obj.participants = obj.participants.map(p => ({
      ...p, avatarUrl: toAvatarUrl(p),
    }));

    res.json(obj);
  } catch (err) {
    console.error("getRoomDetail:", err);
    res.status(500).json({ error: err.message });
  }

};