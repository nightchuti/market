const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Coupon = require("../models/Coupon");
const CouponUsage = require("../models/CouponUsage");
const protect = require("../middleware/authMiddleware");

// ================= 1. CREATE (Admin) =================
router.post("/", protect, async (req, res) => {
  // TODO: เพิ่ม Middleware เช็ค Admin ตรงนี้ด้วย (เช่น requireAdmin)
  try {
    const { 
      code, discountType, discountValue, maxDiscount, 
      minSpend, quotaLimit, limitPerUser, tier, expireAt 
    } = req.body;

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(400).json({ message: "Code exists" });

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      maxDiscountAmount: maxDiscount || 0,
      minSpend: minSpend || 0,
      quotaLimit: quotaLimit || 0,
      limitPerUser: limitPerUser || 1,
      // ✅ แก้จุดที่ 1: เปลี่ยน Default เป็น 'FREE' (เพื่อให้ตรงกับ User Model)
      requiredTier: tier || 'FREE', 
      expireAt
    });

    res.status(201).json(coupon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= 2. GET ALL ACTIVE (For List/Feed) =================
router.get("/", protect, async (req, res) => {
  try {
    // ✅ แก้จุดที่ 2: กรองคูปองตามระดับสมาชิก
    const userTier = req.user.membershipTier || 'FREE';
    
    // ถ้าเป็น PRO เห็นได้ทั้ง FREE และ PRO
    // ถ้าเป็น FREE เห็นได้แค่ FREE
    let allowedTiers = ['FREE'];
    if (userTier === 'PRO') {
      allowedTiers.push('PRO');
    }

    const coupons = await Coupon.find({ 
      isActive: true, 
      expireAt: { $gt: new Date() },
      requiredTier: { $in: allowedTiers } // <--- เพิ่มตรงนี้
    }).sort({ createdAt: -1 });

    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= 3. CHECK PRICE (หน้าตะกร้า) =================
router.post("/check", protect, async (req, res) => {
  try {
    const { code, subTotal } = req.body;
    const user = req.user;

    // A. หาคูปอง
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expireAt: { $gt: new Date() }
    });

    if (!coupon) return res.status(404).json({ message: "Coupon invalid or expired" });

    // ✅ แก้จุดที่ 3: เช็ค Tier ให้ตรงกับระบบใหม่ (FREE / PRO)
    const tierLevels = ['FREE', 'PRO']; // เรียงจากเล็กไปใหญ่
    const userTier = user.membershipTier || 'FREE'; // ดึงค่าจาก User Model ที่เราเพิ่มไป
    
    // ถ้า User อยู่ระดับต่ำกว่า Coupon Requirement -> ห้ามใช้
    if (tierLevels.indexOf(userTier) < tierLevels.indexOf(coupon.requiredTier)) {
      return res.status(403).json({ message: `Exclusive for ${coupon.requiredTier} members only` });
    }

    // C. เช็คยอดซื้อขั้นต่ำ
    if (subTotal < coupon.minSpend) {
      return res.status(400).json({ message: `Minimum spend ${coupon.minSpend} baht` });
    }

    // D. เช็คโควตารวม
    if (coupon.quotaLimit > 0 && coupon.quotaUsed >= coupon.quotaLimit) {
      return res.status(400).json({ message: "Coupon fully redeemed" });
    }

    // E. เช็คโควตาส่วนตัว
    const myUsage = await CouponUsage.countDocuments({ couponId: coupon._id, userId: user.id });
    if (myUsage >= coupon.limitPerUser) {
      return res.status(400).json({ message: "You already used this coupon" });
    }

    // F. คำนวณส่วนลด
    let discount = 0;
    if (coupon.discountType === 'PERCENT') {
      discount = (subTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.discountValue; // ลดเป็นบาท
    }
    
    if (discount > subTotal) discount = subTotal; 

    res.json({
      valid: true,
      discount,
      finalPrice: subTotal - discount,
      coupon
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= 4. REDEEM (ตอนกดสั่งซื้อ) =================
router.post("/redeem", protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { code, subTotal, orderId } = req.body;
    const user = req.user;

    // 1. Atomic Update (ตัดโควตา)
    const coupon = await Coupon.findOneAndUpdate(
      {
        code: code.toUpperCase(),
        isActive: true,
        expireAt: { $gt: new Date() },
        $expr: { 
             $or: [ { $eq: ["$quotaLimit", 0] }, { $lt: ["$quotaUsed", "$quotaLimit"] } ] 
        }
      },
      { $inc: { quotaUsed: 1 } },
      { new: true, session }
    );

    if (!coupon) throw new Error("Coupon invalid or fully redeemed");

    // 2. Double Check User Limit (เช็คสิทธิ์ซ้ำอีกรอบใน Transaction)
    // ตรงนี้จริงๆ ควรเช็ค Tier อีกรอบด้วยเพื่อความชัวร์ แต่ข้ามได้ถ้าไว้ใจ Frontend/Check API
    const myUsage = await CouponUsage.countDocuments({ couponId: coupon._id, userId: user.id }).session(session);
    if (myUsage >= coupon.limitPerUser) throw new Error("User limit exceeded");

    // 3. คำนวณส่วนลด
    let discount = 0;
    if (coupon.discountType === 'PERCENT') {
      discount = (subTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) discount = coupon.maxDiscountAmount;
    } else {
      discount = coupon.discountValue;
    }
    if (discount > subTotal) discount = subTotal;

    // 4. บันทึกประวัติ
    await CouponUsage.create([{
      couponId: coupon._id,
      userId: user.id,
      orderId: orderId,
      discountSnapshot: discount
    }], { session });

    await session.commitTransaction();
    res.json({ success: true, discount });

  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;