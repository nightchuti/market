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

// Accept Trade
exports.acceptTrade = async (req, res) => {
  try {
    const msg = await Message.create({
      roomId: req.body.roomId,
      sender: req.user.id,
      messageType: "trade_accept",
      metadata: {
        tradeId: req.body.tradeId
      }
    });

    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reject Trade
exports.rejectTrade = async (req, res) => {
  try {
    const msg = await Message.create({
      roomId: req.body.roomId,
      sender: req.user.id,
      messageType: "trade_reject",
      metadata: {
        tradeId: req.body.tradeId
      }
    });

    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};