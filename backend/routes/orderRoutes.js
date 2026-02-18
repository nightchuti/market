const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const shop = require("../models/Shop");
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
      .populate({
        path: "items.product",
        select: "title images user",
        populate: {
          path: "user",
          select: "username" // สมมติว่าต้องการแสดงชื่อเจ้าของจากโมเดล User
        }
      })
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
// 🆕 [SELLER] ดึงคำสั่งซื้อที่ส่งมาถึงร้านค้าของเรา
// ==========================================
router.get("/seller/all", protect, async (req, res) => {
  try {
    // 1. ค้นหาออเดอร์ทั้งหมดที่มีรายการสินค้า
    const orders = await Order.find()
      .populate("user", "username")
      .populate({
        path: "items.product",
        model: "Product",
        select: "title price seller", // ดึงข้อมูล seller มาด้วยเพื่อกรอง
      })
      .sort({ createdAt: -1 });

    // 2. กรองเฉพาะออเดอร์ที่มีสินค้าที่เป็นของเรา (req.user._id)
    const myOrders = orders.filter(order =>
      order.items.some(item =>
        item.product && item.product.seller && item.product.seller.toString() === req.user._id.toString()
      )
    );

    res.json(myOrders);
  } catch (err) {
    console.error("Seller Order Fetch Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์ของร้านค้า" });
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
// 3. [BUYER] CHECKOUT (ฉบับแก้ไขสมบูรณ์)
// ==========================================
router.post("/checkout", protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      items,
      deliveryMode,
      paymentMethod,
      shippingAddress,
      deliveryFee,
      totalPrice,
      couponCode
    } = req.body;

    const buyerId = req.user.id; // ID ของคนซื้อที่ล็อกอินอยู่

    let subTotal = 0;
    const orderItems = [];

    for (const item of items) {

      const productData = await Product.findById(item.product).session(session);

      if (!productData) {
        throw new Error("ไม่พบสินค้า");
      }

      // ✅ กันเจ้าของซื้อสินค้าตัวเอง (ชั้น Backend)
      if (productData.user.toString() === req.user.id.toString()) {
        throw new Error(
          `ไม่สามารถสั่งซื้อสินค้า "${productData.title}" ของตนเองได้`
        );
      }

      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.product,
          quantity: { $gte: item.quantity }
        },
        {
          $inc: { quantity: -item.quantity }
        },
        { new: true, session }
      );

      if (!updatedProduct) {
        throw new Error(`สินค้า ${productData.title} หมดหรือจำนวนไม่พอ`);
      }

      subTotal += updatedProduct.price * item.quantity;

      orderItems.push({
        product: updatedProduct._id,
        quantity: item.quantity,
        price: updatedProduct.price
      });
    }

    // ... (ส่วนคำนวณค่าส่ง/คูปอง เหมือนเดิม) ...

    // 4. สร้าง Order (ตาม Schema ที่คุณส่งมา)
    const order = await Order.create(
      [
        {
          user: buyerId,
          items: orderItems,
          deliveryMode,
          paymentMethod,
          shippingAddress,
          deliveryFee,
          subTotal,
          totalPrice,
          couponCode,
          status: req.body.deliveryMode === "PICKUP" ? "WaitingMeetup" : "PendingPayment"
        }
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({ success: true, order: order[0] });

  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message }); // ข้อความ Error จะถูกส่งไปโชว์ที่หน้าบ้าน
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
// ✅ แก้ไขใน orderRoutes.js (เส้นทาง /admin/all-payments)
router.get("/admin/all-payments", protect, async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["WaitingConfirm", "Paid"] }
    })
      .populate("user", "username") // ข้อมูลคนซื้อ
      .populate({
        path: "items.product",
        select: "title price user", // ดึง user (เจ้าของสินค้า) ออกมา
        populate: {
          path: "user",
          select: "username", // ดึงชื่อเจ้าของสินค้า
        }
      })
      .sort({ updatedAt: -1 });

    /* หมายเหตุ: หากคุณต้องการชื่อร้าน (Shop Name) จริงๆ 
       คุณต้องมั่นใจว่า Model Shop มีฟิลด์ ownerId ที่ตรงกับ items.product.user
       และอาจต้องดึงข้อมูล Shop แยก หรือทำ Virtual Populate
    */

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
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