const express = require("express");
const router = express.Router();
const Shop = require("../models/Shop");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// POST /api/subscription/upgrade (สมัครสมาชิก 99.-)
router.post("/upgrade", protect, async (req, res) => {
  try {
    const { planDays, planType } = req.body; 
    const userId = req.user.id;

    // 1. หา Shop ของ User คนนี้
    const shop = await Shop.findOne({ ownerId: userId });
    if (!shop) return res.status(404).json({ message: "กรุณาสร้างร้านค้าก่อนสมัครสมาชิก PRO" });

    // --- LOGIC การชำระเงิน (สมมติว่าผ่านแล้ว) ---

    // 2. คำนวณวันหมดอายุของสมาชิก PRO
    let newExpireDate = new Date();
    if (shop.promotionExpireAt && shop.promotionExpireAt > new Date()) {
      newExpireDate = new Date(shop.promotionExpireAt);
    }
    newExpireDate.setDate(newExpireDate.getDate() + parseInt(planDays || 30));

    // 3. อัปเดตข้อมูล Shop
    shop.isPromoted = true;
    shop.promotionTier = planType || 'PRO';
    shop.promotionExpireAt = newExpireDate;
    await shop.save();

    // 4. อัปเดต User: เปลี่ยน Tier และ "เติมโควตาบูส" (Boost Quota)
    // สมมติว่า 99.- ได้บูส 5 ครั้ง หรือ 10 ครั้ง ตามที่คุณต้องการ
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { 
        membershipTier: 'PRO',
        $inc: { boostQuota: 5 } // ✅ ใช้ $inc เพื่อบวกเพิ่มจากของเดิมที่มีอยู่
      },
      { new: true }
    );

    res.json({ 
      message: "อัปเกรดเป็น PRO สำเร็จ! คุณได้รับสิทธิ์บูสสินค้าเพิ่ม 5 ครั้ง", 
      expireAt: newExpireDate,
      tier: 'PRO',
      currentQuota: updatedUser.boostQuota // ส่งค่าปัจจุบันกลับไปอัปเดตหน้า UI
    });

  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด: " + error.message });
  }
});

module.exports = router;