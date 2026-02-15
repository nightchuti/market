const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User"); // ✅ เพิ่มการ Import User สำหรับเช็คโควตา

// ✅ destructure เพราะ authMiddleware export เป็น { protect, admin }
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ================= [NEW] TEST UPGRADE PRO =================
// ใช้สำหรับจำลองการซื้อโปร 99 บาท (เติม 10 สิทธิ์)
router.post("/test-upgrade-pro", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

    user.membershipTier = "PRO";
    user.boostQuota = (user.boostQuota || 0) + 10;

    await user.save();
    res.json({ success: true, message: "อัปเกรด PRO สำเร็จ (Test Mode)", quota: user.boostQuota });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

// ================= [NEW] ACTIVATE BOOST =================
// ฟังก์ชันที่ Frontend (Inventory.js) เรียกเพื่อหักโควตาและดันโพสต์
router.post("/activate-boost/:id", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const user = await User.findById(req.user.id);

    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
    if (product.user.toString() !== req.user.id)
      return res.status(403).json({ message: "คุณไม่ใช่เจ้าของสินค้านี้" });

    // 1. ตรวจสอบโควตา
    if (user.boostQuota <= 0) {
      return res.status(400).json({ success: false, message: "โควตาบูสของคุณหมดแล้ว" });
    }

    // 2. ตั้งค่าการบูส (3 วันนับจากปัจจุบัน)
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 3);

    product.isBoosted = true;
    product.boostExpireAt = expireDate;

    // 3. หักโควตา User
    user.boostQuota -= 1;

    await product.save();
    await user.save();

    res.json({
      success: true,
      message: "บูสสินค้าสำเร็จ! สินค้าจะอยู่ลำดับแรกๆ เป็นเวลา 3 วัน",
      boostExpireAt: expireDate,
      remainingQuota: user.boostQuota
    });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

// ================= UPLOAD IMAGES =================
router.post("/upload", upload.array("images", 6), (req, res) => {
  const images = req.files.map(file => `/uploads/${file.filename}`);
  res.json({ message: "Upload success", images });
});

// ================= MY PRODUCTS =================
router.get("/my", protect, async (req, res) => {
  try {
    const products = await Product.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= GET CATEGORIES =================
router.get("/config/categories", async (req, res) => {
  try {
    const categories = Product.schema.path("category").enumValues;
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
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
  try {
    const { search, category, minPrice, maxPrice, deliveryType, tradeOption, page = 1, limit = 18 } = req.query;
    let filter = { isActive: true, status: "available" };

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim().split("").join(".*"), "i");
      filter.$or = [{ title: { $regex: regex } }, { description: { $regex: regex } }];
    }
    if (category) filter.category = category.trim();
    if (tradeOption) filter.tradeOption = tradeOption;
    if (deliveryType) {
      if (deliveryType === "delivery") filter.deliveryType = { $in: ["delivery", "both"] };
      else if (deliveryType === "meetup") filter.deliveryType = { $in: ["meetup", "both"] };
      else filter.deliveryType = deliveryType;
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.find(filter)
      .populate("user", "username email membershipTier")
      .sort({ isBoosted: -1, createdAt: -1 }) // ✅ บูสแล้วจะอยู่บนสุด
      .skip(skip).limit(parseInt(limit));
    const total = await Product.countDocuments(filter);

    res.json({ products, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});

// // ================= GET SINGLE PRODUCT =================
// router.get("/:id", async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id).populate("user", "username email");
//     if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
//     res.json(product);
//   } catch (err) {
//     res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
//   }
// });

// ================= CREATE PRODUCT =================
// Route สำหรับเพิ่มสินค้า
router.post("/", protect, upload.fields([
  { name: "images", maxCount: 5 },
  { name: "wantedImages", maxCount: 5 }
]), async (req, res) => {
  try {
    const {
      title, description, price, category, quantity,
      deliveryType, tradeOption, lat, lng, locationName,
      meetupAddress, wantedCategory, wantedKeywords
    } = req.body;

    // 1. จัดการรูปภาพ (ป้องกันกรณีไม่มีไฟล์)
    const imagePaths = req.files?.images
      ? req.files.images.map(f => `/uploads/${f.filename}`)
      : [];
    const wantedImagePaths = req.files?.wantedImages
      ? req.files.wantedImages.map(f => `/uploads/${f.filename}`)
      : [];

    // 2. จัดการ Keywords (ป้องกัน .split of undefined)
    let processedKeywords = [];
    if (wantedKeywords) {
      processedKeywords = typeof wantedKeywords === "string"
        ? wantedKeywords.split(",").map(k => k.trim()).filter(k => k !== "")
        : wantedKeywords;
    }

    // 3. สร้าง Instance ของ Product
    const product = new Product({
      user: req.user.id,
      shop: req.user.id,
      title,
      description,
      price: tradeOption === "trade_allowed" ? 0 : Number(price || 0),
      category,
      quantity: Number(quantity || 1),
      images: imagePaths,
      wantedImages: wantedImagePaths,
      wantedCategory: wantedCategory || "",
      wantedKeywords: processedKeywords,
      meetupAddress: meetupAddress || "",
      deliveryType: deliveryType || "delivery",
      tradeOption: tradeOption || "sell_only",
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      locationName: locationName || ""
    });

    // 4. ทำ AI Embedding (ถ้าทำได้)
    async function generateEmbedding(text) {
      try {
        // แก้ไขจาก embedding-001 เป็น text-embedding-004
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        return result.embedding.values;
      } catch (error) {
        // ถ้า AI มีปัญหา ให้ Log ไว้แต่ไม่ให้ Error 500 พ่นออกไปหา User
        console.error("❌ Google AI Embedding Error:", error.message);
        return null;
      }
    }

    // 5. บันทึกข้อมูล
    await product.save();
    res.status(201).json({ success: true, message: "บันทึกสินค้าสำเร็จ", product });

  } catch (err) {
    console.error("🔥 Server Error:", err);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดที่ Server",
      error: err.message
    });
  }
});

// ================= UPDATE PRODUCT =================
router.put("/:id", protect, upload.fields([
  { name: "images", maxCount: 6 },
  { name: "wantedImages", maxCount: 6 }
]), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
    if (product.user.toString() !== req.user.id) return res.status(403).json({ message: "คุณไม่มีสิทธิ์แก้ไขสินค้านี้" });

    let finalImages = product.images;
    if (req.body.existingImages) {
      try { finalImages = JSON.parse(req.body.existingImages); } catch { }
    }
    if (req.files?.images?.length > 0)
      finalImages = [...finalImages, ...req.files.images.map(f => `/uploads/${f.filename}`)];


    product.title = req.body.title || product.title;
    product.description = req.body.description || product.description;
    product.price = req.body.tradeOption === "trade_allowed" ? 0 : (req.body.price !== undefined ? Number(req.body.price) : product.price);
    product.category = req.body.category ? req.body.category.trim() : product.category;
    product.quantity = req.body.quantity !== undefined ? Number(req.body.quantity) : product.quantity;
    product.deliveryType = req.body.deliveryType || product.deliveryType;
    product.tradeOption = req.body.tradeOption || product.tradeOption;
    product.lat = req.body.lat !== undefined ? Number(req.body.lat) : product.lat;
    product.lng = req.body.lng !== undefined ? Number(req.body.lng) : product.lng;
    product.locationName = req.body.locationName || product.locationName;
    product.images = finalImages;
    product.status = "pending";


    if (req.body.title || req.body.description || req.body.category) {
      try {
        const model = genAI.getGenerativeModel({ model: "embedding-001" });
        const result = await model.embedContent(`Product: ${product.title}. Category: ${product.category}. Description: ${product.description || ""}. Price: ${product.price}`);
        product.embeddings = result.embedding.values;
      } catch (aiErr) { console.error("❌ Embedding update failed:", aiErr.message); }
    }
    if (req.body.meetupAddress !== undefined) {
      product.meetupAddress = req.body.meetupAddress;
    }

    await product.save();
    res.json({ message: "อัพเดตสินค้าสำเร็จ", product });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัพเดต", error: err.message });
  }
});

// ================= PUBLISH / DELETE / IMAGE MGMT =================
// (ส่วนนี้เหมือนเดิมตามที่คุณส่งมา)
router.put("/:id/publish", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
    if (product.user.toString() !== req.user.id) return res.status(403).json({ message: "ไม่มีสิทธิ์" });
    product.status = "available";
    await product.save();
    res.json({ message: "ลงขายสินค้าสำเร็จ", status: "available" });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});

// ================= GET PRODUCTS BY USER =================
router.get("/user/:id", async (req, res) => {
  try {
    const products = await Product.find({
      user: req.params.id,
      status: "available"
    })
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("user", "username email profileImage role");

    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});



router.put("/:id/add-images", protect, upload.fields([
  { name: "images", maxCount: 6 }
]), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
    if (product.user.toString() !== req.user.id) return res.status(403).json({ message: "คุณไม่มีสิทธิ์แก้ไข" });
    const newImages = req.files?.images
      ? req.files.images.map(f => `/uploads/${f.filename}`)
      : [];

    if (product.images.length + newImages.length > 6) return res.status(400).json({ message: "สามารถเพิ่มรูปได้สูงสุด 6 รูป" });
    product.images.push(...newImages);
    await product.save();
    res.json({ message: "เพิ่มรูปภาพสำเร็จ", product });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});

router.put("/:id/remove-image", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
    if (product.user.toString() !== req.user.id) return res.status(403).json({ message: "คุณไม่มีสิทธิ์แก้ไข" });
    product.images = product.images.filter(img => img !== req.body.image);
    await product.save();
    res.json({ message: "ลบรูปภาพสำเร็จ", product });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});

// ✅ รักษาฟังก์ชันเดิมไว้เผื่อใช้งานในรูปแบบอื่น
router.post("/:id/boost", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
    if (product.user.toString() !== req.user.id) return res.status(403).json({ message: "คุณไม่ใช่เจ้าของสินค้านี้" });

    const expireDate = new Date();
    if (product.isBoosted && product.boostExpireAt > new Date())
      expireDate.setTime(product.boostExpireAt.getTime());
    expireDate.setDate(expireDate.getDate() + parseInt(req.body.days || 1));

    product.isBoosted = true;
    product.boostExpireAt = expireDate;
    await product.save();

    res.json({ message: `ดันโพสต์สำเร็จ! ถึงวันที่ ${expireDate.toLocaleDateString()}`, boostExpireAt: expireDate });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/bulk", async (req, res) => {
  const products = await Product.find({
    _id: { $in: req.body.ids },
    status: "available"
  });

  res.json(products);
});


module.exports = router;