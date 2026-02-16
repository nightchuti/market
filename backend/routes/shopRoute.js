const express = require("express");
const router = express.Router();
const shop = require("../models/Shop"); // ตรวจสอบตัวพิมพ์เล็ก/ใหญ่ให้ตรงกับไฟล์จริง
const { protect } = require("../middleware/authMiddleware");// *ต้องมี

// ================= 1. CREATE SHOP (สร้างร้านค้า) =================
// ต้อง Login ก่อนถึงจะสร้างได้
router.post("/", protect, async (req, res) => {
  try {
    const user = req.user;

    // 1. เช็คว่าคนนี้มีร้านอยู่แล้วหรือยัง? (1 User = 1 Shop)
    const existingshop = await shop.findOne({ ownerId: user.id });
    if (existingshop) {
      return res.status(400).json({ message: "You already have a shop." });
    }

    // 2. รับค่าเฉพาะที่จำเป็น (ป้องกันคนแอบยิง field 'isPromoted' มาเอง)
    const { name, lat, lng, address, description, shopUrl } = req.body;

    // 3. สร้างร้าน (ผูก ownerId อัตโนมัติ)
    const newShop = await shop.create({
      ownerId: user.id, // *สำคัญมาก
      name,
      lat,
      lng,
      address,
      description,
      shopUrl,
      // ค่า Default ของ isPromoted จะเป็น false เองตาม Model
    });

    user.shopId = shop._id;
    await user.save();
    res.status(201).json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= 2. GET MY SHOP (สำหรับเจ้าของร้านดู) =================
// เอาไว้โชว์หน้า Dashboard ของตัวเอง
router.get("/my-shop", protect, async (req, res) => {
  try {
    const shop = await Shop.findOne({ ownerId: req.user.id });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found. Please create one." });
    }

    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= 3. GET FEED (สำหรับลูกค้าทั่วไปดู) =================
// ดึงร้านที่ "ยิงแอด" (Promoted) มาโชว์ก่อน
router.get("/feed", async (req, res) => {
  try {
    // Logic: ร้านจ่ายเงิน (Promoted) + ยังไม่หมดอายุ
    const shops = await Shop.find({
      isPromoted: true,
      promotionExpireAt: { $gt: new Date() }
    })
      .select("name bannerImage shopUrl description lat lng") // เลือกฟิลด์ที่จะโชว์
      .limit(20) // จำกัดจำนวน
      .sort({ promotionTier: 1, updatedAt: -1 }); // เรียงตามความแพงของแพ็กเกจ

    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= 4. UPDATE SHOP (แก้ไขข้อมูลร้าน) =================
router.put("/", protect, async (req, res) => {
  try {
    const { name, description, address, lat, lng, bannerImage, shopUrl } = req.body;

    // อัปเดตเฉพาะข้อมูลทั่วไป (ห้ามอัปเดตสถานะ isPromoted ตรงนี้ ต้องผ่าน API จ่ายเงินเท่านั้น)
    const shop = await Shop.findOneAndUpdate(
      { ownerId: req.user.id },
      {
        name, description, address, lat, lng, bannerImage, shopUrl
      },
      { new: true }
    );

    if (!shop) return res.status(404).json({ message: "Shop not found" });

    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ================= 5. GET SHOP BY ID (สำหรับโชว์หน้า Detail) =================
router.get("/:id", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .select("name bannerImage shopUrl description lat lng ownerId")
      .populate("ownerId", "username email profileImage"); // ดึงข้อมูลเจ้าของร้านมาด้วย    
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




module.exports = router;