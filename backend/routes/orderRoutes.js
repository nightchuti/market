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

const {
  acceptOrder,
  shipOrder,
  confirmDelivery
} = require("../controllers/orderController");

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
const { uploadSlip } = require("../middleware/upload");

// 1. [SELLER] กดสุ่มเลข OTP และเปลี่ยนสถานะเป็น WaitingMeetup
router.put("/:orderId/ready-to-meetup", protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, seller: req.user._id });
    if (!order)
      return res.status(404).json({ message: "ไม่พบคำสั่งซื้อ" });

    if (order.status !== "Paid")
      return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });

    if (order.deliveryMode !== "PICKUP") {
      return res.status(400).json({ message: "ออเดอร์นี้ไม่ใช่นัดรับ" });
    }

    // สุ่ม OTP 6 หลัก
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    order.meetupOTP = otp;
    order.status = "WaitingMeetup";
    await order.save();
    res.json({ message: "พร้อมสำหรับการนัดรับ", otp });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. [SELLER] ตรวจสอบ OTP ที่ได้รับจาก Buyer
router.put("/:orderId/verify-meetup", protect, async (req, res) => {
  const { otp } = req.body;

  try {

    const order = await Order.findOne({
      _id: req.params.orderId,
      seller: req.user._id
    });

    if (!order)
      return res.status(404).json({ message: "ไม่พบคำสั่งซื้อ" });

    if (order.deliveryMode !== "PICKUP")
      return res.status(400).json({ message: "ออเดอร์นี้ไม่ใช่นัดรับ" });

    if (order.status !== "WaitingMeetup")
      return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });

    if (!otp || otp.length !== 6)
      return res.status(400).json({ message: "OTP ต้องเป็น 6 หลัก" });

    if (order.meetupOTP !== otp)
      return res.status(400).json({ message: "OTP ไม่ถูกต้อง" });

    order.status = "Completed";
    order.meetupVerified = true;
    order.escrowStatus = "Released";
    order.meetupOTP = null; // 🔥 ล้าง OTP ป้องกัน reuse

    if (order.paymentMethod === "COD") {
      order.paidAt = new Date();
    }

    await order.save();

    res.json({ message: "นัดรับสินค้าสำเร็จ" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
      couponCode
    } = req.body;

    if (deliveryMode === "DELIVERY" && paymentMethod !== "PROMPTPAY") {
      throw new Error("การจัดส่งต้องชำระเงินแบบโอนเท่านั้น");
    }

    const buyerId = req.user.id;

    let subTotal = 0;
    const orderItems = [];
    let sellerId = null;

    // 🔥 LOOP สินค้า
    for (const item of items) {

      const productData = await Product.findById(item.product).session(session);
      if (!productData) throw new Error("ไม่พบสินค้า");

      // กันซื้อของตัวเอง
      if (productData.user.toString() === buyerId.toString()) {
        throw new Error(`ไม่สามารถซื้อสินค้าของตัวเองได้`);
      }

      // 🔥 กันหลายร้าน
      if (!sellerId) {
        sellerId = productData.user;
      } else if (sellerId.toString() !== productData.user.toString()) {
        throw new Error("ไม่สามารถสั่งซื้อหลายร้านในคำสั่งซื้อเดียวได้");
      }

      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.product,
          quantity: { $gte: item.quantity }
        },
        { $inc: { quantity: -item.quantity } },
        { new: true, session }
      );

      if (!updatedProduct) {
        throw new Error("สินค้าไม่พอ");
      }

      subTotal += updatedProduct.price * item.quantity;

      orderItems.push({
        product: updatedProduct._id,
        quantity: item.quantity,
        price: updatedProduct.price
      });
    }

    // =============================
    // 🔥 คำนวณค่าส่ง
    // =============================

    let finalDeliveryFee = 0;

    if (deliveryMode === "DELIVERY") {

      if (
        shippingAddress?.lat === undefined ||
        shippingAddress?.lng === undefined
      ) {
        throw new Error("ไม่พบพิกัดที่อยู่จัดส่ง");
      }

      const sellerShop = await shop.findOne({ owner: sellerId });
      if (!sellerShop?.location?.lat) {
        throw new Error("ร้านค้ายังไม่ได้ตั้งค่าพิกัด");
      }

      const distanceKm = calculateDistance(
        sellerShop.location.lat,
        sellerShop.location.lng,
        shippingAddress.lat,
        shippingAddress.lng
      );

      if (distanceKm > 30) {
        throw new Error("อยู่นอกเขตให้บริการ");
      }

      finalDeliveryFee = calculateDeliveryFee(distanceKm);
    }

    // 🔥 คำนวณยอดรวมจริงใน Backend เท่านั้น
    const finalTotal = subTotal + finalDeliveryFee;

    let initialStatus = "PendingPayment";

    if (deliveryMode === "PICKUP" && paymentMethod === "COD") {
      initialStatus = "Paid";
    }

    const order = await Order.create(
      [{
        user: buyerId,
        seller: sellerId,
        items: orderItems,
        deliveryMode,
        paymentMethod,
        shippingAddress,
        subTotal,
        deliveryFee: finalDeliveryFee,
        totalPrice: finalTotal,
        couponCode,
        status: initialStatus
      }],
      { session }
    );

    // 🔥 ลบสินค้าออกจากตะกร้า
    await Cart.updateOne(
      { user: buyerId },
      {
        $pull: {
          items: {
            product: { $in: items.map(i => i.product) }
          }
        }
      },
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
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
router.patch("/:id/upload-slip", protect, uploadSlip.single("slip"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "กรุณาแนบไฟล์สลิป" });
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
        status: "PendingPayment",
        paymentMethod: "PROMPTPAY"
      },
      {
        // ✅ ใช้ URL จาก Cloudinary แทน
        paymentSlip: req.file.path,
        status: "WaitingConfirm",
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "ไม่พบออเดอร์หรือสถานะไม่ถูกต้อง" });
    }

    res.json({
      success: true,
      message: "อัปโหลดสลิปสำเร็จ รอแอดมินตรวจสอบ",
      order
    });

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
    const { riderName, riderPhone, trackingUrl } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      seller: req.user.id
    });

    if (!order)
      return res.status(404).json({ message: "ไม่พบออเดอร์" });

    if (order.deliveryMode !== "DELIVERY")
      return res.status(400).json({ message: "ออเดอร์นี้ไม่ใช่การจัดส่ง" });

    if (order.status !== "Preparing")
      return res.status(400).json({ message: "ต้องเตรียมสินค้าก่อน" });

    order.status = "Shipping";

    order.deliveryDetails = {
      riderName,
      riderPhone,
      trackingUrl
    };

    // 🔥 ตั้ง auto release 24 ชม.
    order.autoReleaseAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    await order.save();

    res.json({
      success: true,
      message: "บันทึกข้อมูลไรเดอร์และเริ่มจัดส่งแล้ว",
      order
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ==========================================
// 8. [BUYER] ยืนยันได้รับสินค้า (Completed)
// ==========================================
router.patch("/:id/complete", protect, async (req, res) => {
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

    res.json({
      success: true,
      message: "ยืนยันรับสินค้า เงินถูกปล่อยแล้ว",
      order
    });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ==========================================
// 🔥 [SELLER] รับออเดอร์ (Accept)
// ==========================================
router.patch("/:id/accept", protect, acceptOrder);

// ==========================================
// 🚚 [SELLER] กรอกข้อมูลไรเดอร์ + ส่งสินค้า
// ==========================================
router.patch("/:id/ship", protect, shipOrder);

// ==========================================
// ✅ [BUYER] ยืนยันได้รับสินค้า
// ==========================================
router.post("/:id/confirm-delivery", protect, confirmDelivery);

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