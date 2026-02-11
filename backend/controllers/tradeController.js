// controllers/tradeController.js

const Trade = require("../models/Trade");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ตรวจสอบว่ามี API KEY หรือไม่
const genAI = process.env.GEMINI_API_KEY 
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) 
    : null;

// ==========================================
// 1. สร้างประกาศแลกเปลี่ยน (Create Trade)
// ==========================================
exports.createTrade = async (req, res) => {
    try {
        const { offeredProduct, wantedCategory, description, lat, lng } = req.body;
        
        // 1. ตรวจสอบสินค้า
        const product = await Product.findById(offeredProduct);
        if (!product) {
            return res.status(404).json({ message: "ไม่พบสินค้าที่จะนำมาแลก" });
        }

        // 2. ตรวจสอบความเป็นเจ้าของ
        if (product.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "คุณไม่ใช่เจ้าของสินค้าชิ้นนี้" });
        }

        // 3. สร้าง Embedding ด้วย AI (ใส่ try-catch กันระบบล่ม)
        let embeddings = [];
        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
                const textToEmbed = `Offer: ${product.title}. Category: ${product.category}. Want: ${wantedCategory}. Description: ${description}`;
                
                const result = await model.embedContent(textToEmbed);
                embeddings = result.embedding.values;
                console.log("✅ AI Embedding Success");
            } catch (aiError) {
                console.log("⚠️ AI Error (สร้าง Trade แบบไม่มี Vector):", aiError.message);
                // ทำงานต่อโดย embeddings = []
            }
        }

        // 4. บันทึกข้อมูล
        const trade = await Trade.create({
            owner: req.user.id,
            offeredProduct,
            wantedCategory,
            description,
            lat: lat || product.lat, // ถ้าไม่ระบุพิกัดใหม่ ให้ใช้พิกัดเดียวกับสินค้า
            lng: lng || product.lng,
            embeddings 
        });

        res.status(201).json({
            message: "สร้างรายการแลกเปลี่ยนสำเร็จ",
            trade
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 2. ระบบจับคู่ (Find Matches) - แก้ไขใหม่รับ ID
// ==========================================
exports.findMatches = async (req, res) => {
    try {
        const tradeId = req.params.id; // รับ ID จาก URL

        // 1. ค้นหา Trade ของเรา
        const myTrade = await Trade.findById(tradeId);

        if (!myTrade) {
            return res.status(404).json({ message: "ไม่พบรายการแลกเปลี่ยนนี้" });
        }

        // 2. Security Check: ต้องเป็นเจ้าของเท่านั้นถึงดูคู่แมตช์ได้
        if (myTrade.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: "คุณไม่มีสิทธิ์เข้าถึงรายการนี้" });
        }

        console.log(`🔎 เริ่มค้นหาคู่แมตช์ให้กับ: ${tradeId} (อยากได้: ${myTrade.wantedCategory})`);

        let pipeline = [];

        // --- กรณี A: AI ทำงาน (มี Vector) ---
        if (myTrade.embeddings && myTrade.embeddings.length > 0) {
            console.log("🤖 ใช้ AI Vector Search...");
            pipeline.push({
                "$vectorSearch": {
                    "index": "trade_ai",
                    "path": "embeddings",
                    "queryVector": myTrade.embeddings,
                    "numCandidates": 50,
                    "limit": 10
                }
            });
            // กรองสถานะและไม่เอาของตัวเอง
            pipeline.push({ 
                "$match": { 
                    "status": "Open", 
                    "owner": { "$ne": new mongoose.Types.ObjectId(req.user.id) } 
                } 
            });
            // ดึงข้อมูลสินค้ามาแสดง
            pipeline.push({
                "$lookup": {
                    "from": "products",
                    "localField": "offeredProduct",
                    "foreignField": "_id",
                    "as": "productInfo"
                }
            });
        } 
        // --- กรณี B: AI ไม่ทำงาน (ใช้ Category Matching) ---
        else {
            console.log("⚠️ ใช้ Category Matching (Fallback)...");
            
            // 1. ดึงข้อมูลสินค้าของคนอื่นมาก่อน
            pipeline.push({
                "$lookup": {
                    "from": "products",
                    "localField": "offeredProduct",
                    "foreignField": "_id",
                    "as": "productInfo"
                }
            });
            
            // 2. แตก Array เป็น Object
            pipeline.push({ "$unwind": "$productInfo" });

            // 3. กรองเงื่อนไข
            pipeline.push({
                "$match": {
                    "status": "Open",
                    "owner": { "$ne": new mongoose.Types.ObjectId(req.user.id) }, // ไม่ใช่ของตัวเอง
                    "productInfo.category": myTrade.wantedCategory // ✅ หมวดหมู่ตรงกับที่เราอยากได้
                }
            });
        }

        const matches = await Trade.aggregate(pipeline);
        
        res.json({ 
            message: matches.length ? "เจอคู่แมตช์!" : "ยังไม่เจอคู่แมตช์",
            myRequest: {
                want: myTrade.wantedCategory,
                offer: myTrade.offeredProduct
            },
            matches 
        });

    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: err.message }); 
    }
};

