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

    if (user.boostQuota > 0) {
      user.boostQuota -= 1;
      product.isBoosted = true;
      product.boostExpireAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); 
      
      await user.save();
      await product.save();
      return res.json({ success: true, quotaLeft: user.boostQuota });
    }
    res.status(402).json({ message: "Quota empty" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
};