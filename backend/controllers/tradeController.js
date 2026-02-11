const Trade = require("../models/Trade");
const Product = require("../models/Product");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// --- 1. สร้างประกาศ (AI Encoding) ---
exports.createTrade = async (req, res) => {
    try {
        const { offeredProduct, wantedCategory, description, lat, lng } = req.body;

        // check ว่าสินค้านี้ถูกประกาศแลกไปแล้วหรือไม่
        const existingTrade = await Trade.findOne({ offeredProduct, status: "Open" });
        if (existingTrade) {
            return res.status(400).json({ message: "สินค้านี้ถูกประกาศแลกไปแล้วและยังมีสถานะเปิดอยู่" });
        }

        if (!offeredProduct || !wantedCategory) {
            return res.status(400).json({
                message: "กรุณาระบุสินค้าที่ต้องการแลกและหมวดหมู่ที่ต้องการ"
            });
        }

        const product = await Product.findById(offeredProduct);
        if (!product) return res.status(404).json({ message: "ไม่พบสินค้านี้" });

        // ตรวจสอบว่าคนลงประกาศคือเจ้าของสินค้าจริงไหม
        if (product.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "คุณไม่มีสิทธิ์นำสินค้าของผู้อื่นมาลงประกาศแลก" });
        }


        // ✅ แก้เป็น text-embedding-004
        const model = genAI.getGenerativeModel({
            model: "text-embedding-004"
        });

        const textToEmbed = `Product: ${product.title}. Category: ${wantedCategory}. Price: ${product.price}. Info: ${description || product.description || 'ไม่มีคำอธิบาย'}`;

        const result = await model.embedContent(textToEmbed);
        const vector = result.embedding.values;

        const trade = await Trade.create({
            owner: req.user.id,
            offeredProduct,
            wantedCategory,
            description,
            lat: lat || product.lat, // ใช้จาก body ถ้าไม่มีให้ใช้จากที่ตั้งไว้ใน product
            lng: lng || product.lng,
            embeddings: vector
        });

        await trade.populate([
            { path: "owner", select: "username email" },
            { path: "offeredProduct", select: "name price image category" }
        ]);

        res.status(201).json({
            message: "สร้างประกาศสำเร็จ",
            trade
        });
    } catch (err) {
        console.error("Create Trade Error:", err);
        res.status(500).json({
            message: "เกิดข้อผิดพลาดในการสร้างประกาศ",
            error: err.message
        });
    }
};

// --- 7. ค้นหาด้วยข้อความ ---
exports.manualSearch = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim() === '') {
            return res.status(400).json({ message: "กรุณาระบุคำค้นหา" });
        }

        // ✅ แก้เป็น text-embedding-004
        const model = genAI.getGenerativeModel({
            model: "text-embedding-004"
        });

        const result = await model.embedContent(q);
        const vector = result.embedding.values;

        const matches = await Trade.aggregate([
            {
                "$vectorSearch": {
                    "index": "trade_ai",
                    "path": "embeddings",
                    "queryVector": vector,
                    "numCandidates": 100,
                    "limit": 20
                }
            },
            { "$match": { "status": "Open" } },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "owner",
                    "foreignField": "_id",
                    "as": "ownerInfo"
                }
            },
            {
                "$lookup": {
                    "from": "products",
                    "localField": "offeredProduct",
                    "foreignField": "_id",
                    "as": "productInfo"
                }
            },
            {
                "$project": {
                    "offeredProduct": { "$arrayElemAt": ["$productInfo", 0] },
                    "wantedCategory": 1,
                    "description": 1,
                    "status": 1,
                    "createdAt": 1,
                    "owner": { "$arrayElemAt": ["$ownerInfo", 0] }
                }
            }
        ]);

        res.json({
            query: q,
            found: matches.length,
            matches
        });
    } catch (err) {
        console.error("Manual Search Error:", err);
        res.status(500).json({
            message: "เกิดข้อผิดพลาดในการค้นหา",
            error: err.message
        });
    }
};

// --- 5. ค้นหาด้วยรูปภาพ ---
exports.searchByImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "กรุณาอัพโหลดรูปภาพ" });
        }

        const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype
            }
        };

        const visionResult = await visionModel.generateContent([
            "อธิบายสินค้าในภาพนี้โดยละเอียด เพื่อใช้ในการค้นหา รวมถึงยี่ห้อ รุ่น สี และลักษณะเด่น",
            imagePart
        ]);
        const description = visionResult.response.text();

        // ✅ แก้เป็น text-embedding-004
        const embedModel = genAI.getGenerativeModel({
            model: "text-embedding-004"
        });
        const embedResult = await embedModel.embedContent(description);

        const matches = await Trade.aggregate([
            {
                "$vectorSearch": {
                    "index": "trade_ai",
                    "path": "embeddings",
                    "queryVector": embedResult.embedding.values,
                    "numCandidates": 100,
                    "limit": 15
                }
            },
            { "$match": { "status": "Open" } },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "owner",
                    "foreignField": "_id",
                    "as": "ownerInfo"
                }
            },
            {
                "$lookup": {
                    "from": "products",
                    "localField": "offeredProduct",
                    "foreignField": "_id",
                    "as": "productInfo"
                }
            },
            {
                "$project": {
                    "offeredProduct": { "$arrayElemAt": ["$productInfo", 0] },
                    "wantedCategory": 1,
                    "description": 1,
                    "status": 1,
                    "createdAt": 1,
                    "owner": { "$arrayElemAt": ["$ownerInfo", 0] }
                }
            }
        ]);

        res.json({
            aiDescription: description,
            found: matches.length,
            matches
        });
    } catch (err) {
        console.error("Image Search Error:", err);
        res.status(500).json({
            message: "เกิดข้อผิดพลาดในการค้นหาด้วยรูปภาพ",
            error: err.message
        });
    }
};