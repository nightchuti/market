// 📄 routes/couponRoutes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Coupon = require("../models/Coupon");
const CouponUsage = require("../models/CouponUsage");
const ClaimedCoupon = require("../models/ClaimedCoupon");
const { protect } = require("../middleware/authMiddleware");
const logActivity = require("../utils/logActivity"); // 🔥 เพิ่ม

// ================= 1. GET ALL FOR FEED (พร้อมสถานะการเก็บ) =================
router.get("/", protect, async (req, res) => {
  try {
    const userTier = req.user.membershipTier || 'FREE';
    let allowedTiers = ['FREE'];
    if (userTier === 'PRO') allowedTiers.push('PRO');

    const coupons = await Coupon.find({
      isActive: true,
      expireAt: { $gt: new Date() },
      requiredTier: { $in: allowedTiers }
    }).sort({ createdAt: -1 }).lean();

    const myClaimed = await ClaimedCoupon.find({ userId: req.user.id }).select('couponId isUsed');
    const claimedIds = myClaimed.map(c => c.couponId.toString());
    const usedIds = myClaimed.filter(c => c.isUsed).map(c => c.couponId.toString());

    const couponsWithStatus = coupons.map(coupon => ({
      ...coupon,
      isClaimed: claimedIds.includes(coupon._id.toString()),
      isAlreadyUsed: usedIds.includes(coupon._id.toString()),
      isFull: coupon.quotaLimit > 0 && coupon.quotaUsed >= coupon.quotaLimit
    }));

    res.json(couponsWithStatus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= 2. CLAIM COUPON =================
router.post("/claim/:id", protect, async (req, res) => {
  try {
    const couponId = req.params.id;
    const userId = req.user.id;

    const coupon = await Coupon.findOne({ _id: couponId, isActive: true, expireAt: { $gt: new Date() } });
    if (!coupon) return res.status(404).json({ message: "ไม่พบคูปอง หรือคูปองหมดอายุแล้ว" });

    const tierLevels = ['FREE', 'PRO'];
    if (tierLevels.indexOf(req.user.membershipTier || 'FREE') < tierLevels.indexOf(coupon.requiredTier)) {
      return res.status(403).json({ message: `เฉพาะสมาชิกระดับ ${coupon.requiredTier} เท่านั้น` });
    }

    if (coupon.quotaLimit > 0 && coupon.quotaUsed >= coupon.quotaLimit) {
      return res.status(400).json({ message: "คูปองถูกเก็บจนเต็มจำนวนแล้ว" });
    }

    try {
      await ClaimedCoupon.create({ userId, couponId });
      res.json({ success: true, message: "เก็บคูปองลงกระเป๋าสำเร็จ!" });
    } catch (dbErr) {
      if (dbErr.code === 11000) return res.status(400).json({ message: "คุณเก็บคูปองนี้ไปแล้ว" });
      throw dbErr;
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= 3. CHECK PRICE =================
router.post("/check", protect, async (req, res) => {
  try {
    const { code, subTotal } = req.body;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expireAt: { $gt: new Date() }
    });

    if (!coupon) return res.status(404).json({ message: "โค้ดไม่ถูกต้องหรือหมดอายุ" });

    if (coupon.quotaLimit > 0 && coupon.quotaUsed >= coupon.quotaLimit) {
      return res.status(400).json({ message: "คูปองถูกใช้ครบจำนวนแล้ว" });
    }

    const claimData = await ClaimedCoupon.findOne({ userId: req.user.id, couponId: coupon._id });
    if (!claimData) return res.status(400).json({ message: "คุณต้องเก็บคูปองนี้ก่อนใช้งาน" });
    if (claimData.isUsed) return res.status(400).json({ message: "คุณใช้คูปองนี้ไปแล้ว" });

    if (subTotal < coupon.minSpend) {
      return res.status(400).json({ message: `ยอดสั่งซื้อขั้นต่ำ ฿${coupon.minSpend}` });
    }

    let discount = coupon.discountType === 'PERCENT'
      ? (subTotal * coupon.discountValue) / 100
      : coupon.discountValue;

    if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) discount = coupon.maxDiscountAmount;
    if (discount > subTotal) discount = subTotal;

    res.json({ valid: true, discount, finalPrice: subTotal - discount, coupon });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= 4. REDEEM =================
router.post("/redeem", protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { code, subTotal, orderId } = req.body;

    const coupon = await Coupon.findOneAndUpdate(
      { code: code.toUpperCase(), isActive: true, $expr: { $or: [{ $eq: ["$quotaLimit", 0] }, { $lt: ["$quotaUsed", "$quotaLimit"] }] } },
      { $inc: { quotaUsed: 1 } },
      { new: true, session }
    );

    if (!coupon) throw new Error("คูปองไม่ถูกต้องหรือโควตาเต็มแล้ว");

    const updateClaim = await ClaimedCoupon.findOneAndUpdate(
      { userId: req.user.id, couponId: coupon._id, isUsed: false },
      { isUsed: true },
      { session }
    );

    if (!updateClaim) throw new Error("คุณใช้คูปองนี้ไปแล้ว หรือยังไม่ได้เก็บคูปอง");

    let discount = coupon.discountType === 'PERCENT' ? (subTotal * coupon.discountValue) / 100 : coupon.discountValue;
    if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) discount = coupon.maxDiscountAmount;

    await CouponUsage.create([{
      couponId: coupon._id, userId: req.user.id, orderId, discountSnapshot: discount
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

// ================= 5. CREATE (Admin Only) =================
router.post("/", protect, async (req, res) => {
  try {
    const { code, tier, expireAt, discountType, discountValue, quotaLimit, minSpend } = req.body;
    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(400).json({ message: "มีโค้ดนี้ในระบบแล้ว" });

    const coupon = await Coupon.create({
      ...req.body,
      code: code.toUpperCase(),
      requiredTier: tier || 'FREE'
    });

    // 🔥 บันทึก Activity
    const discountLabel = discountType === "PERCENT"
      ? `${discountValue}%`
      : `฿${Number(discountValue).toLocaleString()}`;
    const quotaLabel = quotaLimit > 0 ? `${quotaLimit} สิทธิ์` : "ไม่จำกัด";
    const expireLabel = expireAt ? new Date(expireAt).toLocaleDateString("th-TH") : "-";

    await logActivity({
      type: "COUPON",
      action: "ADMIN_CREATE_COUPON",
      description: `แอดมินสร้างคูปองใหม่ รหัส "${coupon.code}" ส่วนลด ${discountLabel} | โควตา: ${quotaLabel} | หมดอายุ: ${expireLabel} | ระดับ: ${tier || 'FREE'}`,
      userId: req.user.id,
      relatedId: coupon._id,
      relatedModel: "Coupon",
      meta: { code: coupon.code, discountType, discountValue, quotaLimit, minSpend, expireAt, tier }
    });

    res.status(201).json(coupon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= 6. GET MY CLAIMED COUPONS =================
router.get("/my", protect, async (req, res) => {
  try {
    const claimed = await ClaimedCoupon.find({
      userId: req.user.id,
      isUsed: false
    }).populate("couponId");

    const validCoupons = claimed
      .map(c => c.couponId)
      .filter(c => c && c.isActive && c.expireAt > new Date());

    res.json(validCoupons);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;