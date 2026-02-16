const express = require("express");
const router = express.Router();
const Shop = require("../models/Shop")

// create shop
router.post("/", async (req, res) => {
  const shop = await Shop.create(req.body);
  res.json(shop);
});

// get shop (ร้านหลัก)
router.get("/", async (req, res) => {
  const shop = await Shop.findOne();
  res.json(shop);
});

module.exports = router;
