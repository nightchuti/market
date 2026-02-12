const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  initiateNormalChat,
  initiateTradeChat,
  acceptTrade,
  rejectTrade,
  cancelTrade,
  getMessages,
  getMyChats,
  getRoomDetail
} = require("../controllers/chatController");

// ===== ทุก route ต้อง login ก่อน =====
router.use(auth);

// รายการห้องแชทของฉัน
router.get("/", getMyChats);

// เริ่มแชทปกติ (สอบถามสินค้า)
router.post("/normal", initiateNormalChat);

// เริ่มแชทเทรด (ล็อคสินค้าทันที)
router.post("/trade", initiateTradeChat);

// รายละเอียดห้อง
router.get("/:roomId", getRoomDetail);

// ข้อความในห้อง
router.get("/:roomId/messages", getMessages);

// การจัดการเทรด
router.put("/:roomId/accept", acceptTrade);
router.put("/:roomId/reject", rejectTrade);
router.put("/:roomId/cancel", cancelTrade);

module.exports = router;