// backend/routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const ChatRoomTalk = require("../models/ChatRoomTalk");
const Message = require("../models/Message");
const Product = require("../models/Product");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// ==========================================
// 1. ดึงรายการห้องแชททั้งหมดของฉัน
// ==========================================
router.get("/", protect, async (req, res) => {
  try {
    const rooms = await ChatRoomTalk.find({
      participants: req.user.id
    })
      .populate("participants", "username profileImage")
      .populate({
        path: "productId",
        select: "title images price user",
        populate: { path: "user", select: "username" }
      })
      .populate({
        path: "offeredProductId",
        select: "title images price user",
        populate: { path: "user", select: "username" }
      })
      .sort({ lastMessageAt: -1 });

    // เพิ่ม avatarUrl สำหรับ ChatFloating
    const roomsWithAvatar = rooms.map(room => {
      const roomObj = room.toObject();
      roomObj.participants = roomObj.participants.map(p => ({
        ...p,
        avatarUrl: p.profileImage
          ? (p.profileImage.startsWith("http") ? p.profileImage : `${p.profileImage}`)
          : null
      }));
      return roomObj;
    });

    res.json(roomsWithAvatar);
  } catch (err) {
    console.error("Get rooms error:", err);
    res.status(500).json({ error: "ไม่สามารถโหลดรายการแชทได้" });
  }
});

// ==========================================
// 2. ดึงข้อมูลห้องเดียว
// ==========================================
router.get("/:roomId", protect, async (req, res) => {
  try {
    const room = await ChatRoomTalk.findById(req.params.roomId)
      .populate("participants", "username profileImage")
      .populate({
        path: "productId",
        select: "title images price user",
        populate: { path: "user", select: "username profileImage" }
      })
      .populate({
        path: "offeredProductId",
        select: "title images price user",
        populate: { path: "user", select: "username profileImage" }
      });

    if (!room) {
      return res.status(404).json({ error: "ไม่พบห้องแชท" });
    }

    // เช็คว่าเป็นสมาชิกในห้องหรือไม่
    const isMember = room.participants.some(
      p => String(p._id) === String(req.user.id)
    );

    if (!isMember) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงห้องนี้" });
    }

    res.json(room);
  } catch (err) {
    console.error("Get room error:", err);
    res.status(500).json({ error: "ไม่สามารถโหลดข้อมูลห้องได้" });
  }
});

// ==========================================
// 3. ดึงข้อความในห้อง
// ==========================================
router.get("/:roomId/messages", protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // เช็คว่าเป็นสมาชิกในห้อง
    const room = await ChatRoomTalk.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: "ไม่พบห้องแชท" });
    }

    const isMember = room.participants.some(
      p => String(p) === String(req.user.id)
    );

    if (!isMember) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงห้องนี้" });
    }

    const messages = await Message.find({ roomId })
      .populate("sender", "username profileImage")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    // ลบ userId ออกจาก unreadBy
    if (room.unreadBy.includes(req.user.id)) {
      room.unreadBy = room.unreadBy.filter(
        uid => String(uid) !== String(req.user.id)
      );
      await room.save();
    }

    res.json(messages);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: "ไม่สามารถโหลดข้อความได้" });
  }
});

// ==========================================
// 4. สร้างห้องแชทธรรมดา (normal)
// ==========================================
router.post("/create-normal", protect, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "กรุณาระบุสินค้า" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "ไม่พบสินค้า" });
    }

    const sellerId = String(product.user);
    const buyerId = String(req.user.id);

    if (sellerId === buyerId) {
      return res.status(400).json({ error: "ไม่สามารถแชทกับตัวเองได้" });
    }
    const sortedParticipants = [buyerId, sellerId].sort();
    // เช็คว่ามีห้องอยู่แล้วหรือไม่
    let room = await ChatRoomTalk.findOne({
      type: "normal",
      productId,
      participants: sortedParticipants,
    })
      .populate("participants", "username profileImage")
      .populate("productId", "title images price");

    // ถ้ายังไม่มี สร้างใหม่
    if (!room) {
      room = await ChatRoomTalk.create({
        type: "normal",
        participants: sortedParticipants,
        productId,
        lastMessage: "เริ่มการสนทนา",
        lastMessageAt: new Date(),
        unreadBy: [sellerId] // ผู้ขายยังไม่ได้อ่าน
      });

      // Populate ใหม่
      room = await ChatRoomTalk.findById(room._id)
        .populate("participants", "username profileImage")
        .populate("productId", "title images price");

      // สร้างข้อความระบบ
      await Message.create({
        roomId: room._id,
        sender: buyerId,
        text: "เริ่มการสนทนา",
        messageType: "system"
      });
    }

    res.json(room);
  } catch (err) {
    console.error("Create normal chat error:", err);
    res.status(500).json({ error: "ไม่สามารถสร้างห้องแชทได้" });
  }
});

