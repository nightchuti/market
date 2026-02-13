const ChatRoom = require("../models/ChatRoomTalk");
const Message  = require("../models/Message");
const Product  = require("../models/Product");

const createProductSnapshot = (product) => ({
  title: product.title,
  price: product.price,
  images: product.images,
  description: product.description,
  lockedAt: new Date()
});

// =========================================================
// 1. เริ่มต้นแชทปกติ
// ✅ แก้: ดึง receiverId จาก product.user อัตโนมัติ
//         frontend ส่งแค่ productId พอ
// =========================================================
// controllers/chatController.js
exports.initiateNormalChat = async (req, res) => {
  try {
    const { productId } = req.body;
    const senderId = req.user.id; 

    if (!productId) return res.status(400).json({ error: "ระบุ productId" });

    // 1. ดึงข้อมูลสินค้าพร้อมเจ้าของ
    const product = await Product.findById(productId).populate("user");
    if (!product) return res.status(404).json({ error: "ไม่พบสินค้า" });

    // 2. ดึง ID เจ้าของสินค้า (คนขาย)
    const receiverId = product.user?._id || product.user;

    // 🚩 Debug: พิมพ์ดูใน Terminal ของ Node.js
    console.log("--- New Chat Request ---");
    console.log("Product Title:", product.title);
    console.log("Sender (Buyer):", senderId);
    console.log("Receiver (Seller):", receiverId);

    // 3. ตรวจสอบความพร้อมของ ID ทั้งสองฝั่ง
    if (!receiverId) {
      return res.status(400).json({ error: "สินค้าชิ้นนี้ไม่มีข้อมูลผู้ขายในระบบ" });
    }

    if (String(senderId) === String(receiverId)) {
      return res.status(400).json({ error: "ไม่สามารถแชทกับตัวเองได้" });
    }

    // 4. หาห้องแชทเดิม
    let chatRoom = await ChatRoom.findOne({
      type: "normal",
      productId: productId,
      participants: { $all: [senderId, receiverId] }
    });

    // 5. ถ้ายังไม่มี ให้สร้างใหม่
    if (!chatRoom) {
      chatRoom = new ChatRoom({
        type: "normal",
        productId: productId,
        participants: [senderId, receiverId] // ✅ ใส่เป็น Array ที่มี 2 ค่าแน่นอน
      });
      await chatRoom.save();
    }

    // 6. Populate ข้อมูลก่อนส่งกลับ Frontend
    await chatRoom.populate([
      { path: "participants", select: "username profileImage" },
      { path: "productId", select: "title images price" }
    ]);

    res.json(chatRoom);
  } catch (err) {
    console.error("Chat Error Details:", err);
    res.status(500).json({ error: "Server Error: " + err.message });
  }
};

// =========================================================
// 2. เริ่มต้นแชทเทรด
// =========================================================
exports.initiateTradeChat = async (req, res) => {
  const { receiverId, productId, offeredProductId } = req.body;
  const userId = req.user.id;

  try {
    if (String(userId) === String(receiverId))
      return res.status(400).json({ error: "ไม่สามารถเทรดกับตัวเองได้" });

    const [product, offeredProduct] = await Promise.all([
      Product.findById(productId),
      Product.findById(offeredProductId)
    ]);

    if (!product)        return res.status(404).json({ error: "ไม่พบสินค้าที่ต้องการ" });
    if (!offeredProduct) return res.status(404).json({ error: "ไม่พบสินค้าที่เสนอเทรด" });

    if (String(offeredProduct.user || offeredProduct.owner) !== String(userId))
      return res.status(403).json({ error: "คุณไม่ใช่เจ้าของสินค้าที่เสนอเทรด" });

    const existingRoom = await ChatRoom.findOne({
      type: "trade",
      participants: { $all: [userId, receiverId] },
      productId,
      offeredProductId,
      tradeStatus: { $in: ["pending", "negotiating"] }
    });

    if (existingRoom)
      return res.status(400).json({ error: "มีคำขอเทรดที่ยังไม่เสร็จสิ้นอยู่แล้ว", roomId: existingRoom._id });

    const chatRoom = await ChatRoom.create({
      type: "trade",
      participants: [userId, receiverId],
      productId,
      offeredProductId,
      tradeStatus: "pending",
      isLocked: true,
      lockedProductSnapshot: createProductSnapshot(product),
      lockedOfferedProductSnapshot: createProductSnapshot(offeredProduct),
      lastMessage: `ขอเทรด: ${offeredProduct.title} ↔ ${product.title}`
    });

    await Message.create({
      roomId: chatRoom._id,
      sender: userId,
      messageType: "trade_request",
      text: `🔄 ขอเทรด "${offeredProduct.title}" กับ "${product.title}"`,
      metadata: {
        offeredProduct: createProductSnapshot(offeredProduct),
        targetProduct:  createProductSnapshot(product)
      }
    });

    await chatRoom.populate([
      { path: "participants",    select: "username profileImage" },
      { path: "productId",       select: "title images price" },
      { path: "offeredProductId", select: "title images price" }
    ]);

    res.status(201).json(chatRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  const { roomId } = req.params; //
  const { text } = req.body; //
  const senderId = req.user.id; 

  try {
    // 1. ตรวจสอบว่ามีห้องแชทนี้จริงและผู้ส่งอยู่ในห้อง
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    // 2. บันทึกข้อความลง Database
    const newMessage = await Message.create({
      roomId,
      sender: senderId,
      text,
      messageType: "text"
    });

    // 3. อัปเดตข้อมูล Last Message ในห้องแชท
    chatRoom.lastMessage = text;
    chatRoom.lastMessageAt = Date.now();
    
    // ตั้งค่าให้ฝ่ายตรงข้ามมีสถานะ "ยังไม่ได้อ่าน"
    const others = chatRoom.participants.filter(p => String(p) !== String(senderId));
    chatRoom.unreadBy = others;
    await chatRoom.save();

    // 4. Populate ข้อมูลผู้ส่งเพื่อให้ฝั่ง Frontend แสดงรูปและชื่อได้ทันที
    await newMessage.populate("sender", "username profileImage");

    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: "ส่งข้อความไม่สำเร็จ: " + err.message });
  }
};

