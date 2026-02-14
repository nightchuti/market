const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ เพิ่มบรรทัดนี้
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ================= UPLOAD MANY IMAGES =================
router.post("/upload", upload.array("images", 6), (req, res) => {
  const images = req.files.map(file => `/uploads/${file.filename}`);
  res.json({
    message: "Upload success",
    images
  });
});

// ================= MY PRODUCTS =================
router.get("/my", protect, async (req, res) => {
  try {
    const products = await Product.find({
      user: req.user.id
    }).sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= CREATE PRODUCT =================
router.post("/", protect, upload.array("images", 6), async (req, res) => {
  try {
    const {
      title, description, price, category, quantity, images,
      deliveryType, tradeOption, lat, lng, locationName
    } = req.body;

    const imagePaths = req.files
      ? req.files.map(file => `/uploads/${file.filename}`)
      : [];

    // Validation
    if (!title || !category) {
      return res.status(400).json({
        message: "กรุณาระบุชื่อสินค้า และหมวดหมู่"
      });
    }

    // ต้องมีราคา ยกเว้นแลกอย่างเดียว
    if (
      (tradeOption === "sell_only" || tradeOption === "negotiable") &&
      (!price || Number(price) <= 0)
    ) {
      return res.status(400).json({
        message: "สินค้าขายต้องมีราคามากกว่า 0"
      });
    }


    // ✅ สร้าง AI Embedding
    let vector = [];
    try {
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const textToEmbed = `Product: ${title}. Category: ${category}. Description: ${description || ''}. Delivery: ${deliveryType || 'delivery'}. Price: ${price}`;

      const result = await model.embedContent(textToEmbed);
      vector = result.embedding.values;

      console.log("✅ AI Embedding created, vector length:", vector.length);
    } catch (aiErr) {
      console.error("❌ AI Embedding failed:", aiErr.message);
      // ถ้า AI พัง ยังยอมให้สร้างสินค้าได้ แต่ไม่มี vector
    }

    const product = await Product.create({
      user: req.user.id,
      title,
      description,
      price:
        tradeOption === "trade_allowed"
          ? 0
          : Number(price),
      category: category.trim(), // ✅ ตัดช่องว่าง
      quantity: quantity || 1,
      images: imagePaths,
      deliveryType: deliveryType || "delivery",
      tradeOption: tradeOption || "sell_only",
      lat,
      lng,
      locationName,
      embeddings: vector
    });

    // Populate user info
    await product.populate("user", "username email");

    res.status(201).json({
      message: "สร้างสินค้าสำเร็จ",
      product
    });
  } catch (err) {
    console.error("Create Product Error:", err);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการสร้างสินค้า",
      error: err.message
    });
  }
});

// ================= UPDATE PRODUCT =================
router.put("/:id", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "ไม่พบสินค้า" });
    }

    if (product.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์แก้ไขสินค้านี้" });
    }

    // อัปเดตฟิลด์
    product.title = req.body.title || product.title;
    product.description = req.body.description || product.description;
    product.price = req.body.price || product.price;
    product.category = req.body.category ? req.body.category.trim() : product.category;
    product.quantity = req.body.quantity !== undefined ? req.body.quantity : product.quantity;
    product.deliveryType = req.body.deliveryType || product.deliveryType;
    product.tradeOption = req.body.tradeOption || product.tradeOption;
    product.lat = req.body.lat !== undefined ? req.body.lat : product.lat;
    product.lng = req.body.lng !== undefined ? req.body.lng : product.lng;
    product.locationName = req.body.locationName || product.locationName;
    product.isActive = req.body.isActive !== undefined ? req.body.isActive : product.isActive;

    // ✅ อัพเดต Embedding ถ้ามีการเปลี่ยนข้อมูลสำคัญ
    if (req.body.title || req.body.description || req.body.category) {
      try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const textToEmbed = `Product: ${product.title}. Category: ${product.category}. Description: ${product.description || ''}. Price: ${product.price}`;

        const result = await model.embedContent(textToEmbed);
        product.embeddings = result.embedding.values;

        console.log("✅ Embedding updated");
      } catch (aiErr) {
        console.error("❌ Embedding update failed:", aiErr.message);
      }
    }

    await product.save();

    res.json({
      message: "อัพเดตสินค้าสำเร็จ",
      product
    });
  } catch (err) {
    console.error("Update Product Error:", err);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการอัพเดต",
      error: err.message
    });
  }
});

// ==================DELETE PRODUCT ====================
router.delete("/:id", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "ไม่พบสินค้า" });
    }

    if (product.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์ลบสินค้านี้" });
    }

    await product.deleteOne();

    res.json({ message: "ลบสินค้าสำเร็จ" });
  } catch (err) {
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการลบ",
      error: err.message
    });
  }
});

