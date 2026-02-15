const express = require("express");
const router = express.Router();

const Cart = require("../models/Cart");
const { protect } = require("../middleware/authMiddleware");

// ================= ADD TO CART =================
router.post("/add", protect, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const Product = require("../models/Product");

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "ไม่พบสินค้า" });
    }

    // ✅ กันซื้อสินค้าของตัวเอง (สำคัญมาก)
    if (String(product.user) === String(req.user.id)) {
      return res.status(400).json({
        message: "ไม่สามารถเพิ่มสินค้าของตัวเองลงตะกร้าได้"
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
      const currentQty = cart.items[itemIndex].quantity;
      const newQty = currentQty + quantity;

      if (newQty > product.quantity) {
        return res.status(400).json({
          message: `สินค้านี้มีอยู่ในตะกร้าแล้ว (เหลือ ${product.quantity} ชิ้น)`
        });
      }

      cart.items[itemIndex].quantity = newQty;

    } else {

      if (quantity > product.quantity) {
        return res.status(400).json({
          message: `สินค้าเหลือเพียง ${product.quantity} ชิ้น`
        });
      }

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

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // toggle ค่า
    item.selected = !item.selected;

    // ✅ บอก mongoose ว่ามีการเปลี่ยน array
    cart.markModified("items");

    await cart.save();

    res.json(cart);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


// ================= REMOVE ONE ITEM =================
router.delete("/remove/:itemId", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      item => item._id.toString() !== req.params.itemId
    );

    await cart.save();
    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.delete("/remove-selected", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // ลบเฉพาะตัวที่ selected === true ชัดเจน
    cart.items = cart.items.filter(item => item.selected !== true);

    await cart.save();

    res.json(cart);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
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

router.post("/checkout", protect, async (req, res) => {
  const session = await Cart.startSession();
  session.startTransaction();

  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product")
      .session(session);

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart empty");
    }

    // 🔥 เช็ค stock ก่อนตัด
    for (let item of cart.items) {
      if (item.quantity > item.product.quantity) {
        throw new Error(
          `${item.product.title} สินค้าไม่พอ`
        );
      }
    }

    // 🔥 หัก stock
    for (let item of cart.items) {
      item.product.quantity -= item.quantity;
      await item.product.save({ session });
    }

    // 🔥 ล้าง cart
    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "สั่งซื้อสำเร็จ" });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
});


module.exports = router;
