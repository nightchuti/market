const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit"); // 🔒 เพิ่ม

const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const ProfileLog = require("../models/ProfileLog");

const router = express.Router();

/* =====================================================
   🔒 RATE LIMITER (เพิ่ม)
===================================================== */
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5,                    // สมัครได้ไม่เกิน 5 ครั้ง / IP
  message: { message: "สมัครบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่" },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 10,                   // Login ได้ไม่เกิน 10 ครั้ง / IP
  message: { message: "เข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่" },
});

/* =====================================================
   🔒 VALIDATION HELPERS (เพิ่ม)
===================================================== */
const isValidEmail     = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidPhone     = (v) => /^0[0-9]{9}$/.test(v);
const isValidUsername  = (v) => /^[a-zA-Z0-9_]{3,20}$/.test(v);
const isStrongPassword = (v) =>
  v.length >= 8 &&
  /[A-Z]/.test(v) &&
  /[a-z]/.test(v) &&
  /[0-9]/.test(v) &&
  /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v);

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

    const { username, phone, gender, bio, birthday, bankName,
      accountName,
      accountNumber,
      promptPayNumber } = req.body;
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
    if (!user.bankAccount) user.bankAccount = {};

    if (bankName !== undefined) user.bankAccount.bankName = bankName;
    if (accountName !== undefined) user.bankAccount.accountName = accountName;
    if (accountNumber !== undefined) user.bankAccount.accountNumber = accountNumber;
    if (promptPayNumber !== undefined) user.bankAccount.promptPayNumber = promptPayNumber;

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
});

/* =====================================================
   5) REGISTER & LOGIN
===================================================== */
router.post("/register", registerLimiter, async (req, res) => { // 🔒 เพิ่ม registerLimiter
  try {
    let { username, email, phonenumber, password, role } = req.body;

    // 🔒 ตรวจสอบครบถ้วน (เพิ่ม phonenumber)
    if (!username || !email || !phonenumber || !password)
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });

    // 🔒 Sanitize input
    username    = username.trim();
    email       = email.trim().toLowerCase();
    phonenumber = phonenumber.trim();

    // 🔒 ตรวจรูปแบบ
    if (!isValidUsername(username))
      return res.status(400).json({ message: "Username ต้องมี 3-20 ตัว และใช้ได้เฉพาะ a-z, A-Z, 0-9, _" });

    if (!isValidEmail(email))
      return res.status(400).json({ message: "รูปแบบ Email ไม่ถูกต้อง" });

    if (!isValidPhone(phonenumber))
      return res.status(400).json({ message: "เบอร์โทรต้องเริ่มด้วย 0 และมี 10 หลัก" });

    if (!isStrongPassword(password))
      return res.status(400).json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัว, ตัวพิมพ์ใหญ่, ตัวพิมพ์เล็ก, ตัวเลข และอักขระพิเศษ" });

    // 🔒 ตรวจ Role ที่อนุญาต
    const allowedRoles = ["nisit", "staff", "shop"];
    if (role && !allowedRoles.includes(role))
      return res.status(400).json({ message: "Role ไม่ถูกต้อง" });

    // 🔒 ตรวจซ้ำ email + username + phone ใน query เดียว (เดิมเช็คแค่ email)
    const userExist = await User.findOne({
      $or: [{ email }, { username }, { phonenumber }],
    });
    if (userExist) {
      if (userExist.email === email)            return res.status(400).json({ message: "Email นี้ถูกใช้งานแล้ว" });
      if (userExist.username === username)      return res.status(400).json({ message: "Username นี้ถูกใช้งานแล้ว" });
      if (userExist.phonenumber === phonenumber) return res.status(400).json({ message: "เบอร์โทรนี้ถูกใช้งานแล้ว" });
    }

    // 🔒 Hash ด้วย cost 12 (เดิมใช้ 10)
    const hashedPassword = await bcrypt.hash(password, 12);

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


router.post("/login", loginLimiter, async (req, res) => { // 🔒 เพิ่ม loginLimiter
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "กรุณากรอก Email และรหัสผ่าน" });

    // 🔒 ตอบ message เดียวกันทั้งคู่ ป้องกัน User Enumeration Attack
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(400).json({ message: "Email หรือรหัสผ่านไม่ถูกต้อง" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Email หรือรหัสผ่านไม่ถูกต้อง" });

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