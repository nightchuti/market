const Order = require("../models/Order");

// ===============================
// 1️⃣ SELLER ACCEPT ORDER
// ===============================
exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      seller: req.user.id,
      status: "Paid"
    });

    if (!order)
      return res.status(400).json({ message: "ไม่สามารถรับออเดอร์ได้" });

    order.status = "Preparing";
    await order.save();

    res.json({ message: "รับออเดอร์แล้ว", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===============================
// 2️⃣ SELLER SHIP ORDER
// ===============================
exports.shipOrder = async (req, res) => {
  try {
    const { riderName, riderPhone, trackingUrl } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      seller: req.user.id,
      status: "Preparing"
    });

    if (!order)
      return res.status(400).json({ message: "ยังไม่อยู่สถานะเตรียมสินค้า" });

    order.status = "Shipping";

    order.deliveryDetails = {
      riderName,
      riderPhone,
      trackingUrl
    };

    order.autoReleaseAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    await order.save();

    res.json({ message: "จัดส่งแล้ว", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===============================
// 3️⃣ BUYER CONFIRM DELIVERY
// ===============================
exports.confirmDelivery = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: "Shipping"
    });

    if (!order)
      return res.status(400).json({ message: "ไม่สามารถยืนยันได้" });

    order.status = "Completed";
    order.escrowStatus = "Released";
    order.completedAt = new Date();

    await order.save();

    res.json({ message: "ยืนยันรับสินค้าแล้ว", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
