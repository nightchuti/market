const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const ProfileLog = require("../models/ProfileLog");

const router = express.Router();

/* =====================================================
   Upload Config
===================================================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/profiles/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
});

/* =====================================================
   PUT /profile
===================================================== */
router.put(
  "/profile",
  protect,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

      const now = Date.now();

      /* ==============================
         ⏳ RATE LIMIT
      ============================== */
      if (
        user.lastProfileUpdate &&
        now - new Date(user.lastProfileUpdate) < 30 * 24 * 60 * 60 * 1000
      ) {
        return res.status(429).json({
          message: "สามารถแก้ไขข้อมูลได้ทุก 30 วัน",
        });
      }

      if (
        req.file &&
        user.lastImageUpdate &&
        now - new Date(user.lastImageUpdate) < 14 * 24 * 60 * 60 * 1000
      ) {
        return res.status(429).json({
          message: "สามารถเปลี่ยนรูปได้ทุก 14 วัน",
        });
      }

      /* ==============================
         🔐 VALIDATION
      ============================== */
      const { username, phone, gender, bio, birthday } = req.body;

      if (username && username.length < 3) {
        return res
          .status(400)
          .json({ message: "username ต้องอย่างน้อย 3 ตัวอักษร" });
      }

      if (phone && !/^[0-9]{10}$/.test(phone)) {
        return res
          .status(400)
          .json({ message: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก" });
      }

      /* ==============================
         🚫 DUPLICATE CHECK
      ============================== */
      if (username || phone) {
        const duplicate = await User.findOne({
          _id: { $ne: user._id },
          $or: [{ username }, { phonenumber: phone }],
        });

        if (duplicate) {
          return res.status(400).json({
            message: "ชื่อผู้ใช้หรือเบอร์โทรนี้ถูกใช้งานแล้ว",
          });
        }
      }

      /* ==============================
         📝 UPDATE
      ============================== */
      const changedFields = {};

      if (username) {
        changedFields.username = { from: user.username, to: username };
        user.username = username;
      }

      if (phone) {
        changedFields.phonenumber = { from: user.phonenumber, to: phone };
        user.phonenumber = phone;
      }

      if (gender !== undefined) user.gender = gender;
      if (bio !== undefined) user.bio = bio;
      if (birthday !== undefined) user.birthday = birthday;

      if (req.file) {
        const imagePath = `/uploads/profiles/${req.file.filename}`;
        changedFields.profileImage = {
          from: user.profileImage,
          to: imagePath,
        };
        user.profileImage = imagePath;
        user.lastImageUpdate = new Date();
      }

      user.lastProfileUpdate = new Date();

      /* ==============================
         💾 SAVE
      ============================== */
      await ProfileLog.create({
        userId: user._id,
        changedFields,
      });

      await user.save();

      res.json({
        message: "อัปเดตข้อมูลสำเร็จ",
        user,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
