const Message = require("../models/Message");
const Trade = require("../models/Trade");

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

    const room = await ChatRoomTalk.findById(roomId);
    if (!room || !room.participants.includes(req.user.id)) {
      return res.status(403).json({ error: "Not in this room" });
    }
    
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // 🔥 กัน owner กด accept ตัวเอง
    if (trade.owner.toString() === req.user.id) {
      return res.status(400).json({ error: "Owner cannot accept own trade" });
    }

    if (trade.status !== "Open") {
      return res.status(400).json({ error: "Trade is not open" });
    }

    // ✅ อัปเดตสถานะจริง
    trade.status = "Matched";
    await trade.save();

    const msg = await Message.create({
      roomId,
      sender: req.user.id,
      messageType: "trade_accept",
      metadata: { tradeId }
    });

    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔥 แก้ rejectTrade
exports.rejectTrade = async (req, res) => {
  try {
    const { roomId, tradeId } = req.body;

    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    if (trade.status !== "Open") {
      return res.status(400).json({ error: "Trade cannot be rejected" });
    }

    trade.status = "Open";
    await trade.save();

    const msg = await Message.create({
      roomId,
      sender: req.user.id,
      messageType: "trade_reject",
      metadata: { tradeId }
    });

    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};