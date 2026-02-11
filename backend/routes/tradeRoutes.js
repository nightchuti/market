const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", protect, tradeController.createTrade);
router.get("/", protect, tradeController.getOpenTrades);
router.post("/search-image", protect, upload.single("image"), tradeController.searchByImage);
router.post("/:id/match", protect, tradeController.findMatches);
router.patch("/:id/lock-trade", protect, tradeController.lockTrade);
router.post("/:id/confirm-swap", protect, tradeController.confirmSwap);

module.exports = router;