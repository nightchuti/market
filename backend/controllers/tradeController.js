const Trade = require("../models/Trade");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 1. สร้างประกาศ (AI Encoding) ---
exports.createTrade = async (req, res) => {
    try {
        const { offeredProduct, wantedCategory, description, lat, lng } = req.body;
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const textToEmbed = `Product: ${offeredProduct}. Looking for: ${wantedCategory}. Details: ${description || ''}`;
        
        const result = await model.embedContent(textToEmbed);
        const vector = result.embedding.values;

        const trade = await Trade.create({
            ...req.body,
            owner: req.user.id,
            embeddings: vector 
        });
        res.status(201).json(trade);
    } catch (err) {
        res.status(500).json({ message: "Create Error", error: err.message });
    }
};

// --- 2. หาคู่แมตช์อัตโนมัติ (AI Matching) ---
exports.findMatches = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);
        if (!trade || !trade.embeddings.length) return res.status(404).json({ message: "No AI Data" });

        const matches = await Trade.aggregate([
            {
                "$vectorSearch": {
                    "index": "trade_AI",
                    "path": "embeddings",
                    "queryVector": trade.embeddings,
                    "numCandidates": 100,
                    "limit": 10
                }
            },
            { "$match": { "status": "Open", "owner": { "$ne": trade.owner } } }
        ]);
        res.json(matches);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- 3. ค้นหาด้วยรูปภาพ (Visual Search) ---
exports.searchByImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Please upload an image" });
        
        const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imagePart = { inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype } };
        
        const visionResult = await visionModel.generateContent(["Describe this product for search", imagePart]);
        const description = visionResult.response.text();

        const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embedResult = await embedModel.embedContent(description);

        const matches = await Trade.aggregate([
            { "$vectorSearch": { "index": "trade_AI", "path": "embeddings", "queryVector": embedResult.embedding.values, "numCandidates": 100, "limit": 10 } }
        ]);
        res.json({ aiDescription: description, matches });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- 4. ยืนยันรหัส (Confirm Swap) ---
exports.confirmSwap = async (req, res) => {
    try {
        const { inputCode } = req.body;
        const myTrade = await Trade.findById(req.params.id);
        const partnerTrade = await Trade.findById(myTrade.matchedWith);

        if (partnerTrade.verificationCode !== inputCode) return res.status(400).json({ message: "Invalid Code" });

        myTrade.status = "Completed";
        partnerTrade.status = "Completed";
        await myTrade.save();
        await partnerTrade.save();
        res.json({ message: "Swap Successful!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- 5. ดึงรายการทั้งหมด (ที่ขาดไป) ---
exports.getOpenTrades = async (req, res) => {
    try {
        const trades = await Trade.find({ status: "Open" })
            .populate("owner", "username email");
        res.json(trades);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- 6. ล็อครายการเพื่อนัดหมาย (ที่ขาดไป) ---
exports.lockTrade = async (req, res) => {
    try {
        const { partnerTradeId } = req.body;
        const trade = await Trade.findById(req.params.id);
        const partnerTrade = await Trade.findById(partnerTradeId);

        if (!trade || !partnerTrade) return res.status(404).json({ message: "ไม่พบรายการ" });

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        trade.status = "Matched";
        trade.matchedWith = partnerTradeId;
        trade.verificationCode = code;    

        partnerTrade.status = "Matched";
        partnerTrade.matchedWith = trade._id;

        await trade.save();
        await partnerTrade.save();

        res.json({ message: "นัดหมายสำเร็จ", verificationCode: code });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- 7. ค้นหาด้วยข้อความ (Manual Search) ---
exports.manualSearch = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ message: "กรุณาระบุคำค้นหา" });

        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(q);
        const vector = result.embedding.values;

        const matches = await Trade.aggregate([
            {
                "$vectorSearch": {
                    "index": "trade_AI",
                    "path": "embeddings",
                    "queryVector": vector,
                    "numCandidates": 100,
                    "limit": 10
                }
            },
            { "$match": { "status": "Open" } }
        ]);
        res.json(matches);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- 8. ยืนยันพิกัด (Verify Location) ---
exports.verifyLocation = async (req, res) => {
    res.json({ message: "Location verified", verified: true });
};
// เพิ่มเติม: manualSearch, lockTrade, verifyLocation (ใช้ตามที่คุยกันก่อนหน้าได้เลย)