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

// ================= CREATE PRODUCT =================
router.post("/", protect, async (req, res) => {
  try {
    const { 
      title, description, price, category, quantity, images, 
      deliveryType, tradeOption, lat, lng, locationName 
    } = req.body;

    // --- ส่วนของ AI Embedding ---
    let vector = [];
    try {
      const model = genAI.getGenerativeModel({ model: "embedding-001" });
      const textToEmbed = `Product: ${title}. Category: ${category}. Description: ${description || ''}. Delivery: ${deliveryType}.`;
      const result = await model.embedContent(textToEmbed);
      vector = result.embedding.values;
    } catch (aiErr) {
      console.error("AI Embedding failed:", aiErr.message);
      // ถ้า AI พัง ยังยอมให้สร้างสินค้าได้ แต่ไม่มี vector (หรือจะ return error ก็ได้)
    }

    const product = await Product.create({
      user: req.user.id,
      title,
      description,
      price,
      category,
      quantity,
      images,
      deliveryType, // เก็บข้อมูลนัดรับ/จัดส่ง
      tradeOption,  // เก็บตัวเลือกการแลก
      lat,          // เก็บละติจูดจริงจากหน้าบ้าน
      lng,          // เก็บลองจิจูดจริงจากหน้าบ้าน
      locationName, // ชื่อสถานที่นัดพบ
      embeddings: vector // เก็บตัวเลข AI 768 มิติ
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= UPDATE PRODUCT =================
router.put("/:id", protect, async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) return res.status(404).json({ message: "Product not found" });
  if (product.user.toString() !== req.user.id) return res.status(403).json({ message: "Not authorized" });

  // อัปเดตฟิลด์ทั่วไป
  product.title = req.body.title || product.title;
  product.description = req.body.description || product.description;
  product.price = req.body.price || product.price;
  product.category = req.body.category || product.category;
  product.quantity = req.body.quantity || product.quantity;
  
  // อัปเดตฟิลด์ใหม่
  product.deliveryType = req.body.deliveryType || product.deliveryType;
  product.tradeOption = req.body.tradeOption || product.tradeOption;
  product.lat = req.body.lat || product.lat;
  product.lng = req.body.lng || product.lng;
  product.locationName = req.body.locationName || product.locationName;

  await product.save();
  res.json({ message: "Product updated", product });
});

//==================DELETE PRODUCT ====================
router.delete("/:id", protect, async (req, res) => {

  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // ✅ ตรวจเจ้าของ
  if (product.user.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not authorized" });
  }

  await product.deleteOne();

  res.json({ message: "Product deleted" });

});


// ================= GET ALL PRODUCTS =================
router.get("/", async (req, res) => {

  const { search, category, minPrice, maxPrice } = req.query;

  let filter = {};

  // 🔍 ค้นตามชื่อ
  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  // 📂 ค้นตามหมวดหมู่
  if (category) {
    filter.category = category;
  }

  // 💰 ค้นตามราคา
  if (minPrice || maxPrice) {
    filter.price = {};

    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const products = await Product.find(filter)
    .populate("user", "username");

  res.json(products);
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
