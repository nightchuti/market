// backend/routes/tradeRoutes.js
const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Public
router.get("/", tradeController.getOpenTrades);
router.get("/search", tradeController.manualSearch);

// Protected
router.post("/", protect, tradeController.createTrade);
router.get("/my-trades", protect, tradeController.getMyTrades);

router.post("/search-image", protect, upload.single("image"), tradeController.searchByImage);

router.post("/:id/match", protect, tradeController.findMatches);
router.put("/:id/lock", protect, tradeController.lockTrade);
router.post("/:id/verify", protect, tradeController.verifyLocation);
router.put("/:id/confirm", protect, tradeController.confirmSwap);
router.delete("/:id/cancel", protect, tradeController.cancelTrade);

module.exports = router;