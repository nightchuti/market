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
const logActivity = require("../utils/logActivity"); // 🔥 เพิ่ม

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
    order.meetupOTP = null;

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
          select: "username"
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
// [SELLER] ดึงคำสั่งซื้อที่ส่งมาถึงร้านค้าของเรา
// ==========================================
router.get("/seller/all", protect, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "username")
      .populate({
        path: "items.product",
        model: "Product",
        select: "title price user images",
      })
      .sort({ createdAt: -1 });

    const myOrders = orders.filter(order =>
      order.items.some(item =>
        item.product && item.product.user && item.product.user.toString() === req.user._id.toString()
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
// 3. [BUYER] CHECKOUT
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

    if (deliveryMode === "DELIVERY" && paymentMethod !== "PROMPTPAY") {
      throw new Error("การจัดส่งต้องชำระเงินแบบโอนเท่านั้น");
    }

    const buyerId = req.user.id;

    let subTotal = 0;
    const orderItems = [];
    let sellerId = null;

    for (const item of items) {
      const productData = await Product.findById(item.product).session(session);
      if (!productData) throw new Error("ไม่พบสินค้า");

      if (productData.user.toString() === buyerId.toString()) {
        throw new Error(`ไม่สามารถซื้อสินค้าของตัวเองได้`);
      }

      if (!sellerId) {
        sellerId = productData.user;
      } else if (sellerId.toString() !== productData.user.toString()) {
        throw new Error("ไม่สามารถสั่งซื้อหลายร้านในคำสั่งซื้อเดียวได้");
      }

      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.product, quantity: { $gte: item.quantity } },
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

    let finalDeliveryFee = 0;

    if (deliveryMode === "DELIVERY") {
      const sellerShop = await shop.findOne({ owner: sellerId });

      if (
        shippingAddress?.lat !== undefined &&
        shippingAddress?.lng !== undefined &&
        sellerShop?.location?.lat &&
        sellerShop?.location?.lng
      ) {
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
      } else {
        finalDeliveryFee = 40;
      }
    }

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
        deliveryFee,
        totalPrice,
        couponCode,
        status: initialStatus
      }],
      { session }
    );

    const cart = await Cart.findOne({ user: buyerId }).session(session);

    if (cart) {
      const productIds = items.map(i => new mongoose.Types.ObjectId(i.product));
      cart.items = cart.items.filter(
        item => !productIds.some(id => id.equals(item.product))
      );
      await cart.save({ session });
    }

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

    // 🔥 บันทึก Activity
    await logActivity({
      type: "PAYMENT",
      action: "ADMIN_VERIFY_SLIP",
      description: `แอดมินยืนยันสลิปการชำระเงิน Order #${order._id.toString().slice(-6).toUpperCase()} ยอด ฿${order.totalPrice?.toLocaleString()}`,
      userId: req.user.id,
      relatedId: order._id,
      relatedModel: "Order",
      meta: { totalPrice: order.totalPrice, status: "Paid" }
    });

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

    const order = await Order.findOne({ _id: req.params.id, seller: req.user.id });

    if (!order) return res.status(404).json({ message: "ไม่พบออเดอร์" });
    if (order.deliveryMode !== "DELIVERY") return res.status(400).json({ message: "ออเดอร์นี้ไม่ใช่การจัดส่ง" });
    if (order.status !== "Preparing") return res.status(400).json({ message: "ต้องเตรียมสินค้าก่อน" });

    order.status = "Shipping";
    order.deliveryDetails = { riderName, riderPhone, trackingUrl };
    order.autoReleaseAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await order.save();

    res.json({ success: true, message: "บันทึกข้อมูลไรเดอร์และเริ่มจัดส่งแล้ว", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 8. [BUYER] ยืนยันได้รับสินค้า (Completed)
// ==========================================
router.patch("/:id/complete", protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id, status: "Shipping" });

    if (!order) return res.status(400).json({ message: "ไม่สามารถยืนยันได้" });

    order.status = "Completed";
    order.escrowStatus = "Released";
    order.completedAt = new Date();

    await order.save();

    res.json({ success: true, message: "ยืนยันรับสินค้า เงินถูกปล่อยแล้ว", order });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ==========================================
// [SELLER] รับออเดอร์ / ส่งสินค้า / [BUYER] ยืนยัน
// ==========================================
router.patch("/:id/accept", protect, acceptOrder);
router.patch("/:id/ship", protect, shipOrder);
router.post("/:id/confirm-delivery", protect, confirmDelivery);

// ==========================================
// 9. รายละเอียดออเดอร์เดียว & ยกเลิกออเดอร์
// ==========================================
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate("items.product user");

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

// ==========================================
// [ADMIN] ดึงรายการชำระเงินทั้งหมด
// ==========================================
router.get("/admin/all-payments", protect, async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["WaitingConfirm", "Paid"] }
    })
      .populate("user", "username")
      .populate({
        path: "items.product",
        select: "title price user",
        populate: { path: "user", select: "username" }
      })
      .sort({ updatedAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// ==========================================
// [ADMIN] อนุมัติการชำระเงิน (admin-confirm)
// ==========================================
router.patch("/:id/admin-confirm", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate({ path: "items.product", select: "title", populate: { path: "user", select: "username" } });

    if (!order) return res.status(404).json({ message: "ไม่พบออเดอร์" });

    order.status = "Paid";
    await order.save();

    // 🔥 บันทึก Activity
    const shopName = order.items[0]?.product?.user?.username || "ร้านค้าทั่วไป";
    await logActivity({
      type: "PAYMENT",
      action: "ADMIN_CONFIRM_PAYMENT",
      description: `แอดมินอนุมัติการชำระเงิน Order #${order._id.toString().slice(-6).toUpperCase()} ร้าน: ${shopName} ยอด ฿${order.totalPrice?.toLocaleString()}`,
      userId: req.user.id,
      relatedId: order._id,
      relatedModel: "Order",
      meta: { totalPrice: order.totalPrice, shopName, status: "Paid" }
    });

    res.json({ message: "Updated", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// [ADMIN] รายการที่โอนแล้ว
// ==========================================
router.get("/admin/transferred", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
    }

    const orders = await Order.find({ sellerTransferStatus: "Transferred" })
      .populate({
        path: "items.product",
        populate: { path: "user", select: "username bankAccount" }
      })
      .sort({ sellerTransferredAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// [ADMIN] รายการรอโอนเงิน
// ==========================================
router.get("/admin/pending-transfer", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
    }

    const orders = await Order.find({
      status: "Completed",
      sellerTransferStatus: { $ne: "Transferred" }
    })
      .populate("user", "username")
      .populate({
        path: "items.product",
        select: "title price user",
        populate: { path: "user", select: "username bankAccount" }
      })
      .sort({ completedAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// [ADMIN] โอนเงินให้ร้านค้า
// ==========================================
router.patch("/:id/admin-transfer-seller", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
    }

    const order = await Order.findById(req.params.id)
      .populate({ path: "items.product", select: "title", populate: { path: "user", select: "username bankAccount" } });

    if (!order) return res.status(404).json({ message: "ไม่พบออเดอร์" });
    if (order.status !== "Completed") return res.status(400).json({ message: "ออเดอร์ยังไม่เสร็จสิ้น" });
    if (order.sellerTransferStatus === "Transferred") return res.status(400).json({ message: "โอนเงินไปแล้ว" });

    order.sellerTransferStatus = "Transferred";
    order.sellerTransferredAt = new Date();
    await order.save();

    // 🔥 บันทึก Activity
    const sellerUser = order.items[0]?.product?.user;
    const sellerName = sellerUser?.username || "ไม่ทราบชื่อ";
    const bankInfo = sellerUser?.bankAccount
      ? `${sellerUser.bankAccount.bankName} - ${sellerUser.bankAccount.accountNumber}`
      : "ไม่มีข้อมูลธนาคาร";

    await logActivity({
      type: "PAYMENT",
      action: "ADMIN_TRANSFER_TO_SELLER",
      description: `แอดมินโอนเงินให้ร้าน "${sellerName}" Order #${order._id.toString().slice(-6).toUpperCase()} ยอด ฿${order.totalPrice?.toLocaleString()} | ${bankInfo}`,
      userId: req.user.id,
      relatedId: order._id,
      relatedModel: "Order",
      meta: { totalPrice: order.totalPrice, sellerName, bankInfo }
    });

    res.json({ success: true, message: "โอนเงินให้ร้านเรียบร้อยแล้ว", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;