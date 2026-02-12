// controllers/tradeController.js
const Trade = require("../models/Trade");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ตรวจสอบ API Key
const genAI = process.env.GEMINI_API_KEY 
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) 
    : null;

// Helper: แปลงไฟล์รูปเป็น Format ที่ Gemini เข้าใจ
function fileToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType
        },
    };
}

// ==========================================
// 1. สร้างประกาศแลกเปลี่ยน (Create Trade)
// ==========================================
exports.createTrade = async (req, res) => {
    try {
        const { offeredProduct, wantedCategory, description, lat, lng } = req.body;
        
        const product = await Product.findById(offeredProduct);
        if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
        if (product.user.toString() !== req.user.id) return res.status(403).json({ message: "ไม่ใช่เจ้าของสินค้า" });

        // AI Embedding
        let embeddings = [];
        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
                const textToEmbed = `Offer: ${product.title}. Category: ${product.category}. Want: ${wantedCategory}. Description: ${description}`;
                const result = await model.embedContent(textToEmbed);
                embeddings = result.embedding.values;
            } catch (aiError) {
                console.log("⚠️ AI Error:", aiError.message);
            }
        }

        const trade = await Trade.create({
            owner: req.user.id,
            offeredProduct,
            wantedCategory,
            description,
            lat: lat || product.lat,
            lng: lng || product.lng,
            embeddings 
        });

        res.status(201).json({ message: "สร้างรายการสำเร็จ", trade });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 2. ระบบจับคู่ (Find Matches)
