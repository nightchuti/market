const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  sendTradeRequest,
  acceptTrade,
  rejectTrade
} = require("../controllers/messageController");

router.post("/trade-request", protect, sendTradeRequest);
router.post("/trade-accept", protect, acceptTrade);
router.post("/trade-reject", protect, rejectTrade);

module.exports = router;
