const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // ✅ เพิ่มตรงนี้
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const ProfileLog = require("../models/ProfileLog");
const router = express.Router();

// ✅ 1. ตั้งค่า Storage พร้อมเช็คโฟลเดอร์
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/profiles/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 } 
});

router.put("/profile", protect, upload.single("profileImage"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });

    // ✅ เก็บข้อมูลเก่าไว้ก่อนอัปเดตเพื่อใช้เปรียบเทียบ
    const oldData = {
      username: user.username,
      phone: user.phonenumber, // Mapping field ชื่อไม่เหมือนกัน
      gender: user.gender,
      bio: user.bio,
      birthday: user.birthday,
      profileImage: user.profileImage
    };

    // ✅ ตรวจสอบและบันทึกค่าที่เปลี่ยนลงใน Object
    const changedFields = {};

    // เช็คข้อความทั่วไป
    const fieldsToUpdate = {
      username: req.body.username,
      phone: req.body.phone, // จาก Frontend
      gender: req.body.gender,
      bio: req.body.bio,
      birthday: req.body.birthday
    };

    for (let key in fieldsToUpdate) {
      const newValue = fieldsToUpdate[key];
      const oldValue = oldData[key];

      // ถ้ามีการส่งค่ามา และค่าไม่เหมือนเดิม
      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key] = { from: oldValue, to: newValue };
        
        // อัปเดตค่าเข้า User Object
        if (key === 'phone') user.phonenumber = newValue;
        else user[key] = newValue;
      }
    }

    // ✅ เช็ครูปภาพ
    if (req.file) {
      const newImagePath = `/uploads/profiles/${req.file.filename}`;
      changedFields.profileImage = { from: oldData.profileImage, to: newImagePath };
      
      // ลบรูปเก่า (ถ้ามี) เพื่อประหยัดพื้นที่
      if (oldData.profileImage && fs.existsSync(path.join(__dirname, '..', oldData.profileImage))) {
        // fs.unlinkSync(path.join(__dirname, '..', oldData.profileImage)); // เปิดใช้งานเมื่อมั่นใจ
      }
      
      user.profileImage = newImagePath;
      user.lastImageUpdate = new Date();
    }

    // ✅ ถ้ามีการเปลี่ยนแปลงจริงๆ ให้บันทึก Log และ Update
    if (Object.keys(changedFields).length > 0) {
      await ProfileLog.create({
        userId: user._id,
        changedFields: changedFields
      });

      user.lastProfileUpdate = new Date();
      await user.save();
      return res.json({ message: "อัปเดตสำเร็จและบันทึกประวัติแล้ว", user });
    }

    res.json({ message: "ไม่มีข้อมูลที่เปลี่ยนแปลง", user });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// --- เพิ่ม API สำหรับดึงประวัติการแก้ไขมาดู ---
router.get("/profile/logs", protect, async (req, res) => {
  try {
    const logs = await ProfileLog.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;