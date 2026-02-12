const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const protect = require("../middleware/authMiddleware");

router.post("/initiate", protect, chatController.initiateChat); // กดทักแชท
router.get("/:roomId/messages", protect, chatController.getMessages); // ดึงประวัติ
router.get("/my-chats", protect, chatController.getMyChats); // หน้ารายการแชท

module.exports = router;