// ==========================================
// 🔟 Seller แชทหาลูกค้าจาก Order
// ==========================================
router.post("/create-from-order", protect, async (req, res) => {
  try {
    const { buyerId, productId } = req.body;

    if (!buyerId || !productId) {
      return res.status(400).json({ error: "ข้อมูลไม่ครบ" });
    }

    const sellerId = String(req.user.id);

    if (sellerId === String(buyerId)) {
      return res.status(400).json({ error: "ไม่สามารถแชทกับตัวเองได้" });
    }

    const sortedParticipants = [sellerId, buyerId].sort();

    let room = await ChatRoomTalk.findOne({
      type: "normal",
      productId,
      participants: sortedParticipants
    })
      .populate("participants", "username profileImage")
      .populate("productId", "title images price");

    if (!room) {
      room = await ChatRoomTalk.create({
        type: "normal",
        participants: sortedParticipants,
        productId,
        lastMessage: "เริ่มการสนทนา",
        lastMessageAt: new Date(),
        unreadBy: [buyerId]
      });

      room = await ChatRoomTalk.findById(room._id)
        .populate("participants", "username profileImage")
        .populate("productId", "title images price");

      await Message.create({
        roomId: room._id,
        sender: sellerId,
        text: "เริ่มการสนทนา",
        messageType: "system"
      });
    }

    res.json(room);

  } catch (err) {
    console.error("Create chat from order error:", err);
    res.status(500).json({ error: "ไม่สามารถสร้างห้องแชทได้" });
  }
});

// ==========================================
// 5. สร้างห้องแชทเทรด (trade)
// ==========================================
router.post("/create-trade", protect, async (req, res) => {
  console.log("target status:", targetProduct.status);
console.log("offered status:", offeredProduct.status);
console.log("activeTrade:", activeTrade);
  try {
    const { productId, offeredProductId } = req.body;

    if (!productId || !offeredProductId) {
      return res.status(400).json({ error: "กรุณาระบุสินค้าทั้งสองฝ่าย" });
    }

    if (String(productId) === String(offeredProductId)) {
      return res.status(400).json({ error: "ไม่สามารถใช้สินค้าตัวเดียวกันเทรดได้" });
    }

    const [targetProduct, offeredProduct] = await Promise.all([
      Product.findById(productId),
      Product.findById(offeredProductId)
    ]);

    if (!targetProduct || !offeredProduct) {
      return res.status(404).json({ error: "ไม่พบสินค้า" });
    }

    const ownerId = String(targetProduct.user); // เจ้าของสินค้าที่ต้องการ
    const requesterId = String(req.user.id);    // ผู้ขอเทรด

    // ห้ามเทรดกับตัวเอง
    if (ownerId === requesterId) {
      return res.status(400).json({ error: "ไม่สามารถเทรดกับตัวเองได้" });
    }

    // เช็คว่าเป็นเจ้าของ offeredProduct หรือไม่
    if (String(offeredProduct.user) !== requesterId) {
      return res.status(403).json({ error: "คุณไม่ใช่เจ้าของสินค้าที่เสนอ" });
    }

    if (targetProduct.status !== "available" || offeredProduct.status !== "available") {
      return res.status(400).json({ error: "สินค้าบางรายการไม่พร้อมเทรดแล้ว" });
    }

    const sortedParticipants = [requesterId, ownerId].sort();

    // 🔥 เช็คว่าสินค้าทั้งสองชิ้นมี trade active อยู่หรือไม่
    const activeTrade = await ChatRoomTalk.findOne({
      type: "trade",
      tradeStatus: { $in: ["pending", "negotiating", "accepted"] },
      $or: [
        { productId },
        { offeredProductId: productId },
        { productId: offeredProductId },
        { offeredProductId }
      ]
    });

    if (activeTrade) {
      return res.status(400).json({
        error: "สินค้าชิ้นใดชิ้นหนึ่งกำลังอยู่ระหว่างการเทรด"
      });
    }

    // เช็คว่ามีห้องอยู่แล้วหรือไม่
    let room = await ChatRoomTalk.findOne({
      type: "trade",
      productId,
      offeredProductId,
      participants: sortedParticipants,
      tradeStatus: { $in: ["pending", "negotiating", "accepted"] }
    })
      .populate("participants", "username profileImage")
      .populate("productId", "title images price")
      .populate("offeredProductId", "title images price");

    if (!room) {
      room = await ChatRoomTalk.create({
        type: "trade",
        participants: sortedParticipants,
        productId,
        offeredProductId,
        tradeStatus: "pending",
        lastMessage: "ขอเทรดสินค้า",
        lastMessageAt: new Date(),
        unreadBy: [ownerId] // เจ้าของสินค้ายังไม่ได้อ่าน
      });

      room = await ChatRoomTalk.findById(room._id)
        .populate("participants", "username profileImage")
        .populate("productId", "title images price")
        .populate("offeredProductId", "title images price");

      // สร้างข้อความขอเทรด
      await Message.create({
        roomId: room._id,
        sender: requesterId,
        messageType: "trade_request",
        text: "ขอเทรดสินค้า",
        metadata: {
          offeredProduct: {
            _id: offeredProduct._id,
            title: offeredProduct.title,
            images: offeredProduct.images,
            price: offeredProduct.price
          },
          targetProduct: {
            _id: targetProduct._id,
            title: targetProduct.title,
            images: targetProduct.images,
            price: targetProduct.price
          }
        }
      });
    }

    res.json(room);
  } catch (err) {
    console.error("Create trade chat error:", err);
    res.status(500).json({ error: "ไม่สามารถสร้างห้องเทรดได้" });
  }
});

