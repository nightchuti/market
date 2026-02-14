const express = require("express");
const router = express.Router();
const Shop = require("../models/shop");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// POST /api/subscription/upgrade
router.post("/upgrade", protect, async (req, res) => {
  try {
    const { planDays, planType } = req.body; // รับค่า: 30 วัน, 'PREMIUM'
    const user = req.user;

    // 1. หา Shop ของ User คนนี้
    const shop = await Shop.findOne({ ownerId: user.id });
    if (!shop) return res.status(404).json({ message: "Please create a shop first" });

    // --- ตรงนี้คือจุดเชื่อม Payment Gateway (Stripe/Omise) ---
    // สมมติว่าจ่ายเงินสำเร็จแล้ว...
    
    // 2. คำนวณวันหมดอายุใหม่
    let newExpireDate = new Date();
    
    // ถ้าของเดิมยังไม่หมดอายุ ให้บวกเพิ่มจากวันเดิม (Extend)
    if (shop.promotionExpireAt && shop.promotionExpireAt > new Date()) {
      newExpireDate = new Date(shop.promotionExpireAt);
    }
    
    // บวกจำนวนวันที่ซื้อเพิ่ม
    newExpireDate.setDate(newExpireDate.getDate() + parseInt(planDays));

    // 3. อัปเดต Shop (เพื่อให้ร้านขึ้น Feed)
    shop.isPromoted = true;
    shop.promotionTier = planType || 'PREMIUM';
    shop.promotionExpireAt = newExpireDate;
    await shop.save();

    // 4. อัปเดต User (เพื่อให้เจ้าของได้คูปองเทพ)
    await User.findByIdAndUpdate(user.id, { membershipTier: 'PRO' });

    res.json({ 
      message: "Upgrade success!", 
      expireAt: newExpireDate,
      tier: 'PRO'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;