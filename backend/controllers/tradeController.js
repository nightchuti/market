exports.manualSearch = async (req, res) => {
    try {
        const { q } = req.query; // รับคำค้นหาจาก /search?q=กล้อง
        if (!q) return res.status(400).json({ message: "กรุณาใส่คำค้นหา" });

        // แปลงคำค้นหาเป็น Vector
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(q);
        const vector = result.embedding.values;

        // ค้นหาความหมายที่ใกล้เคียงในฐานข้อมูล
        const matches = await Trade.aggregate([
            {
                "$vectorSearch": {
                    "index": "trade_ai",
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

// [เพิ่มใหม่] 2. ฟังก์ชันค้นหาด้วยรูปภาพ (Image-to-Vector Search)
exports.searchByImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพ" });

        // 🧠 ใช้ Gemini 1.5 Flash วิเคราะห์รูปภาพเป็นข้อความบรรยายสินค้าก่อน
        const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imagePart = {
            inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype }
        };

        const visionResult = await visionModel.generateContent(["Describe this product shortly for searching", imagePart]);
        const aiDescription = visionResult.response.text();

        // ⚡ แปลงคำบรรยายที่ได้เป็น Vector
        const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embeddingResult = await embeddingModel.embedContent(aiDescription);
        const vector = embeddingResult.embedding.values;

        // ค้นหาสินค้าที่หน้าตาหรือประเภทใกล้เคียง
        const matches = await Trade.aggregate([
            {
                "$vectorSearch": {
                    "index": "trade_ai",
                    "path": "embeddings",
                    "queryVector": vector,
                    "numCandidates": 100,
                    "limit": 10
                }
            },
            { "$match": { "status": "Open" } }
        ]);

        res.json({ aiAnalysis: aiDescription, matches });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "การค้นหาด้วยรูปภาพผิดพลาด" });
    }
};