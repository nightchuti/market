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
// 1. เพิ่ม upload.array("images", 6) เพื่อให้แกะข้อมูลจาก FormData ได้
router.put("/:id", protect, upload.array("images", 6), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "ไม่พบสินค้า" });
    }

    if (product.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์แก้ไขสินค้านี้" });
    }

    // --- 1. จัดการเรื่องรูปภาพ ---
    let finalImages = product.images; // เริ่มต้นด้วยรูปเดิม

    // ถ้ามีการส่ง existingImages กลับมา (รูปเดิมที่ผู้ใช้ยังเก็บไว้)
    if (req.body.existingImages) {
      try {
        finalImages = JSON.parse(req.body.existingImages);
      } catch (e) {
        console.error("JSON parse existingImages failed");
      }
    }

    // ถ้ามีการอัปโหลดรูปใหม่เข้ามาเพิ่ม
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      finalImages = [...finalImages, ...newImages];
    }

    // --- 2. อัปเดตฟิลด์ข้อมูล ---
    product.title = req.body.title || product.title;
    product.description = req.body.description || product.description;
    
    // จัดการราคา (ถ้าแลกอย่างเดียวให้เป็น 0)
    if (req.body.tradeOption === "trade_allowed") {
      product.price = 0;
    } else {
      product.price = req.body.price !== undefined ? Number(req.body.price) : product.price;
    }

    product.category = req.body.category ? req.body.category.trim() : product.category;
    product.quantity = req.body.quantity !== undefined ? Number(req.body.quantity) : product.quantity;
    product.deliveryType = req.body.deliveryType || product.deliveryType;
    product.tradeOption = req.body.tradeOption || product.tradeOption;
    product.lat = req.body.lat !== undefined ? Number(req.body.lat) : product.lat;
    product.lng = req.body.lng !== undefined ? Number(req.body.lng) : product.lng;
    product.locationName = req.body.locationName || product.locationName;
    product.images = finalImages;

    // ✅ บังคับเป็น pending ทุกครั้งที่กดบันทึกแก้ไข
    product.status = "pending";

    // --- 3. อัพเดต Embedding (AI) ---
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

// ================= PUBLISH PRODUCT (กดลงขาย) =================
// เพิ่ม Route นี้เพื่อให้หน้า Inventory เรียกใช้เมื่อกดปุ่ม "ลงขาย"
router.put("/:id/publish", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
    if (product.user.toString() !== req.user.id) return res.status(403).json({ message: "ไม่มีสิทธิ์" });

    product.status = "available"; // เปลี่ยนสถานะเป็น available
    await product.save();

    res.json({ message: "ลงขายสินค้าสำเร็จ", status: "available" });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
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

// ================= GET ALL PRODUCTS =================
router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      deliveryType,
      tradeOption,
      page = 1,
      limit = 18
    } = req.query;

    let filter = {
      isActive: true,
      status: "available"
    };

    // 🔥 ค้นหาแบบใกล้เคียงมากขึ้น
    if (search && search.trim() !== "") {

      const keyword = search.trim();

      // สร้าง regex แบบยืดหยุ่น
      const regex = new RegExp(keyword.split("").join(".*"), "i");

      filter.$or = [
        { title: { $regex: regex } },
        { description: { $regex: regex } }
      ];
    }


    // 📂 หมวดหมู่
    if (category) {
      filter.category = category.trim();
    }

    // 🔄 ประเภทการแลกเปลี่ยน
    if (tradeOption) {
      filter.tradeOption = tradeOption;
    }

    // 🚚 ประเภทการส่ง
    if (deliveryType) {
      if (deliveryType === "delivery") {
        filter.deliveryType = { $in: ["delivery", "both"] };
      } else if (deliveryType === "meetup") {
        filter.deliveryType = { $in: ["meetup", "both"] };
      } else {
        filter.deliveryType = deliveryType;
      }
    }

    // 💰 ราคา
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .populate("user", "username email")
      .sort({ createdAt: -1 })
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
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการดึงข้อมูล",
      error: err.message
    });
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


module.exports = router;