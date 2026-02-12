// backend/routes/tradeRoutes.js
const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");

// ตั้งค่า Multer สำหรับอัพโหลดรูป
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // จำกัด 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น'));
        }
    }
});

// Public Routes (ไม่ต้อง login)
router.get("/", tradeController.getOpenTrades);
router.get("/search", tradeController.manualSearch);

// Protected Routes (ต้อง login)
router.post("/", protect, tradeController.createTrade);
router.get("/my-trades", protect, tradeController.getMyTrades);
router.post("/search-image", protect, upload.single("image"), tradeController.searchByImage);
router.post("/:id/match", protect, tradeController.findMatches);
router.patch("/:id/lock-trade", protect, tradeController.lockTrade);
router.post("/:id/verify-location", protect, tradeController.verifyLocation);
router.post("/:id/confirm-swap", protect, tradeController.confirmSwap);
router.delete("/:id/cancel", protect, tradeController.cancelTrade);

module.exports = router;