// =========================================================
// 3. ตอบรับการเทรด
// =========================================================
exports.acceptTrade = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  try {
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });
    if (chatRoom.type !== "trade") return res.status(400).json({ error: "ห้องนี้ไม่ใช่ห้องเทรด" });

    const product = await Product.findById(chatRoom.productId);
    const ownerId = String(product.user || product.owner);
    if (ownerId !== String(userId))
      return res.status(403).json({ error: "เฉพาะเจ้าของสินค้าเท่านั้นที่ยืนยันได้" });

    if (!["pending","negotiating"].includes(chatRoom.tradeStatus))
      return res.status(400).json({ error: "ไม่สามารถยืนยันในสถานะนี้ได้" });

    chatRoom.tradeStatus = "accepted";
    await chatRoom.save();

    await Promise.all([
      Product.findByIdAndUpdate(chatRoom.productId,        { status: "traded" }),
      Product.findByIdAndUpdate(chatRoom.offeredProductId, { status: "traded" })
    ]);

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
// 4. ปฏิเสธการเทรด
// =========================================================
exports.rejectTrade = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  try {
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    const product = await Product.findById(chatRoom.productId);
    const ownerId = String(product.user || product.owner);
    if (ownerId !== String(userId))
      return res.status(403).json({ error: "เฉพาะเจ้าของสินค้าเท่านั้นที่ปฏิเสธได้" });

    chatRoom.tradeStatus = "rejected";
    chatRoom.isLocked    = false;
    await chatRoom.save();

    await Promise.all([
      Product.findByIdAndUpdate(chatRoom.productId,        { status: "available" }),
      Product.findByIdAndUpdate(chatRoom.offeredProductId, { status: "available" })
    ]);

    await Message.create({ roomId, sender: userId, messageType: "trade_reject", text: "❌ ปฏิเสธการเทรดแล้ว" });
    res.json({ message: "ปฏิเสธการเทรดสำเร็จ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================================================
// 5. ยกเลิกการเทรด
// =========================================================
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
    chatRoom.isLocked    = false;
    await chatRoom.save();

    await Promise.all([
      Product.findByIdAndUpdate(chatRoom.productId,        { status: "available" }),
      Product.findByIdAndUpdate(chatRoom.offeredProductId, { status: "available" })
    ]);

    await Message.create({ roomId, sender: userId, messageType: "trade_cancel", text: "🚫 ยกเลิกการเทรดแล้ว" });
    res.json({ message: "ยกเลิกการเทรดสำเร็จ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================================================
// 6. ดึงข้อความในห้อง
// =========================================================
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

    // Mark as read
    await ChatRoom.findByIdAndUpdate(roomId, { $pull: { unreadBy: userId } });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================================================
// 7. รายการห้องแชทของฉัน
// =========================================================
exports.getMyChats = async (req, res) => {
  try {
    const chats = await ChatRoom.find({ participants: req.user.id })
      .populate("participants",    "username profileImage")
      .populate("productId",       "title images price")
      .populate("offeredProductId","title images price")
      .sort({ lastMessageAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================================================
// 8. รายละเอียดห้องแชท
// =========================================================
exports.getRoomDetail = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  try {
    const chatRoom = await ChatRoom.findById(roomId)
      .populate("participants", "username profileImage")
      .populate("productId", "title images price description status user");

    if (!chatRoom) return res.status(404).json({ error: "ไม่พบห้องแชท" });

    const isParticipant = chatRoom.participants.some(p => String(p._id) === String(userId));
    if (!isParticipant) return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าห้องนี้" });

    res.json(chatRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};