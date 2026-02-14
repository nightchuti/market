const express = require("express");
const router = express.Router();
const adController = require("../controllers/adController");
const { protect, admin } = require("../middleware/authMiddleware");

// เปลี่ยนจาก /request เป็น /create-direct (ใช้เฉพาะแอดมิน)
router.post("/create-direct", protect, admin, adController.createAdByAdmin);

// ดึงโฆษณาไปโชว์หน้า AllProducts (เปิด public)
router.get("/active", adController.getActiveAds);

module.exports = router;