const express = require("express");
const router = express.Router();

const Coupon = require("../models/Coupon");
const protect = require("../middleware/authMiddleware");

// ================= CREATE COUPON (Admin) =================
router.post("/", protect, async (req, res) => {
  try {
    const {
      code,
      discountPercent,
      discountAmount,
      freeShipping,
      minSpend,
      maxUse,
      expireAt
    } = req.body;

    // ตรวจสอบว่า code ซ้ำหรือไม่
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountPercent: discountPercent || 0,
      discountAmount: discountAmount || 0,
      freeShipping: freeShipping || false,
      minSpend: minSpend || 0,
      maxUse: maxUse || 0,
      expireAt
    });

    res.status(201).json(coupon);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ================= GET ALL COUPONS =================
router.get("/", protect, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= MY COUPONS (ที่ยังใช้ได้) =================
router.get("/my", protect, async (req, res) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      expireAt: { $gt: new Date() },
      usedBy: { $ne: req.user.id }
    });

    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= USED COUPONS =================
router.get("/used", protect, async (req, res) => {
  try {
    const coupons = await Coupon.find({
      usedBy: req.user.id
    });

    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= CHECK COUPON =================
router.post("/check", protect, async (req, res) => {
  try {
    const { code, subTotal } = req.body;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expireAt: { $gt: new Date() }
    });

    if (!coupon)
      return res.status(400).json({ message: "Invalid coupon" });

    // เคยใช้แล้ว
    if (coupon.usedBy.includes(req.user.id))
      return res.status(400).json({ message: "Already used" });

    // จำกัดจำนวนรวม
    if (coupon.maxUse > 0 && coupon.usedBy.length >= coupon.maxUse)
      return res.status(400).json({ message: "Coupon fully redeemed" });

    if (subTotal < coupon.minSpend)
      return res.status(400).json({ message: `Minimum spend is ${coupon.minSpend} baht` });

    let discount = 0;

    if (coupon.discountPercent > 0)
      discount = subTotal * coupon.discountPercent / 100;

    if (coupon.discountAmount > 0)
      discount = coupon.discountAmount;

    res.json({
      couponId: coupon._id,
      code: coupon.code,
      discount,
      freeShipping: coupon.freeShipping
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= UPDATE COUPON =================
router.put("/:id", protect, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= DELETE COUPON =================
router.delete("/:id", protect, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json({ message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;