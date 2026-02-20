const Message = require("../models/Message");
const Trade = require("../models/Trade");
const ChatRoomTalk = require("../models/ChatRoomTalk");

// ส่งข้อความปกติ
exports.sendMessage = async (req, res) => {
  try {
    const msg = await Message.create({
      roomId: req.body.roomId,
      sender: req.user.id,
      text: req.body.text,
      messageType: "text"
    });

    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ส่งคำขอเทรดผ่านแชท
exports.sendTradeRequest = async (req, res) => {
  try {
    const msg = await Message.create({
      roomId: req.body.roomId,
      sender: req.user.id,
      messageType: "trade_request",
      metadata: {
        tradeId: req.body.tradeId,
        product: req.body.product
      }
    });

    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔥 แก้ acceptTrade
exports.acceptTrade = async (req, res) => {
  try {
    const { roomId, tradeId } = req.body;

    if (!roomId || !tradeId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    // 1️⃣ ตรวจห้อง
    const room = await ChatRoomTalk.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // ต้องเป็น trade room
    if (room.type !== "trade") {
      return res.status(400).json({ error: "Not a trade room" });
    }

    // tradeId ต้องตรงกับห้อง
    if (!room.tradeId || room.tradeId.toString() !== tradeId) {
      return res.status(400).json({ error: "Trade mismatch" });
    }

    // ต้องเป็น participant
    const isParticipant = room.participants.some(
      (p) => p.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({ error: "Not in this room" });
    }

    // 2️⃣ Atomic update กัน race condition
    const updatedTrade = await Trade.findOneAndUpdate(
      {
        _id: tradeId,
        status: "Open",
        owner: { $ne: req.user.id }
      },
      {
        status: "Matched",
        matchedWith: req.user.id
      },
      { new: true }
    );

    if (!updatedTrade) {
      return res.status(400).json({
        error: "Trade already matched or not allowed"
      });
    }

    // 3️⃣ Lock ห้องทันที
    room.tradeStatus = "accepted";
    room.isLocked = true;
    await room.save();

    // 4️⃣ ส่ง system message
    const msg = await Message.create({
      roomId,
      sender: req.user.id,
      messageType: "trade_accept",
      metadata: { tradeId }
    });

    res.json(msg);

  } catch (err) {
    console.error("acceptTrade error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 🔥 แก้ rejectTrade
exports.rejectTrade = async (req, res) => {
  try {
    const { roomId, tradeId } = req.body;

    if (!roomId || !tradeId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    // 1️⃣ ตรวจห้อง
    const room = await ChatRoomTalk.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.type !== "trade") {
      return res.status(400).json({ error: "Not a trade room" });
    }

    if (!room.tradeId || room.tradeId.toString() !== tradeId) {
      return res.status(400).json({ error: "Trade mismatch" });
    }

    const isParticipant = room.participants.some(
      (p) => p.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({ error: "Not in this room" });
    }

    // 2️⃣ Atomic update กัน race
    const updatedTrade = await Trade.findOneAndUpdate(
      {
        _id: tradeId,
        status: "Open"
      },
      {
        status: "Cancelled"
      },
      { new: true }
    );

    if (!updatedTrade) {
      return res.status(400).json({
        error: "Trade already processed"
      });
    }

    // 3️⃣ อัปเดตห้อง
    room.tradeStatus = "rejected";
    room.isLocked = false;
    await room.save();

    // 4️⃣ system message
    const msg = await Message.create({
      roomId,
      sender: req.user.id,
      messageType: "trade_reject",
      metadata: { tradeId }
    });

    res.json(msg);

  } catch (err) {
    console.error("rejectTrade error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};