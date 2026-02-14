const Ad = require("../models/Ad");

// ✅ แอดมินสร้างโฆษณาเอง (หลังจากคุยหลังบ้าน)
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
      // คำนวณวันหมดอายุตามที่แอดมินระบุ (เช่น 7 วัน, 30 วัน)
      expireAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000) 
    });

    await newAd.save();
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