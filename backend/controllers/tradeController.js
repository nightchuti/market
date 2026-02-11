const Trade = require("../models/Trade");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 1. สร้างประกาศ (AI Encoding) ---
exports.createTrade = async (req, res) => {
    try {
        const { offeredProduct, wantedCategory, description, lat, lng } = req.body;

        const existingTrade = await Trade.findOne({ offeredProduct, status: "Open" });
        if (existingTrade) return res.status(400).json({ message: "สินค้านี้ถูกประกาศแลกไปแล้ว" });

        const product = await Product.findById(offeredProduct);
        if (!product) return res.status(404).json({ message: "ไม่พบสินค้านี้" });
        if (product.user.toString() !== req.user.id) return res.status(403).json({ message: "คุณไม่ใช่เจ้าของสินค้า" });

        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const textToEmbed = `Product: ${product.title}. Category: ${wantedCategory}. Info: ${description || product.description}`;
        const result = await model.embedContent(textToEmbed);
        const vector = result.embedding.values;

        const trade = await Trade.create({
            owner: req.user.id,
            offeredProduct,
            wantedCategory,
            description,
            lat: lat || product.lat,
            lng: lng || product.lng,
            embeddings: vector
        });

        res.status(201).json({ message: "สร้างประกาศสำเร็จ", trade });
    } catch (err) {
        res.status(500).json({ message: "Error", error: err.message });
    }
};

// --- 2. ดึงรายการทั้งหมด (แก้ Error บรรทัด 24) ---
exports.getOpenTrades = async (req, res) => {
    try {
        const trades = await Trade.find({ status: "Open" })
            .populate("owner", "username email")
            .populate("offeredProduct")
            .sort({ createdAt: -1 });
        res.json(trades);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- 3. ค้นหาด้วยข้อความ (Semantic Search) ---
exports.manualSearch = async (req, res) => {
    try {
        const { q } = req.query;
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(q);
        
        const matches = await Trade.aggregate([
            {
                "$vectorSearch": {
                    "index": "trade_ai",
                    "path": "embeddings",
                    "queryVector": result.embedding.values,
                    "numCandidates": 100,
                    "limit": 20
                }
            },
            { "$match": { "status": "Open" } },
            { "$lookup": { "from": "products", "localField": "offeredProduct", "foreignField": "_id", "as": "product" } },
            { "$unwind": "$product" }
        ]);
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- 4. ค้นหาด้วยรูปภาพ ---
exports.searchByImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "กรุณาแนบรูป" });
        const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const visionResult = await visionModel.generateContent([
            "อธิบายสินค้าในภาพเพื่อการค้นหา",
            { inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype } }
        ]);
        
        const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embedResult = await embedModel.embedContent(visionResult.response.text());

        const matches = await Trade.aggregate([
            { "$vectorSearch": { "index": "trade_ai", "path": "embeddings", "queryVector": embedResult.embedding.values, "numCandidates": 100, "limit": 10 } },
            { "$match": { "status": "Open" } }
        ]);
        res.json({ description: visionResult.response.text(), matches });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- 5. ดึงงานของตัวเอง ---
exports.getMyTrades = async (req, res) => {
    try {
        const trades = await Trade.find({ owner: req.user.id }).populate("offeredProduct");
        res.json(trades);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- ฟังก์ชันเสริม (Stub) ---
exports.findMatches = async (req, res) => res.json({ message: "Coming soon" });
exports.lockTrade = async (req, res) => res.json({ message: "Trade Locked" });
exports.verifyLocation = async (req, res) => res.json({ message: "Location Verified" });
exports.confirmSwap = async (req, res) => res.json({ message: "Swap Confirmed" });
exports.cancelTrade = async (req, res) => res.json({ message: "Trade Cancelled" });