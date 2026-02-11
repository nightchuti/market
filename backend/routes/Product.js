const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");


// ================= UPLOAD MANY IMAGES =================
router.post("/upload", upload.array("images", 6), (req, res) => {
  const images = req.files.map(file =>
    `/uploads/${file.filename}`
  );

  res.json({
    message: "Upload success",
    images
  });
});


// ================= MY PRODUCTS =================
router.get("/my", protect, async (req, res) => {
  const products = await Product.find({
    user: req.user.id
  });

  res.json(products);
});


// ================= RECOMMENDED PRODUCTS =================
router.get("/recommended", async (req, res) => {
  try {
    const products = await Product.find({ isRecommended: true })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("user", "username");

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ================= CREATE PRODUCT (SHOP ONLY) =================
router.post("/", protect, async (req, res) => {

  // 🏪 เฉพาะ shop เท่านั้น
  if (req.user.role !== "shop") {
    return res.status(403).json({ message: "Shop only" });
  }

  const product = await Product.create({
    user: req.user.id,
    title: req.body.title,
    description: req.body.description,
    price: req.body.price,
    category: req.body.category,
    quantity: req.body.quantity,
    images: req.body.images || [],
    isRecommended: req.body.isRecommended || false,
    exchangeable: req.body.exchangeable || false
  });

  res.json(product);
});


// ================= UPDATE PRODUCT =================
router.put("/:id", protect, async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // ✅ ตรวจว่าเป็นเจ้าของโพสต์ไหม
  if (product.user.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not authorized" });
  }

  product.title = req.body.title ?? product.title;
  product.description = req.body.description ?? product.description;
  product.price = req.body.price ?? product.price;
  product.category = req.body.category ?? product.category;
  product.quantity = req.body.quantity ?? product.quantity;
  product.exchangeable = req.body.exchangeable ?? product.exchangeable;
  product.isRecommended = req.body.isRecommended ?? product.isRecommended;

  await product.save();

  res.json({
    message: "Product updated",
    product
  });
});


// ================= DELETE PRODUCT =================
router.delete("/:id", protect, async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (product.user.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not authorized" });
  }

  await product.deleteOne();
  res.json({ message: "Product deleted" });
});


// ================= GET ALL PRODUCTS (FILTER) =================
router.get("/", async (req, res) => {

  const {
    search,
    category,
    minPrice,
    maxPrice,
    exchangeable
  } = req.query;

  let filter = {};

  // 🔍 ค้นตามชื่อ
  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  // 📂 หมวดหมู่
  if (category) {
    filter.category = category;
  }

  // 💰 ราคา
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // 🔄 แลกเปลี่ยนได้
  if (exchangeable === "true") {
    filter.exchangeable = true;
  }

  const products = await Product.find(filter)
    .populate("user", "username dormAddress");

  res.json(products);
});


// ================= PRODUCT DETAIL =================
router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate("user", "username dormAddress");

  if (!product)
    return res.status(404).json({ message: "Product not found" });

  res.json(product);
});


// ================= ADD IMAGE =================
router.put("/:id/add-images",
  protect,
  upload.array("images", 6),
  async (req, res) => {

    const product = await Product.findById(req.params.id);

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    if (product.user.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    const newImages = req.files.map(f =>
      `/uploads/${f.filename}`
    );

    product.images.push(...newImages);
    await product.save();

    res.json(product);
});


// ================= REMOVE IMAGE =================
router.put("/:id/remove-image", protect, async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product)
    return res.status(404).json({ message: "Product not found" });

  if (product.user.toString() !== req.user.id)
    return res.status(403).json({ message: "Not authorized" });

  product.images = product.images.filter(
    img => img !== req.body.image
  );

  await product.save();
  res.json(product);
});

module.exports = router;
