const Product = require("../models/Product");
const User = require("../models/User");
const Ad = require("../models/Ad");

// 1. ดึงสินค้าทั้งหมดพร้อมแทรกโฆษณา
exports.getAllProducts = async (req, res) => {
  try {
    const { search, category, tradeOption, page = 1, limit = 8 } = req.query;
    const skip = (page - 1) * limit;

    let query = { isActive: true, status: "available" };
    if (search) query.$text = { $search: search };
    if (category) query.category = category;
    if (tradeOption) query.tradeOption = tradeOption;

    const allItems = await Product.find(query).populate("user", "username").sort({ createdAt: -1 });

    const now = new Date();
    // แยกสินค้า Boost และสินค้าปกติ
    const boosted = allItems.filter(p => p.isBoosted && p.boostExpireAt && new Date(p.boostExpireAt) > now)
                           .sort(() => 0.5 - Math.random()); 
    const regular = allItems.filter(p => !p.isBoosted || !p.boostExpireAt || new Date(p.boostExpireAt) <= now);

    // ✅ ดึงโฆษณาจริงจากหน้า Admin
    const realAds = await Ad.find().limit(5).lean();
    const formattedAds = realAds.map(ad => ({ ...ad, isAds: true }));

    let mixed = [];
    let bIdx = 0, rIdx = 0, adIdx = 0;
    while (bIdx < boosted.length || rIdx < regular.length) {
      if (bIdx < boosted.length) mixed.push(boosted[bIdx++]);
      for (let i = 0; i < 3 && rIdx < regular.length; i++) {
        mixed.push(regular[rIdx++]);
        if (mixed.length % 6 === 0 && formattedAds.length > 0) {
          const currentAd = formattedAds[adIdx % formattedAds.length];
          mixed.push({...currentAd, _id: `ad_pos_${mixed.length}_${currentAd._id}`});
          adIdx++;
        }
      }
    }

    const result = mixed.slice(skip, skip + Number(limit));

    res.json({
      products: result,
      pagination: { total: mixed.length, page: Number(page), pages: Math.ceil(mixed.length / limit) }
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 2. ฟังก์ชันกดใช้สิทธิ์ Boost
exports.activateBoost = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const product = await Product.findById(req.params.productId);

    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });

    // ✅ 1. เช็คว่าเป็นเจ้าของสินค้าจริงไหม
    if (product.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์บูสสินค้าชิ้นนี้" });
    }

    // ✅ 2. เช็คว่าสินค้ากำลังบูสอยู่หรือไม่ (ถ้ายังไม่หมดอายุ ไม่ต้องให้บูสซ้ำ)
    if (product.isBoosted && new Date(product.boostExpireAt) > new Date()) {
      return res.status(400).json({ message: "สินค้านี้กำลังถูกบูสอยู่แล้ว" });
    }

    if (user.boostQuota > 0) {
      user.boostQuota -= 1;
      product.isBoosted = true;
      product.boostExpireAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); 
      
      await user.save();
      await product.save();
      return res.json({ success: true, quotaLeft: user.boostQuota });
    }
    res.status(402).json({ message: "โควตาของคุณหมดแล้ว กรุณาสมัครเพิ่ม" });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด" });
  }
};

// เพิ่ม/แก้ไข ฟังก์ชันใน Backend Controller ของคุณ
exports.createProduct = async (req, res) => {
  try {
    const { 
      title, description, price, category, quantity, 
      deliveryType, tradeOption, locationName, meetupAddress,
      wantedCategory, wantedKeywords // ✅ รับค่าที่ส่งมาจาก AddProduct
    } = req.body;

    const productData = {
      user: req.user.id,
      title,
      description,
      price: tradeOption === "trade_allowed" ? 0 : Number(price),
      category,
      quantity: Number(quantity),
      deliveryType,
      tradeOption,
      locationName,
      meetupAddress,
      wantedCategory, // ✅ บันทึกหมวดหมู่ที่อยากได้
      // ✅ แปลง Tag จาก String "A,B,C" กลับเป็น Array ["A","B","C"]
      wantedKeywords: wantedKeywords ? wantedKeywords.split(",") : [],
      
      // ✅ จัดการรูปหลักสินค้า
      images: req.files && req.files['images'] 
        ? req.files['images'].map(f => `/uploads/${f.filename}`) 
        : [],

      // ✅ จัดการรูปสินค้าที่อยากได้ (Wanted Images)
      wantedImages: req.files && req.files['wantedImages'] 
        ? req.files['wantedImages'].map(f => `/uploads/${f.filename}`) 
        : []
    };

    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ไม่สามารถบันทึกสินค้าได้" });
  }
};

// ================= GET MY TRADE PRODUCTS =================
exports.getMyTradeProducts = async (req, res) => {
  try {
    const products = await Product.find({
      user: req.user.id, // ใช้ id ให้ตรงกับ middleware protect
      tradeOption: { $ne: "sell_only" },
      status: "available"
    }).sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};