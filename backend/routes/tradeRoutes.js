// backend/routes/tradeRoutes.js

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const tradeController = require("../controllers/tradeController");
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");


// ✅ Validate ObjectId middleware
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }
  next();
};


// ✅ Secure multer config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files allowed"), false);
    } else {
      cb(null, true);
    }
  }
});


// =======================
// PUBLIC ROUTES
// =======================

router.get("/", tradeController.getOpenTrades);
router.get("/search", tradeController.manualSearch);


// =======================
// PROTECTED ROUTES
// =======================

router.post("/", protect, tradeController.createTrade);

router.get("/my-trades", protect, tradeController.getMyTrades);

router.post(
  "/search-image",
  protect,
  upload.single("image"),
  tradeController.searchByImage
);

// 🔥 ใช้ GET สำหรับ match
router.get(
  "/:id/match",
  protect,
  validateObjectId,
  tradeController.findMatches
);

router.put(
  "/:id/lock",
  protect,
  validateObjectId,
  tradeController.lockTrade
);

router.put(
  "/:id/confirm",
  protect,
  validateObjectId,
  tradeController.confirmSwap
);

router.delete(
  "/:id/cancel",
  protect,
  validateObjectId,
  tradeController.cancelTrade
);

router.put(
  "/:id/accept",
  protect,
  validateObjectId,
  tradeController.acceptMatch
);

module.exports = router;