// ==========================================
// 3. ล็อครายการ (Lock Trade)
// ==========================================
exports.lockTrade = async (req, res) => {
    try {
        const { partnerTradeId } = req.body; // ID ของคู่ค้าที่เราเลือก

        // อัปเดตสถานะ Trade ของเรา
        const trade = await Trade.findByIdAndUpdate(
            req.params.id,
            { 
                status: "Locked", 
                matchedWith: partnerTradeId 
            }, 
            { new: true }
        );
        
        // อัปเดตสถานะสินค้าเป็น 'pending' (จองแล้ว)
        await Product.findByIdAndUpdate(trade.offeredProduct, { status: "pending" });

        // (Optional) ควรไปอัปเดต Trade ของคู่ค้าด้วยให้เป็น Locked เหมือนกัน
        if (partnerTradeId) {
             await Trade.findByIdAndUpdate(partnerTradeId, { status: "Locked", matchedWith: req.params.id });
        }

        res.json({ message: "ล็อครายการแล้ว กำลังรอนัดพบ", trade });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// ==========================================
// 4. ตรวจสอบตำแหน่ง (Verify Location)
// ==========================================
exports.verifyLocation = async (req, res) => {
    try {
        const { userLat, userLng } = req.body;
        const trade = await Trade.findById(req.params.id);

        if (!trade) return res.status(404).json({ message: "ไม่พบรายการ" });

        // คำนวณระยะห่าง (สูตร Haversine หรือ Euclidean แบบง่ายสำหรับระยะใกล้)
        // 1 องศา ≈ 111,320 เมตร
        const dist = Math.sqrt(Math.pow(userLat - trade.lat, 2) + Math.pow(userLng - trade.lng, 2)) * 111320;

        if (dist <= 500) { // ยอมรับระยะห่างไม่เกิน 500 เมตร
            res.json({ success: true, message: "คุณอยู่ในจุดนัดพบแล้ว", distance: dist });
        } else {
            res.status(400).json({ success: false, message: "คุณยังไม่อยู่ในจุดนัดพบ", distance: dist });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 5. ยืนยันการแลกสำเร็จ (Confirm Swap)
// ==========================================
exports.confirmSwap = async (req, res) => {
    try {
        const trade = await Trade.findByIdAndUpdate(req.params.id, { status: "Completed" }, { new: true });
        
        // ลดจำนวนสินค้าลง 1
        const updatedProduct = await Product.findByIdAndUpdate(
            trade.offeredProduct,
            { $inc: { quantity: -1 } },
            { new: true }
        );

        // ถ้าสินค้าหมดสต็อก ให้ปิดการมองเห็น
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

// ==========================================
// 6. Helper Functions (ดึงข้อมูล)
// ==========================================

// ดูรายการแลกเปลี่ยนทั้งหมดที่เปิดอยู่ (Feed)
exports.getOpenTrades = async (req, res) => {
    try {
        const trades = await Trade.find({ status: "Open" })
            .populate("offeredProduct")
            .populate("owner", "username email")
            .sort("-createdAt");
        res.json(trades);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ดูรายการของฉัน
exports.getMyTrades = async (req, res) => {
    try {
        const trades = await Trade.find({ owner: req.user.id })
            .populate("offeredProduct")
            .sort("-createdAt");
        res.json(trades);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ยกเลิกรายการ
exports.cancelTrade = async (req, res) => {
    try {
        const trade = await Trade.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
        if (!trade) return res.status(404).json({ message: "ไม่พบรายการหรือคุณไม่ใช่เจ้าของ" });
        res.json({ message: "ลบรายการเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};