// ==========================================
// 6. ยอมรับการเทรด
// ==========================================
router.put("/:roomId/accept", protect, async (req, res) => {
  try {
    const room = await ChatRoomTalk.findById(req.params.roomId)
      .populate("productId")
      .populate("offeredProductId");

    if (!room || room.type !== "trade") {
      return res.status(404).json({ error: "ไม่พบห้องเทรด" });
    }

    // เช็คว่าเป็นเจ้าของสินค้าหรือไม่
    const ownerId = String(room.productId.user);
    if (ownerId !== String(req.user.id)) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์ยอมรับ" });
    }

    // เช็คสถานะ
    if (room.tradeStatus !== "pending" && room.tradeStatus !== "negotiating") {
      return res.status(400).json({ error: "ไม่สามารถยอมรับได้ในสถานะนี้" });
    }

    // อัปเดตสถานะ
    room.tradeStatus = "accepted";
    room.lastMessage = "ยอมรับการเทรด";
    room.lastMessageAt = new Date();

    // บันทึก snapshot สินค้า (ป้องกันการเปลี่ยนแปลง)
    room.lockedProductSnapshot = {
      _id: room.productId._id,
      title: room.productId.title,
      images: room.productId.images,
      price: room.productId.price,
      user: room.productId.user
    };

    room.lockedOfferedProductSnapshot = {
      _id: room.offeredProductId._id,
      title: room.offeredProductId.title,
      images: room.offeredProductId.images,
      price: room.offeredProductId.price,
      user: room.offeredProductId.user
    };
    // 🔒 เปลี่ยนสถานะสินค้าเป็น reserved
    room.productId.status = "reserved";
    room.offeredProductId.status = "reserved";

    await Promise.all([
      room.productId.save(),
      room.offeredProductId.save()
    ]);

    await room.save();

    // สร้างข้อความระบบ
    await Message.create({
      roomId: room._id,
      sender: req.user.id,
      messageType: "trade_accept",
      text: "ยอมรับการเทรด"
    });

    res.json({ success: true, room });
  } catch (err) {
    console.error("Accept trade error:", err);
    res.status(500).json({ error: "ไม่สามารถยอมรับได้" });
  }
});

