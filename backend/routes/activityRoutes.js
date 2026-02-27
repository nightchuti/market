const express = require("express");
const router = express.Router();
const Activity = require("../models/Activity");
const { protect, admin } = require("../middleware/authMiddleware");

// GET /api/admin/activities — ดึงกิจกรรมทั้งหมด (admin only)
router.get("/activities", protect, admin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const page  = parseInt(req.query.page)  || 1;
    const type  = req.query.type || null;

    const filter = type ? { type } : {};

    const activities = await Activity.find(filter)
      .populate("user", "username email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Activity.countDocuments(filter);

    res.json({ activities, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;