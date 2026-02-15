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
// 3. [BUYER] CHECKOUT (รองรับ PICKUP + DELIVERY)
// ==========================================
router.post("/checkout", protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      items,
      shippingAddress,
      deliveryMode,
      shippingService,
      couponCode,
      paymentMethod
    } = req.body;

    if (!items || items.length === 0)
      throw new Error("ไม่มีสินค้าในคำสั่งซื้อ");

    if (!deliveryMode)
      throw new Error("กรุณาเลือกรูปแบบการรับสินค้า");

    // นัดรับห้าม COD
    if (deliveryMode === "PICKUP" && paymentMethod === "COD")
      throw new Error("นัดรับสินค้าไม่สามารถเก็บเงินปลายทางได้");

    let subTotal = 0;
    const orderItems = [];

    // ===== ตรวจ stock และตัดสต็อก =====
    for (const item of items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.product, quantity: { $gte: item.quantity } },
        { $inc: { quantity: -item.quantity } },
        { new: true, session }
      );

      if (!product)
        throw new Error("สินค้าสต็อกไม่พอ");

      subTotal += product.price * item.quantity;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
    }

    // ===== ผู้ขาย (สมมติ 1 seller ต่อ order) =====
    const sellerId = (await Product.findById(items[0].product)).seller;

    // ===== คำนวณค่าจัดส่ง =====
    let deliveryFee = 0;

    if (deliveryMode === "DELIVERY") {
      if (!shippingAddress)
        throw new Error("กรุณาเลือกที่อยู่จัดส่ง");

      const shop = await Shop.findOne();
      const distance = calculateDistance(
        shop.lat,
        shop.lng,
        shippingAddress.lat,
        shippingAddress.lng
      );

      deliveryFee = calculateDeliveryFee(shippingService, distance);
    }

    // ===== คำนวณคูปอง =====
    let discount = 0;
    let coupon = null;

    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        expireAt: { $gt: new Date() }
      }).session(session);

      if (
        coupon &&
        !coupon.usedBy.includes(req.user.id) &&
        subTotal >= coupon.minSpend
      ) {
        discount =
          coupon.discountPercent > 0
            ? Math.round((subTotal * coupon.discountPercent) / 100)
            : coupon.discountAmount;

        if (coupon.freeShipping) deliveryFee = 0;

        coupon.usedBy.push(req.user.id);
        await coupon.save({ session });
      }
    }

    const totalPrice = Math.max(0, subTotal - discount + deliveryFee);

    // ===== กำหนดสถานะเริ่มต้น =====
    let initialStatus = "PendingPayment";

    if (deliveryMode === "PICKUP") {
      initialStatus = "WaitingMeetup";
    }

    // ===== สร้าง Order =====
    const order = await Order.create(
      [
        {
          user: req.user.id,
          seller: sellerId,
          items: orderItems,
          shippingAddress:
            deliveryMode === "DELIVERY" ? shippingAddress : null,
          deliveryMode,
          deliveryService:
            deliveryMode === "DELIVERY" ? shippingService : null,
          deliveryFee,
          subTotal,
          discount,
          totalPrice,
          paymentMethod,
          status: initialStatus
        }
      ],
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "สร้างคำสั่งซื้อสำเร็จ",
      order: order[0]
    });

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
// orderRoutes.js 
router.get("/:id", protect, async (req, res) => {
  try {
    // แก้ไข: นำ seller ออกหากใน Model Order.js ไม่มีฟิลด์นี้
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id // ค้นหาเฉพาะออเดอร์ของผู้ใช้นี้
    }).populate("items.product user");

    if (!order) return res.status(404).json({ message: "ไม่พบออเดอร์" });
    res.json(order);
  } catch (err) {
    // บรรทัดนี้จะส่ง Error ที่แท้จริงกลับไปให้ Frontend เห็น
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

// ==========================================
//  ตรวจสอบสลืปที่อัปโหลดโดยผู้ใช้ (สำหรับ Admin)
// ==========================================
// ดึงออเดอร์ทั้งหมดที่โอนเงินมาแล้วแต่ยังไม่ได้ตรวจ
router.get("/admin/all-payments", protect, async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["WaitingConfirm", "Paid"] }
    })
      .populate("user", "username")
      .populate({
        path: "items.product",
        // ย้ายการเลือกฟิลด์มาไว้ที่นี่เพื่อให้ดึง seller ออกมาได้
        select: "name price seller", 
        populate: { 
          path: "seller", 
          select: "shopName" 
        }
      })
      // เพิ่มบรรทัดนี้เพื่อแก้ปัญหา StrictPopulateError
      .setOptions({ strictPopulate: false }) 
      .sort({ updatedAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error("Admin Fetch Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin กดยืนยันเงินเข้า
router.patch("/:id/admin-confirm", protect, async (req, res) => {
  const order = await Order.findById(req.params.id);
  order.status = "Paid";
  await order.save();
  res.json({ message: "Updated" });
});

module.exports = router;