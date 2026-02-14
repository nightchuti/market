const Product = require("../models/Product");
const User = require("../models/User");

// 1. ดึงสินค้าทั้งหมดพร้อมแทรกโฆษณาเนียนๆ
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
    // แยกสินค้า Boost (ที่ยังไม่หมดอายุ) และสินค้าปกติ
    const boosted = allItems.filter(p => p.isBoosted && p.boostExpireAt && new Date(p.boostExpireAt) > now)
                            .sort(() => 0.5 - Math.random()); 
    const regular = allItems.filter(p => !p.isBoosted || !p.boostExpireAt || new Date(p.boostExpireAt) <= now);

    // จำลองข้อมูลโฆษณาร้านอาหาร (Native Ads)
    const nativeAds = [
      { _id: "ad_1", isAds: true, name: "กะเพราป้าใจ ประตู 3", imageUrl: "https://via.placeholder.com/300x200", price: "เริ่มต้น 40.-", location: "หลัง มก." }
    ];

    let mixed = [];
    let bIdx = 0, rIdx = 0;
    while (bIdx < boosted.length || rIdx < regular.length) {
      if (bIdx < boosted.length) mixed.push(boosted[bIdx++]);
      for (let i = 0; i < 3 && rIdx < regular.length; i++) {
        mixed.push(regular[rIdx++]);
        // แทรก Ads ทุกครั้งที่สินค้าปกติครบ 6 ชิ้น
        if (mixed.length % 6 === 0 && nativeAds.length > 0) {
          mixed.push({...nativeAds[0], _id: `ad_index_${mixed.length}`});
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
      product.boostExpireAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // บูส 3 วัน
      
      await user.save();
      await product.save();
      return res.json({ success: true, quotaLeft: user.boostQuota });
    }

    // ถ้าโควตาหมด ส่ง 402 เพื่อให้หน้าบ้านพาไปหน้าชำระเงิน 20 บาท
    res.status(402).json({ message: "Quota empty" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
};