const express = require("express");
const router = express.Router();

const Cart = require("../models/Cart");
const protect = require("../middleware/authMiddleware");

// ================= ADD TO CART =================
router.post("/add", protect, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

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
      cart.items[itemIndex].quantity += quantity;
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

  const cart = await Cart.findOne({ user: req.user.id })
    .populate("items.product");

  res.json(cart);
});

// ================= SELECT ALL ITEMS =================
// ⭐ ย้ายมาไว้ก่อน /select/:itemId
router.put("/select-all", protect, async (req, res) => {
  try {
    const { selected } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });

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

  cart.items = cart.items.filter(i => !i.selected);

  await cart.save();
  res.json(cart);
});

module.exports = router;