/// ================= GET ALL PRODUCTS =================
router.get("/", async (req, res) => {
  try {
    const {
      search, category, minPrice, maxPrice,
      deliveryType, tradeOption, page = 1, limit = 18
    } = req.query;

    let filter = {
      isActive: true,
      status: "available"
    };

    // --- Search Logic (คงเดิม) ---
    if (search && search.trim() !== "") {
      const keyword = search.trim();
      const regex = new RegExp(keyword.split("").join(".*"), "i");
      filter.$or = [
        { title: { $regex: regex } },
        { description: { $regex: regex } }
      ];
    }

    // --- Filters (คงเดิม) ---
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

    // ✅ ส่วนที่แก้ไข: เพิ่มการเรียงลำดับ (Sorting)
    // 1. isBoosted: -1 (true มาก่อน false)
    // 2. createdAt: -1 (ของใหม่มาทีหลัง)
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .populate("user", "username email membershipTier") // ดึง Tier ของ User มาด้วยก็ได้
      .sort({ isBoosted: -1, createdAt: -1 }) // <--- แก้ตรงนี้ครับ!
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล", error: err.message });
  }
});


// ================= GET SINGLE PRODUCT =================
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("user", "username email");

    if (!product) {
      return res.status(404).json({ message: "ไม่พบสินค้า" });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({
      message: "เกิดข้อผิดพลาด",
      error: err.message
    });
  }
});

// ================= ADD IMAGE =================
router.put("/:id/add-images", protect, upload.array("images", 6), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "ไม่พบสินค้า" });
    }

    if (product.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์แก้ไข" });
    }

    const newImages = req.files.map(f => `/uploads/${f.filename}`);

    // จำกัดไม่ให้เกิน 6 รูป
    if (product.images.length + newImages.length > 6) {
      return res.status(400).json({
        message: "สามารถเพิ่มรูปได้สูงสุด 6 รูปต่อสินค้า"
      });
    }

    product.images.push(...newImages);
    await product.save();

    res.json({
      message: "เพิ่มรูปภาพสำเร็จ",
      product
    });
  } catch (err) {
    res.status(500).json({
      message: "เกิดข้อผิดพลาด",
      error: err.message
    });
  }
});

// ================= REMOVE IMAGE =================
router.put("/:id/remove-image", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "ไม่พบสินค้า" });
    }

    if (product.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์แก้ไข" });
    }

    product.images = product.images.filter(
      img => img !== req.body.image
    );

    await product.save();

    res.json({
      message: "ลบรูปภาพสำเร็จ",
      product
    });
  } catch (err) {
    res.status(500).json({
      message: "เกิดข้อผิดพลาด",
      error: err.message
    });
  }
});

// ================= GET CATEGORIES =================
router.get("/config/categories", async (req, res) => {
  try {
    const categories = Product.schema.path('category').enumValues;

    res.json({
      categories
    });
  } catch (err) {
    res.status(500).json({
      message: "เกิดข้อผิดพลาด",
      error: err.message
    });
  }
});

<<<<<<< HEAD
// ================= BOOST PRODUCT (ดันโพสต์) =================
// API นี้ไว้เรียกเมื่อ User จ่ายเงินสำเร็จเพื่อดันโพสต์สินค้าชิ้นนี้
router.post("/:id/boost", protect, async (req, res) => {
  try {
    const { days } = req.body; // รับค่าจำนวนวัน เช่น 3, 7, 30
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
    
    // เช็คว่าเป็นเจ้าของสินค้าไหม
    if (product.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "คุณไม่ใช่เจ้าของสินค้านี้" });
    }

    // คำนวณวันหมดอายุ
    const expireDate = new Date();
    
    // ถ้าของเดิมยัง Boost อยู่ ให้บวกเพิ่มจากวันเดิม
    if (product.isBoosted && product.boostExpireAt > new Date()) {
       expireDate.setTime(product.boostExpireAt.getTime());
    }
    
    // บวกจำนวนวันที่ซื้อเพิ่ม
    expireDate.setDate(expireDate.getDate() + parseInt(days || 1));

    // อัปเดตข้อมูล
    product.isBoosted = true;
    product.boostExpireAt = expireDate;
    
    await product.save();

    res.json({ 
      message: `ดันโพสต์สำเร็จ! สินค้าจะอยู่บนหน้าแรกถึง ${expireDate.toLocaleDateString()}`,
      boostExpireAt: expireDate
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

=======
router.put("/products/:id/publish", authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "ไม่พบสินค้า" });
    }

    product.status = "available";
    await product.save();

    res.json({ message: "ลงขายสำเร็จ" });

  } catch (err) {
    res.status(500).json({ message: "error" });
  }
});


>>>>>>> f393d54f494f52e6d1c6ac372b4f44c1cff0b5d6
module.exports = router;