const express = require("express");
const router = express.Router();

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

const Membership = require("../models/Membership");
const User = require("../models/User");
const Shop = require("../models/Shop");
const { protect } = require("../middleware/authMiddleware");


// ============================
// ☁️ Cloudinary Config
// ============================
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "membership-slips",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage });


// ============================
// 🟢 สร้างคำขอสมัครสมาชิก (แนบสลิป)
// ============================
router.post("/", protect, upload.single("slip"), async (req, res) => {
  try {
    const { planType } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "กรุณาแนบสลิป" });
    }

    let price = 99;
    let plan = "PRO";

    if (planType === "SINGLE") {
      price = 20;
      plan = "SINGLE";
    }

    const membership = await Membership.create({
      user: req.user.id,
      plan,
      price,
      slip: req.file.path, // ✅ Cloudinary URL
      status: "pending"
    });

    res.json({
      message: "ส่งคำขอสำเร็จ รอแอดมินตรวจสอบ",
      data: membership
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// POST /api/subscription/upgrade
router.post("/upgrade", protect, async (req, res) => {
  try {
    const { planDays, planType } = req.body;
    const userId = req.user.id;

    // 1️⃣ หา Shop
    const shop = await Shop.findOne({ ownerId: userId });
    if (!shop) {
      return res.status(404).json({
        message: "กรุณาสร้างร้านค้าก่อนสมัครสมาชิก"
      });
    }

    // ===============================
    // 🔵 กรณีสมัคร PRO (รายเดือน)
    // ===============================
    if (planType === "PRO") {

      let newExpireDate = new Date();

      if (shop.promotionExpireAt && shop.promotionExpireAt > new Date()) {
        newExpireDate = new Date(shop.promotionExpireAt);
      }

      newExpireDate.setDate(
        newExpireDate.getDate() + parseInt(planDays || 30)
      );

      // อัปเดต Shop
      shop.isPromoted = true;
      shop.promotionTier = "PRO";
      shop.promotionExpireAt = newExpireDate;
      await shop.save();

      // อัปเดต User (+5 boost)
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          membershipTier: "PRO",
          $inc: { boostQuota: 5 }
        },
        { new: true }
      );

      return res.json({
        message: "อัปเกรดเป็น PRO สำเร็จ! ได้รับ Boost 5 ครั้ง",
        expireAt: newExpireDate,
        tier: "PRO",
        currentQuota: updatedUser.boostQuota
      });
    }

    // ===============================
    // 🟢 กรณี Boost รายครั้ง
    // ===============================
    if (planType === "SINGLE") {

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $inc: { boostQuota: 1 }
        },
        { new: true }
      );

      return res.json({
        message: "ซื้อ Boost สำเร็จ +1 ครั้ง",
        tier: updatedUser.membershipTier || "FREE",
        currentQuota: updatedUser.boostQuota
      });
    }

    // ===============================
    // ❌ ถ้า planType ไม่ถูกต้อง
    // ===============================
    return res.status(400).json({
      message: "ประเภทแพ็กเกจไม่ถูกต้อง"
    });

  } catch (error) {
    res.status(500).json({
      message: "เกิดข้อผิดพลาด: " + error.message
    });
  }
});

// ============================
// 🟡 อนุมัติ (Manual Approve)
// ============================
router.post("/approve/:id", async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id);
    if (!membership) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    membership.status = "approved";
    await membership.save();

    const user = await User.findById(membership.user);

    if (membership.plan === "PRO") {
      user.membershipTier = "PRO";
      user.boostQuota += 5;
      user.premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    if (membership.plan === "SINGLE") {
      user.boostQuota += 1;
    }

    await user.save();

    res.json({ message: "อนุมัติสำเร็จ" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET pending memberships (Admin)
router.get("/admin/memberships", protect, async (req, res) => {
  try {
    const memberships = await Membership.find()
      .populate("user", "email")
      .sort({ createdAt: -1 });

    res.json(memberships);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;