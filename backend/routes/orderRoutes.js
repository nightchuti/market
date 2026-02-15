const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const Shop = require("../models/shop");
const Coupon = require("../models/Coupon");
const Product = require("../models/Product");

const { protect } = require("../middleware/authMiddleware");
const calculateDistance = require("../utils/distance");
const calculateDeliveryFee = require("../utils/deliveryFee");

// ===== ตั้งค่า MULTER สำหรับอัปโหลดสลิป =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/slips";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `slip-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// ==========================================
// 1. [BUYER] ดึงประวัติคำสั่งซื้อของตัวเอง
// ==========================================
router.get("/my", protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: req.user.id })
      .populate({ path: "items.product", select: "name image price seller" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments({ user: req.user.id });
    res.json({ success: true, count: orders.length, totalPages: Math.ceil(totalOrders / limit), currentPage: page, orders });
  } catch (err) {
    res.status(500).json({ message: "ดึงข้อมูลออเดอร์ไม่สำเร็จ: " + err.message });
  }
});

// ==========================================
// 2. [SELLER] ดึงรายการที่มีคนมาสั่งซื้อสินค้าของฉัน
// ==========================================
router.get("/seller/orders", protect, async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.user.id })
      .populate("user", "name email")
      .populate("items.product", "name image price")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ message: "ดึงข้อมูลรายการขายไม่สำเร็จ: " + err.message });
  }
});

// ==========================================
// 3. [BUYER] ROUTE สำหรับการ CHECKOUT
// ==========================================
router.post("/checkout", protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { addressId, paymentMethod, deliveryService, couponCode } = req.body;

    const address = await Address.findById(addressId);
    if (!address) throw new Error("ไม่พบที่อยู่สำหรับการจัดส่ง");

    const shop = await Shop.findOne();
    if (!shop) throw new Error("ระบบร้านค้ายังไม่พร้อมใช้งาน");

    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
    const selectedItems = cart.items.filter(i => i.selected);
    if (!cart || selectedItems.length === 0) throw new Error("ไม่มีสินค้าในตะกร้า");

    // บันทึก ID ผู้ขายจากสินค้าชิ้นแรก (สมมติ 1 ออเดอร์ต่อ 1 ผู้ขาย)
    const sellerId = selectedItems[0].product.seller;

    let subTotal = 0;
    const orderItems = [];

    for (const item of selectedItems) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.product._id, quantity: { $gte: item.quantity } },
        { $inc: { quantity: -item.quantity } },
        { new: true, session }
      );
      if (!updatedProduct) throw new Error(`สินค้า ${item.product.name} สต็อกไม่พอ`);

      subTotal += item.product.price * item.quantity;
      orderItems.push({ product: item.product._id, quantity: item.quantity, price: item.product.price });
    }

    const distance = calculateDistance(shop.lat, shop.lng, address.lat, address.lng);
    let deliveryFee = calculateDeliveryFee(deliveryService, distance);

    let discount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true, expireAt: { $gt: new Date() } }).session(session);
      if (coupon && !coupon.usedBy.includes(req.user.id) && subTotal >= coupon.minSpend) {
        discount = coupon.discountPercent > 0 ? Math.round(subTotal * coupon.discountPercent / 100) : coupon.discountAmount;
        if (coupon.freeShipping) deliveryFee = 0;
        coupon.usedBy.push(req.user.id);
        await coupon.save({ session });
      }
    }

    const order = await Order.create([{
      user: req.user.id,
      seller: sellerId,
      items: orderItems,
      shippingAddress: { dormName: address.dormName, room: address.room, lat: address.lat, lng: address.lng, note: address.note },
      paymentMethod,
      deliveryService,
      deliveryFee,
      subTotal,
      discount,
      totalPrice: (subTotal - discount) + deliveryFee,
      status: "PendingPayment" // เริ่มต้นที่รอชำระเงิน
    }], { session });

    cart.items = cart.items.filter(i => !i.selected);
    await cart.save({ session });

    await session.commitTransaction();
    res.status(201).json({ success: true, order: order[0] });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

// ==========================================
// 4. [BUYER] อัปโหลดสลิปแจ้งโอนเงิน
// ==========================================
router.patch("/:id/upload-slip", protect, upload.single("slip"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "กรุณาแนบไฟล์สลิป" });
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id, status: "PendingPayment" },
      { paymentSlip: `/uploads/slips/${req.file.filename}`, status: "WaitingConfirm" },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "ไม่พบออเดอร์หรือสถานะไม่ถูกต้อง" });
    res.json({ success: true, message: "อัปโหลดสลิปสำเร็จ รอแอดมินตรวจสอบ", order });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ==========================================
// 5. [ADMIN] ยืนยันสลิปผ่าน (Verified)
// ==========================================
router.patch("/:id/admin-verify", protect, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: "Paid" },
      { new: true }
    );
    res.json({ success: true, message: "ยืนยันการชำระเงินเรียบร้อย", order });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ==========================================
// 6. [SELLER] ยืนยันเตรียมสินค้า (Preparing)
// ==========================================
router.patch("/:id/prepare", protect, async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, seller: req.user.id, status: "Paid" },
      { status: "Preparing" },
      { new: true }
    );
    if (!order) return res.status(400).json({ message: "ไม่สามารถเตรียมสินค้าได้ (อาจยังไม่ชำระเงิน)" });
    res.json({ success: true, message: "กำลังเตรียมสินค้า", order });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ==========================================
// 7. [SELLER] เรียกขนส่ง (Call Delivery)
// ==========================================
router.patch("/:id/call-delivery", protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, seller: req.user.id });
    if (order.status !== "Preparing") return res.status(400).json({ message: "กรุณากดเตรียมสินค้าก่อนเรียกไรเดอร์" });

    // จำลองการเรียก API ขนส่ง
    order.status = "Shipping";
    order.deliveryDetails = { riderName: "สมชาย ขยันส่ง", riderPhone: "081-234-5678", trackingUrl: "https://track.grab.com/mock" };
    
    await order.save();
    res.json({ success: true, message: "เรียกไรเดอร์สำเร็จ!", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 8. [BUYER] ยืนยันได้รับสินค้า (Completed)
// ==========================================
router.patch("/:id/complete", protect, async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id, status: "Shipping" },
      { status: "Completed" },
      { new: true }
    );
    if (!order) return res.status(400).json({ message: "ไม่สามารถยืนยันได้" });
    res.json({ success: true, message: "การซื้อขายเสร็จสมบูรณ์ ระบบจะโอนเงินให้ผู้ขายต่อไป", order });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ==========================================
// 9. รายละเอียดออเดอร์เดียว & ยกเลิกออเดอร์
// ==========================================
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, $or: [{ user: req.user.id }, { seller: req.user.id }] }).populate("items.product user seller");
    if (!order) return res.status(404).json({ message: "ไม่พบออเดอร์" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id/cancel", protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).session(session);
    if (!order || ["Paid", "Shipping", "Completed"].includes(order.status)) throw new Error("ไม่สามารถยกเลิกได้ในขณะนี้");

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } }, { session });
    }
    order.status = "Cancelled";
    await order.save({ session });
    await session.commitTransaction();
    res.json({ message: "ยกเลิกออเดอร์สำเร็จ" });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;