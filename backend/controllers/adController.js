const Ad = require("../models/Ad");
const logActivity = require("../utils/logActivity"); // 🔥 เพิ่ม

// ✅ แอดมินสร้างโฆษณาเอง
exports.createAdByAdmin = async (req, res) => {
  try {
    const { shopName, description, imageUrl, location, priceRange, link, days } = req.body;

    const newAd = new Ad({
      shopName,
      description,
      imageUrl,
      location,
      priceRange,
      link,
      expireAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    });

    await newAd.save();

    // 🔥 บันทึก Activity
    await logActivity({
      type: "ADS",
      action: "ADMIN_CREATE_AD",
      description: `แอดมินสร้างโฆษณาใหม่ ร้าน "${shopName}" สถานที่: ${location || "-"} แสดงผล ${days} วัน`,
      userId: req.user?.id || null,
      relatedId: newAd._id,
      relatedModel: "Ad",
      meta: { shopName, location, priceRange, days, link }
    });

    res.status(201).json({ message: "ยิง Ads ขึ้นระบบสำเร็จ!", ad: newAd });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสร้างโฆษณา" });
  }
};

// ✅ ดึงโฆษณาที่มีอยู่ไปโชว์
exports.getActiveAds = async (req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: "โหลดโฆษณาไม่สำเร็จ" });
  }
};