// ==========================================
// 7. ปฏิเสธการเทรด
// ==========================================
router.put("/:roomId/reject", protect, async (req, res) => {
  try {
    const room = await ChatRoomTalk.findById(req.params.roomId);

    if (!room || room.type !== "trade") {
      return res.status(404).json({ error: "ไม่พบห้องเทรด" });
    }

    // เช็คว่าเป็นสมาชิกในห้อง
    const isMember = room.participants.some(
      p => String(p) === String(req.user.id)
    );

    if (!isMember) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์" });
    }

    if (room.tradeStatus === "accepted") {
      const product1 = await Product.findById(room.productId);
      const product2 = await Product.findById(room.offeredProductId);

      product1.status = "available";
      product2.status = "available";

      await Promise.all([product1.save(), product2.save()]);
    }

    room.tradeStatus = "rejected";
    room.lastMessage = "ปฏิเสธการเทรด";
    room.lastMessageAt = new Date();
    await room.save();

    await Message.create({
      roomId: room._id,
      sender: req.user.id,
      messageType: "trade_reject",
      text: "ปฏิเสธการเทรด"
    });

    res.json({ success: true, room });
  } catch (err) {
    console.error("Reject trade error:", err);
    res.status(500).json({ error: "ไม่สามารถปฏิเสธได้" });
  }
});

// ==========================================
// 8. ยกเลิกการเทรด
// ==========================================
router.put("/:roomId/cancel", protect, async (req, res) => {
  try {
    const room = await ChatRoomTalk.findById(req.params.roomId);

    if (!room || room.type !== "trade") {
      return res.status(404).json({ error: "ไม่พบห้องเทรด" });
    }

    const isMember = room.participants.some(
      p => String(p) === String(req.user.id)
    );

    if (!isMember) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์" });
    }
    if (room.tradeStatus === "accepted") {
  const product1 = await Product.findById(room.productId);
  const product2 = await Product.findById(room.offeredProductId);

  product1.status = "available";
  product2.status = "available";

  await Promise.all([product1.save(), product2.save()]);
}

    room.tradeStatus = "cancelled";
    room.lastMessage = "ยกเลิกการเทรด";
    room.lastMessageAt = new Date();
    await room.save();

    await Message.create({
      roomId: room._id,
      sender: req.user.id,
      messageType: "trade_cancel",
      text: "ยกเลิกการเทรด"
    });

    res.json({ success: true, room });
  } catch (err) {
    console.error("Cancel trade error:", err);
    res.status(500).json({ error: "ไม่สามารถยกเลิกได้" });
  }
});

// ==========================================
// 9. ยืนยันส่ง/รับสินค้า (Confirm Swap)
// ==========================================
router.put("/:roomId/confirm-swap", protect, async (req, res) => {
  try {
    const room = await ChatRoomTalk.findById(req.params.roomId)
      .populate("productId")
      .populate("offeredProductId");

    if (!room || room.type !== "trade") {
      return res.status(404).json({ error: "ไม่พบห้องเทรด" });
    }

    if (room.tradeStatus !== "accepted") {
      return res.status(400).json({ error: "ต้องยอมรับการเทรดก่อน" });
    }

    const isMember = room.participants.some(
      p => String(p) === String(req.user.id)
    );

    if (!isMember) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์" });
    }
    // สลับเจ้าของสินค้า
    const product1 = await Product.findById(room.productId._id);
    const product2 = await Product.findById(room.offeredProductId._id);
    if (room.isLocked) {
      return res.status(400).json({ error: "การเทรดถูกปิดไปแล้ว" });
    }

    if (product1.status !== "reserved" || product2.status !== "reserved") {
      return res.status(400).json({ error: "สินค้าบางรายการไม่พร้อมเทรดแล้ว" });
    }


    const tempUser = product1.user;
    product1.user = product2.user;
    product2.user = tempUser;

    product1.status = "exchanged";
    product2.status = "exchanged";

    await Promise.all([
      product1.save(),
      product2.save()
    ]);

    // อัปเดตห้อง
    room.tradeStatus = "completed";
    room.isLocked = true;
    room.completedAt = new Date();
    room.lastMessage = "เทรดสำเร็จ!";
    room.lastMessageAt = new Date();
    await room.save();

    // สร้างข้อความระบบ
    await Message.create({
      roomId: room._id,
      sender: req.user.id,
      messageType: "trade_confirm",
      text: "✅ การเทรดสำเร็จ!"
    });

    res.json({ success: true, room });
  } catch (err) {
    console.error("Confirm swap error:", err);
    res.status(500).json({ error: "ไม่สามารถยืนยันได้" });
  }
});

module.exports = router;