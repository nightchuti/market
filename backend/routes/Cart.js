const express = require("express");
const router = express.Router();

const Cart = require("../models/Cart");
const protect = require("../middleware/authMiddleware");

// ================= ADD TO CART =================
router.post("/add", protect, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const Product = require("../models/Product");

    // ✅ เช็คว่าสินค้ามีอยู่จริงไหม
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "ไม่พบสินค้า"
      });
    }

    // ✅ ห้ามเพิ่มสินค้าของตัวเอง
    if (String(product.user) === String(req.user.id)) {
      return res.status(400).json({
        message: "ไม่สามารถเพิ่มสินค้าของตัวเองลงตะกร้าได้"
      });
    }

    // ✅ เช็ค stock
    if (product.quantity < quantity) {
      return res.status(400).json({
        message: `สินค้าเหลือเพียง ${product.quantity} ชิ้น`
      });
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: []
      });
    }

    const itemIndex = cart.items.findIndex(
      i => i.product.toString() === productId
    );

    if (itemIndex > -1) {
      const newQty = cart.items[itemIndex].quantity + quantity;

      // ✅ เช็คไม่ให้เกิน stock
      if (newQty > product.quantity) {
        return res.status(400).json({
          message: `สินค้าเหลือเพียง ${product.quantity} ชิ้น`
        });
      }

      cart.items[itemIndex].quantity = newQty;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        selected: true
      });
    }

    await cart.save();
    res.json(cart);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});


// ================= GET CART =================
router.get("/", protect, async (req, res) => {

  let cart = await Cart.findOne({ user: req.user.id })
    .populate("items.product");

  // ✅ แก้ตรงนี้: กัน cart เป็น null
  if (!cart) {
    return res.json({ items: [] });
  }

  res.json(cart);
});

// ================= SELECT ALL ITEMS =================
router.put("/select-all", protect, async (req, res) => {
  try {
    const { selected } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });

    // ✅ กัน null
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items.forEach(item => {
      item.selected = selected;
    });

    await cart.save();
    res.json(cart);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ================= SELECT ITEM =================
router.put("/select/:itemId", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    // ✅ กัน null
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    item.selected = !item.selected;

    await cart.save();
    res.json(cart);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ================= REMOVE SELECTED =================
router.delete("/remove-selected", protect, async (req, res) => {

  const cart = await Cart.findOne({ user: req.user.id });

  // ✅ กัน null
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  cart.items = cart.items.filter(i => !i.selected);

  await cart.save();
  res.json(cart);
});

// ================= UPDATE QUANTITY =================
router.put("/update/:itemId", protect, async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ message: "จำนวนต้องมากกว่า 0" });
    }

    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product");

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (quantity > item.product.quantity) {
      return res.status(400).json({
        message: `มีสินค้าเหลือเพียง ${item.product.quantity} ชิ้น`
      });
    }

    item.quantity = quantity;

    await cart.save();
    res.json(cart);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


// 🔥 ต้องอยู่ล่างสุดไฟล์เสมอ
module.exports = router;