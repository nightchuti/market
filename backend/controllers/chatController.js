const ChatRoom = require("../models/ChatRoomTalk");
const Message = require("../models/Message");
const Product = require("../models/Product");

// =========================================================
// HELPER: สร้าง Snapshot สินค้า ณ ตอนนั้น (เพื่อความปลอดภัย)
// =========================================================
const createProductSnapshot = (product) => ({
  title: product.title,
  price: product.price,
  images: product.images,
  description: product.description,
  lockedAt: new Date()
});

// =========================================================
// 1. เริ่มต้นแชทปกติ (Normal Chat - สอบถามสินค้า)
// =========================================================
exports.initiateNormalChat = async (req, res) => {
  const { receiverId, productId } = req.body;
  const userId = req.user.id;

  try {
    // ห้ามแชทกับตัวเอง
    if (userId === receiverId) {
      return res.status(400).json({ error: "ไม่สามารถแชทกับตัวเองได้" });
    }

    // เช็คว่าสินค้ามีอยู่จริง
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "ไม่พบสินค้า" });

    // เช็คว่ามีห้องแชทปกติเรื่องสินค้านี้อยู่แล้วไหม
    let chatRoom = await ChatRoom.findOne({
      type: "normal",
      participants: { $all: [userId, receiverId] },
      productId
    });

    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        type: "normal",
        participants: [userId, receiverId],
        productId
      });
    }

    await chatRoom.populate([
      { path: "participants", select: "username profileImage" },
      { path: "productId", select: "title images price" }
    ]);

    res.json(chatRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================================================
// 2. เริ่มต้นแชทเทรด (Trade Chat - ล็อคสินค้าทันที)
// =========================================================
exports.initiateTradeChat = async (req, res) => {
  const { receiverId, productId, offeredProductId } = req.body;
  const userId = req.user.id;

  try {
    if (userId === receiverId) {
      return res.status(400).json({ error: "ไม่สามารถเทรดกับตัวเองได้" });
    }

    // ดึงข้อมูลสินค้าทั้งสอง
    const [product, offeredProduct] = await Promise.all([
      Product.findById(productId),
      Product.findById(offeredProductId)
    ]);

    if (!product) return res.status(404).json({ error: "ไม่พบสินค้าที่ต้องการ" });
    if (!offeredProduct) return res.status(404).json({ error: "ไม่พบสินค้าที่เสนอเทรด" });

    // ตรวจสอบว่าเจ้าของสินค้าที่เสนอคือคนขอเทรด
    if (String(offeredProduct.owner) !== String(userId)) {
      return res.status(403).json({ error: "คุณไม่ใช่เจ้าของสินค้าที่เสนอเทรด" });
    }

    // ตรวจสอบว่าเจ้าของสินค้าเป้าหมายคือ receiverId
    if (String(product.owner) !== String(receiverId)) {
      return res.status(403).json({ error: "ข้อมูลเจ้าของสินค้าไม่ถูกต้อง" });
    }

    // เช็คว่ามีคำขอเทรดที่ยังไม่เสร็จสิ้นอยู่แล้วไหม
    const existingRoom = await ChatRoom.findOne({
      type: "trade",
      participants: { $all: [userId, receiverId] },
      productId,
      offeredProductId,
      tradeStatus: { $in: ["pending", "negotiating"] }
    });

    if (existingRoom) {
      return res.status(400).json({
        error: "มีคำขอเทรดที่ยังไม่เสร็จสิ้นอยู่แล้ว",
        roomId: existingRoom._id
      });
    }

    // ✅ สร้างห้องแชทเทรด พร้อม LOCK และ SNAPSHOT ทันที
    const chatRoom = await ChatRoom.create({
      type: "trade",
      participants: [userId, receiverId],
      productId,
      offeredProductId,
      tradeStatus: "pending",
      isLocked: true, // 🔒 ล็อคทันที
      lockedProductSnapshot: createProductSnapshot(product),
      lockedOfferedProductSnapshot: createProductSnapshot(offeredProduct),
      lastMessage: `ขอเทรด: ${offeredProduct.title} ↔ ${product.title}`
    });

    // ส่ง system message แจ้งว่าเริ่มเทรดแล้ว
    await Message.create({
      roomId: chatRoom._id,
      sender: userId,
      messageType: "trade_request",
      text: `🔄 ขอเทรด "${offeredProduct.title}" กับ "${product.title}"`,
      metadata: {
        offeredProduct: createProductSnapshot(offeredProduct),
        targetProduct: createProductSnapshot(product)
      }
    });

    await chatRoom.populate([
      { path: "participants", select: "username profileImage" },
      { path: "productId", select: "title images price" },
      { path: "offeredProductId", select: "title images price" }
    ]);

    res.status(201).json(chatRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================================================
// 3. ตอบรับการเทรด (Accept Trade)
// =========================================================
exports.acceptTrade = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });
    if (chatRoom.type !== "trade") return res.status(400).json({ error: "ห้องนี้ไม่ใช่ห้องเทรด" });

    // เฉพาะเจ้าของสินค้าเป้าหมายเท่านั้นที่กด Accept ได้
    const product = await Product.findById(chatRoom.productId);
    if (String(product.owner) !== String(userId)) {
      return res.status(403).json({ error: "เฉพาะเจ้าของสินค้าเท่านั้นที่ยืนยันได้" });
    }

    if (!["pending", "negotiating"].includes(chatRoom.tradeStatus)) {
      return res.status(400).json({ error: "ไม่สามารถยืนยันในสถานะนี้ได้" });
    }

    chatRoom.tradeStatus = "accepted";
    await chatRoom.save();

    // ✅ อัปเดตสถานะสินค้าทั้งสองเป็น "traded" 
    await Product.findByIdAndUpdate(chatRoom.productId, { status: "traded" });
    await Product.findByIdAndUpdate(chatRoom.offeredProductId, { status: "traded" });

    const systemMsg = await Message.create({
      roomId,
      sender: userId,
      messageType: "trade_accept",
      text: "✅ ยืนยันการเทรดแล้ว! กรุณาติดต่อเพื่อนัดรับสินค้า"
    });

    res.json({ chatRoom, systemMsg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================================================
// 4. ปฏิเสธการเทรด (Reject Trade)
// =========================================================
exports.rejectTrade = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    const product = await Product.findById(chatRoom.productId);
    if (String(product.owner) !== String(userId)) {
      return res.status(403).json({ error: "เฉพาะเจ้าของสินค้าเท่านั้นที่ปฏิเสธได้" });
    }

    chatRoom.tradeStatus = "rejected";
    chatRoom.isLocked = false; // 🔓 ปลดล็อค
    await chatRoom.save();

    // คืนสถานะสินค้าเป็น available
    await Product.findByIdAndUpdate(chatRoom.productId, { status: "available" });
    await Product.findByIdAndUpdate(chatRoom.offeredProductId, { status: "available" });

    await Message.create({
      roomId,
      sender: userId,
      messageType: "trade_reject",
      text: "❌ ปฏิเสธการเทรดแล้ว"
    });

    res.json({ message: "ปฏิเสธการเทรดสำเร็จ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================================================
// 5. ยกเลิกการเทรด (Cancel Trade - ทำได้ทั้งสองฝ่าย)
// =========================================================
exports.cancelTrade = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    // ตรวจสอบว่าเป็นผู้เข้าร่วมห้องนี้
    if (!chatRoom.participants.map(String).includes(String(userId))) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์ในห้องนี้" });
    }

    if (chatRoom.tradeStatus === "completed") {
      return res.status(400).json({ error: "ไม่สามารถยกเลิกการเทรดที่เสร็จสิ้นแล้ว" });
    }

    chatRoom.tradeStatus = "cancelled";
    chatRoom.isLocked = false; // 🔓 ปลดล็อค
    await chatRoom.save();

    // คืนสถานะสินค้า
    await Product.findByIdAndUpdate(chatRoom.productId, { status: "available" });
    await Product.findByIdAndUpdate(chatRoom.offeredProductId, { status: "available" });

    await Message.create({
      roomId,
      sender: userId,
      messageType: "trade_cancel",
      text: "🚫 ยกเลิกการเทรดแล้ว"
    });

    res.json({ message: "ยกเลิกการเทรดสำเร็จ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================================================
// 6. ดึงข้อความในห้อง (Get Messages)
// =========================================================
exports.getMessages = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    // ตรวจสอบสิทธิ์ก่อนดึงข้อความ
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    if (!chatRoom.participants.map(String).includes(String(userId))) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์ดูห้องนี้" });
    }

    const messages = await Message.find({ roomId })
      .populate("sender", "username profileImage")
      .sort({ createdAt: 1 });

    // Mark as read — เอา userId ออกจาก unreadBy
    await ChatRoom.findByIdAndUpdate(roomId, {
      $pull: { unreadBy: userId }
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================================================
// 7. ดึงรายการห้องแชทของฉัน (My Chat List)
// =========================================================
exports.getMyChats = async (req, res) => {
  try {
    const chats = await ChatRoom.find({ participants: req.user.id })
      .populate("participants", "username profileImage")
      .populate("productId", "title images price")
      .populate("offeredProductId", "title images price")
      .sort({ lastMessageAt: -1 });

    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================================================
// 8. ดึงรายละเอียดห้องแชท (Get Room Detail)
// =========================================================
exports.getRoomDetail = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const chatRoom = await ChatRoom.findById(roomId)
      .populate("participants", "username profileImage")
      .populate("productId", "title images price description status")
      .populate("offeredProductId", "title images price description status");

    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    if (!chatRoom.participants.map(p => String(p._id)).includes(String(userId))) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าห้องนี้" });
    }

    res.json(chatRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};