const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();   // ✅ บรรทัดนี้ต้องมี

// REGISTER
router.post("/register", async (req, res) => {
  try {
    console.log("BODY:", req.body);
    const { username, email, phonenumber, password, role } = req.body;

    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      phonenumber,
      password: hashedPassword,
      role
    });

    res.status(201).json({
      message: "Register success",
      user
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login success",
      token,
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

const protect = require("../middleware/authMiddleware");

router.get("/profile", protect, async (req, res) => {
  res.json({
    message: "Profile data",
    userId: req.user.id
  });
});


module.exports = router;
