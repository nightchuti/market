const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const ProfileLog = require("../models/ProfileLog");

const router = express.Router();

/* =====================================================
   1) MULTER CONFIG (จัดการรูปโปรไฟล์)
===================================================== */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "profiles",
    public_id: `profile-${req.user.id}-${Date.now()}`,
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  }),
});

const upload = multer({ storage });

/* =====================================================
   2) GET PRIVATE PROFILE (สำหรับหน้าแก้ไขตัวเอง)
===================================================== */
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =====================================================
   3) GET PUBLIC USER/SHOP DATA (สำหรับหน้า ShopProfile)
===================================================== */
// ใช้ Endpoint นี้เพื่อให้ Frontend เรียกดูโปรไฟล์ร้านค้า/ผู้ขายท่านอื่นได้
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("username email profileImage shopId role bio")
      .populate("shopId");

    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "ไอดีไม่ถูกต้องหรือเกิดข้อผิดพลาด" });
  }
});

/* =====================================================
   4) UPDATE PROFILE
===================================================== */
router.put("/profile", protect, upload.single("profileImage"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

    const { username, phone, gender, bio, birthday } = req.body;
    const changedFields = {};

    if (username || phone) {
      const duplicate = await User.findOne({
        _id: { $ne: user._id },
        $or: [
          ...(username ? [{ username }] : []),
          ...(phone ? [{ phonenumber: phone }] : []),
        ],
      });
      if (duplicate) return res.status(400).json({ message: "ชื่อผู้ใช้หรือเบอร์โทรนี้ถูกใช้งานแล้ว" });
    }

    if (username) { changedFields.username = { from: user.username, to: username }; user.username = username; }
    if (phone) { changedFields.phonenumber = { from: user.phonenumber, to: phone }; user.phonenumber = phone; }
    if (gender !== undefined) user.gender = gender;
    if (bio !== undefined) user.bio = bio;
    if (birthday !== undefined) user.birthday = birthday;

    if (req.file) {
      user.profileImage = req.file.path;
    }

    user.lastProfileUpdate = new Date();
    await ProfileLog.create({ userId: user._id, changedFields });
    await user.save();

    res.json({ message: "อัปเดตข้อมูลสำเร็จ", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
);

/* =====================================================
   5) REGISTER & LOGIN
===================================================== */
router.post("/register", async (req, res) => {
  try {
    const { username, email, phonenumber, password, role } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });

    const userExist = await User.findOne({ email });
    if (userExist)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      phonenumber,
      password: hashedPassword,
      role: role || "nisit"
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Register success",
      token,   // ✅ เพิ่มอันนี้
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      message: "Login success",
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;