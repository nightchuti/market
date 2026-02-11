const express = require("express");
const router = express.Router();
const Address = require("../models/Address");
const protect = require("../middleware/authMiddleware");

// เพิ่มที่อยู่
router.post("/", protect, async (req, res) => {
  const address = await Address.create({
    user: req.user.id,
    dormName: req.body.dormName,
    room: req.body.room,
    note: req.body.note,
    lat: req.body.lat,
    lng: req.body.lng
  });

  res.status(201).json(address);
});

// ดึงที่อยู่ทั้งหมด
router.get("/", protect, async (req, res) => {
  const addresses = await Address.find({ user: req.user.id });
  res.json(addresses);
});

// แก้ไขที่อยู่
router.put("/:id", protect, async (req, res) => {
  const address = await Address.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(address);
});

// ลบที่อยู่
router.delete("/:id", protect, async (req, res) => {
  await Address.findByIdAndDelete(req.params.id);
  res.json({ message: "Address deleted" });
});

module.exports = router;
