const Trade = require("../models/Trade");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. สร้างประกาศ (ดึงข้อมูลจาก Product เดิมมาทำ Embedding)
exports.createTrade = async (req, res) => {
    try {
        const { offeredProduct, wantedCategory, description, lat, lng } = req.body;

        const product = await Product.findById(offeredProduct);
        if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });

        // AI สกัดใจความสำคัญเพื่อทำ Vector
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const text = `Product: ${product.title}. Want to swap for: ${wantedCategory}. Details: ${description}`;
        const result = await model.embedContent(text);

        const trade = await Trade.create({
            owner: req.user.id,
            offeredProduct,
            wantedCategory,
            description,
            lat: lat || product.lat, // ถ้าหน้าบ้านไม่ส่งมา ให้ใช้พิกัดเดิมของสินค้า
            lng: lng || product.lng,
            embeddings: result.embedding.values
        });
        res.status(201).json(trade);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. ระบบจับคู่ AI (Auto Match)
exports.findMatches = async (req, res) => {
    try {
        const myTrade = await Trade.findOne({ owner: req.user.id, status: "Open" }).sort("-createdAt");
        if (!myTrade) return res.status(404).json({ message: "คุณยังไม่มีรายการประกาศแลก" });

        const matches = await Trade.aggregate([
            {
                "$vectorSearch": {
                    "index": "trade_ai", // ชื่อ index ใน MongoDB Atlas
                    "path": "embeddings",
                    "queryVector": myTrade.embeddings,
                    "numCandidates": 100,
                    "limit": 10
                }
            },
            { "$match": { "status": "Open", "owner": { "$ne": new mongoose.Types.ObjectId(req.user.id) } } },
            { "$lookup": { "from": "products", "localField": "offeredProduct", "foreignField": "_id", "as": "productInfo" } }
        ]);
        res.json(matches);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. ล็อครายการ (เมื่อตกลงจะแลกกัน)
exports.lockTrade = async (req, res) => {
    try {
        const trade = await Trade.findByIdAndUpdate(req.params.id,
            { status: "Locked", matchedWith: req.body.partnerTradeId }, { new: true });
        
        // อัปเดตสถานะสินค้าต้นทางเป็น 'pending' (กำลังดำเนินการ)
        await Product.findByIdAndUpdate(trade.offeredProduct, { status: "pending" });

        res.json({ message: "ล็อครายการแล้ว กำลังรอนัดพบ", trade });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// 4. ตรวจสอบตำแหน่ง (Security Check)
exports.verifyLocation = async (req, res) => {
    const { userLat, userLng } = req.body;
    const trade = await Trade.findById(req.params.id);

    // คำนวณระยะห่าง (หน่วยเมตร)
    const dist = Math.sqrt(Math.pow(userLat - trade.lat, 2) + Math.pow(userLng - trade.lng, 2)) * 111320;

    if (dist <= 200) { // ห่างไม่เกิน 200 เมตร
        res.json({ success: true, message: "คุณอยู่ในจุดนัดพบแล้ว" });
    } else {
        res.status(400).json({ success: false, message: "คุณยังไม่อยู่ในจุดนัดพบ" });
    }
};

// 5. ยืนยันการแลกสำเร็จ (จบงาน)
exports.confirmSwap = async (req, res) => {
    try {
        const trade = await Trade.findByIdAndUpdate(req.params.id, { status: "Completed" }, { new: true });
        
        // ลดจำนวนสินค้าลง 1
        const updatedProduct = await Product.findByIdAndUpdate(
            trade.offeredProduct,
            { $inc: { quantity: -1 } },
            { new: true }
        );

        // ถ้าสินค้าหมดสต็อก ให้ปิดการมองเห็น (isActive: false) และเปลี่ยนสถานะ
        if (updatedProduct.quantity <= 0) {
            await Product.findByIdAndUpdate(trade.offeredProduct, {
                status: "exchanged",
                isActive: false
            });
        }

        res.json({ message: "การแลกเปลี่ยนเสร็จสมบูรณ์!", trade });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// ฟังก์ชันดึงข้อมูลเบื้องต้น
exports.getOpenTrades = async (req, res) => {
    const trades = await Trade.find({ status: "Open" }).populate("offeredProduct").populate("owner", "username");
    res.json(trades);
};
exports.manualSearch = async (req, res) => { /* โค้ด Vector Search เหมือนข้อ 2 แต่ใช้คำค้นหาจาก req.query.q */ };
exports.searchByImage = async (req, res) => { /* โค้ด Gemini Vision ตามที่เคยให้ไว้ */ };
exports.getMyTrades = async (req, res) => {
    const trades = await Trade.find({ owner: req.user.id }).populate("offeredProduct");
    res.json(trades);
};
exports.cancelTrade = async (req, res) => {
    await Trade.findByIdAndDelete(req.params.id);
    res.json({ message: "ยกเลิกแล้ว" });
};