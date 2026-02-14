const express = require("express");
const router = express.Router();
//const auth = require("../middleware/authMiddleware");
const { protect } = require("../middleware/authMiddleware");;
const {
  initiateNormalChat,
  initiateTradeChat,
  acceptTrade,
  rejectTrade,
  cancelTrade,
  getMessages,
  getMyChats,
  getRoomDetail,
  sendMessage // ✅ เพิ่มตัวนี้เข้ามา
} = require("../controllers/chatController");

// ===== ทุก route ต้อง login ก่อน =====
//router.use(auth);
router.use(protect);

// 1. จัดการรายการห้องแชท
router.get("/", getMyChats); // รายการห้องแชททั้งหมดของเรา

// 2. การเริ่มสร้างห้องแชทใหม่
router.post("/normal", initiateNormalChat); // เริ่มแชทปกติ
router.post("/trade", initiateTradeChat);   // เริ่มแชทเทรด

// 3. จัดการภายในห้องแชท (ใช้ :roomId)
router.get("/:roomId", getRoomDetail);            // ดึงรายละเอียดห้อง
router.get("/:roomId/messages", getMessages);    // ดึงประวัติข้อความ
router.post("/:roomId/messages", sendMessage);   // ✅ ส่งข้อความใหม่ (ยิง API)

// 4. การจัดการสถานะเทรด
router.put("/:roomId/accept", acceptTrade);
router.put("/:roomId/reject", rejectTrade);
router.put("/:roomId/cancel", cancelTrade);

module.exports = router;