// ==========================================
exports.findMatches = async (req, res) => {
    try {
        const tradeId = req.params.id;
        const myTrade = await Trade.findById(tradeId);

        if (!myTrade) return res.status(404).json({ message: "ไม่พบรายการ" });
        if (myTrade.owner.toString() !== req.user.id) return res.status(403).json({ message: "ไม่มีสิทธิ์" });

        let pipeline = [];

        // กรณีมี Vector ให้ค้นหาด้วย AI
        if (myTrade.embeddings && myTrade.embeddings.length > 0) {
            pipeline.push({
                "$vectorSearch": {
                    "index": "trade_ai",
                    "path": "embeddings",
                    "queryVector": myTrade.embeddings,
                    "numCandidates": 50,
                    "limit": 10
                }
            });
            pipeline.push({ 
                "$match": { 
                    "status": "Open", 
                    "owner": { "$ne": new mongoose.Types.ObjectId(req.user.id) } 
                } 
            });
        } else {
            // Fallback: ใช้ Category Matching
            pipeline.push({
                "$lookup": {
                    "from": "products",
                    "localField": "offeredProduct",
                    "foreignField": "_id",
                    "as": "productInfo"
                }
            });
            pipeline.push({ "$unwind": "$productInfo" });
            pipeline.push({
                "$match": {
                    "status": "Open",
                    "owner": { "$ne": new mongoose.Types.ObjectId(req.user.id) },
                    "productInfo.category": myTrade.wantedCategory
                }
            });
        }

        // Lookup ข้อมูลสินค้าเพื่อส่งกลับไปแสดงผล
        pipeline.push({
            "$lookup": {
                "from": "products",
                "localField": "offeredProduct",
                "foreignField": "_id",
                "as": "productDetails"
            }
        });

        const matches = await Trade.aggregate(pipeline);
        res.json({ message: matches.length ? "เจอคู่แมตช์!" : "ยังไม่เจอ", matches });

    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// ==========================================
// 3. ค้นหาด้วยข้อความ (Manual Search) - ✅ เพิ่มใหม่
// ==========================================
exports.manualSearch = async (req, res) => {
    try {
        const { q } = req.query; // รับค่า ?q=... จาก URL
        if (!q) return res.status(400).json({ message: "กรุณาระบุคำค้นหา" });

        // ค้นหาใน Description หรือ WantedCategory ของ Trade
        // หรือจะ Advance ขึ้นด้วยการ Lookup ไปหาชื่อสินค้าก็ได้ (อันนี้เอาแบบ Basic ก่อน)
        const trades = await Trade.find({
            status: "Open",
            $or: [
                { description: { $regex: q, $options: "i" } },
                { wantedCategory: { $regex: q, $options: "i" } }
            ]
        }).populate("offeredProduct");

        res.json(trades);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 4. ค้นหาด้วยรูปภาพ (Search By Image) - ✅ เพิ่มใหม่
// ==========================================
exports.searchByImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "กรุณาอัพโหลดรูปภาพ" });
        if (!genAI) return res.status(500).json({ message: "ระบบ AI ไม่พร้อมใช้งาน" });

        // 1. ใช้ Gemini Vision ดูรูปแล้วแปลงเป็น Text Description
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // หรือ gemini-pro-vision
        const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);
        
        const prompt = "Describe this item in detail for a barter trade. Focus on what it is, its category, and condition.";
        const generatedContent = await model.generateContent([prompt, imagePart]);
        const description = generatedContent.response.text();
        
        console.log("🖼️ AI Description:", description);

        // 2. เอาคำบรรยายไปแปลงเป็น Vector
        const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await embedModel.embedContent(description);
        const vector = result.embedding.values;

        // 3. ใช้ Vector ค้นหา Trade ที่คล้ายกัน
        const matches = await Trade.aggregate([
            {
                "$vectorSearch": {
                    "index": "trade_ai",
                    "path": "embeddings",
                    "queryVector": vector,
                    "numCandidates": 50,
                    "limit": 10
                }
            },
            { 
                "$match": { 
                    "status": "Open", 
                    "owner": { "$ne": new mongoose.Types.ObjectId(req.user.id) } 
                } 
            },
            {
                "$lookup": {
                    "from": "products",
                    "localField": "offeredProduct",
                    "foreignField": "_id",
                    "as": "productDetails"
                }
            }
        ]);

        res.json({ 
            message: "ค้นหาด้วยรูปภาพสำเร็จ", 
            aiDescription: description,
            matches 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 5. ล็อครายการ, ตรวจสอบพิกัด, ยืนยันแลก (Flow ปกติ)
// ==========================================
exports.lockTrade = async (req, res) => {
    try {
        const { partnerTradeId } = req.body;
        const trade = await Trade.findByIdAndUpdate(req.params.id, 
            { status: "Locked", matchedWith: partnerTradeId }, 
            { new: true }
        );
        await Product.findByIdAndUpdate(trade.offeredProduct, { status: "pending" });
        
        if (partnerTradeId) {
             await Trade.findByIdAndUpdate(partnerTradeId, { status: "Locked", matchedWith: req.params.id });
        }
        res.json({ message: "ล็อครายการแล้ว", trade });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.verifyLocation = async (req, res) => {
    try {
        const { userLat, userLng } = req.body;
        const trade = await Trade.findById(req.params.id);
        if (!trade) return res.status(404).json({ message: "ไม่พบรายการ" });

        const dist = Math.sqrt(Math.pow(userLat - trade.lat, 2) + Math.pow(userLng - trade.lng, 2)) * 111320;
        
        if (dist <= 500) {
            res.json({ success: true, message: "อยู่ในจุดนัดพบ", distance: dist });
        } else {
            res.status(400).json({ success: false, message: "ยังไม่ถึงจุดนัดพบ", distance: dist });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.confirmSwap = async (req, res) => {
    try {
        const trade = await Trade.findByIdAndUpdate(req.params.id, { status: "Completed" }, { new: true });
        const updatedProduct = await Product.findByIdAndUpdate(trade.offeredProduct, { $inc: { quantity: -1 } }, { new: true });
        
        if (updatedProduct.quantity <= 0) {
            await Product.findByIdAndUpdate(trade.offeredProduct, { status: "exchanged", isActive: false });
        }
        res.json({ message: "แลกเปลี่ยนสำเร็จ!", trade });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// 6. Helper Functions
// ==========================================
exports.getOpenTrades = async (req, res) => {
    try {
        const trades = await Trade.find({ status: "Open" })
            .populate("offeredProduct")
            .populate("owner", "username email")
            .sort("-createdAt");
        res.json(trades);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getMyTrades = async (req, res) => {
    try {
        const trades = await Trade.find({ owner: req.user.id }).populate("offeredProduct").sort("-createdAt");
        res.json(trades);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.cancelTrade = async (req, res) => {
    try {
        const trade = await Trade.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
        if (!trade) return res.status(404).json({ message: "ไม่พบรายการ" });
        res.json({ message: "ลบรายการเรียบร้อย" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};