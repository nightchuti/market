const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
// ✅ ดึงแบบ Destructuring ให้ตรงกับ middleware/authMiddleware.js
const { protect } = require("../middleware/authMiddleware"); 
const ProfileLog = require("../models/ProfileLog");

const router = express.Router();

/* =====================================================
    1. Config การบันทึกรูปภาพ
===================================================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/profiles/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
});

/* =====================================================
    2. ✅ GET /profile (ดึงข้อมูลทั้งหมด)
===================================================== */
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});

/* =====================================================
    3. ✅ PUT /profile (อัปเดตข้อมูล)
===================================================== */
router.put("/profile", protect, upload.single("profileImage"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

    const { username, phone, gender, bio, birthday } = req.body;
    const changedFields = {};

    // --- ตรวจสอบชื่อซ้ำ / เบอร์ซ้ำ ---
    if (username || phone) {
      const duplicate = await User.findOne({
        _id: { $ne: user._id },
        $or: [
          ...(username ? [{ username }] : []),
          ...(phone ? [{ phonenumber: phone }] : [])
        ],
      });
      if (duplicate) return res.status(400).json({ message: "ชื่อผู้ใช้หรือเบอร์โทรนี้ถูกใช้งานแล้ว" });
    }

    // --- อัปเดตข้อมูล ---
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

    // ===== ลบรูปโปรไฟล์ =====
    if (req.body.removeProfileImage === "true") {
      if (user.profileImage) {
        const oldPath = path.join(__dirname, "..", user.profileImage);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }

        changedFields.profileImage = { from: user.profileImage, to: null };
        user.profileImage = null;
      }
    }


    if (req.file) {
      const imagePath = `/uploads/profiles/${req.file.filename}`;
      changedFields.profileImage = { from: user.profileImage, to: imagePath };
      user.profileImage = imagePath;
      user.lastImageUpdate = new Date();
    }

    user.lastProfileUpdate = new Date();

    // บันทึก Log และข้อมูลผู้ใช้
    await ProfileLog.create({ userId: user._id, changedFields });
    await user.save();

    res.json({ message: "อัปเดตข้อมูลสำเร็จ", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;