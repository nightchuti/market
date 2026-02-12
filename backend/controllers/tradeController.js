// controllers/tradeController.js

const Trade = require("../models/Trade");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

/* ================================
   Gemini AI Setup
================================ */
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

/* ================================
   1. Create Trade
================================ */
exports.createTrade = async (req, res) => {
  try {
    const { offeredProduct, wantedCategory, description, lat, lng } = req.body;

    const product = await Product.findById(offeredProduct);
    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
    if (product.user.toString() !== req.user.id)
      return res.status(403).json({ message: "ไม่ใช่เจ้าของสินค้า" });

    let embeddings = [];

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({
          model: "text-embedding-004",
        });
        const text = `Offer: ${product.title}. Category: ${product.category}. Want: ${wantedCategory}. Description: ${description}`;
        const result = await model.embedContent(text);
        embeddings = result.embedding.values;
      } catch (e) {
        console.log("AI Error:", e.message);
      }
    }

    const trade = await Trade.create({
      owner: req.user.id,
      offeredProduct,
      wantedCategory,
      description,
      lat: lat || product.lat,
      lng: lng || product.lng,
      embeddings,
    });

    res.status(201).json({ message: "สร้างรายการสำเร็จ", trade });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   2. Find Matches
================================ */
exports.findMatches = async (req, res) => {
  try {
    const myTrade = await Trade.findById(req.params.id);
    if (!myTrade) return res.status(404).json({ message: "ไม่พบรายการ" });
    if (myTrade.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "ไม่มีสิทธิ์" });

    let pipeline = [];

    if (myTrade.embeddings?.length) {
      pipeline.push({
        $vectorSearch: {
          index: "trade_ai",
          path: "embeddings",
          queryVector: myTrade.embeddings,
          numCandidates: 50,
          limit: 10,
        },
      });
    } else {
      pipeline.push({
        $lookup: {
          from: "products",
          localField: "offeredProduct",
          foreignField: "_id",
          as: "productInfo",
        },
      });
      pipeline.push({ $unwind: "$productInfo" });
      pipeline.push({
        $match: {
          "productInfo.category": myTrade.wantedCategory,
        },
      });
    }

    pipeline.push({
      $match: {
        status: "Open",
        owner: { $ne: new mongoose.Types.ObjectId(req.user.id) },
      },
    });

    pipeline.push({
      $lookup: {
        from: "products",
        localField: "offeredProduct",
        foreignField: "_id",
        as: "productDetails",
      },
    });

    const matches = await Trade.aggregate(pipeline);
    res.json({ message: "เจอคู่แมตช์", matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   3. Manual Search
================================ */
exports.manualSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: "กรุณาระบุคำค้นหา" });

    const trades = await Trade.find({
      status: "Open",
      $or: [
        { description: { $regex: q, $options: "i" } },
        { wantedCategory: { $regex: q, $options: "i" } },
      ],
    }).populate("offeredProduct");

    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   4. Search By Image
================================ */
exports.searchByImage = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพ" });
    if (!genAI)
      return res.status(500).json({ message: "ยังไม่ได้ตั้งค่า Gemini API" });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imagePart = fileToGenerativePart(
      req.file.buffer,
      req.file.mimetype
    );

    const prompt =
      "Describe this item in detail for a barter trade. Focus on category and condition.";
    const result = await model.generateContent([prompt, imagePart]);
    const description = result.response.text();

    const embedModel = genAI.getGenerativeModel({
      model: "text-embedding-004",
    });
    const embed = await embedModel.embedContent(description);

    const matches = await Trade.aggregate([
      {
        $vectorSearch: {
          index: "trade_ai",
          path: "embeddings",
          queryVector: embed.embedding.values,
          numCandidates: 50,
          limit: 10,
        },
      },
      {
        $match: {
          status: "Open",
          owner: { $ne: new mongoose.Types.ObjectId(req.user.id) },
        },
      },
    ]);

    res.json({ description, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   5. Lock Trade
================================ */
exports.lockTrade = async (req, res) => {
  try {
    const trade = await Trade.findByIdAndUpdate(
      req.params.id,
      { status: "Locked", matchedWith: req.body.partnerTradeId },
      { new: true }
    );
    res.json(trade);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   6. Verify Location
================================ */
exports.verifyLocation = async (req, res) => {
  try {
    const { userLat, userLng } = req.body;
    const trade = await Trade.findById(req.params.id);

    const dist =
      Math.sqrt(
        Math.pow(userLat - trade.lat, 2) +
          Math.pow(userLng - trade.lng, 2)
      ) * 111320;

    res.json({ distance: dist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   7. Confirm Swap
================================ */
exports.confirmSwap = async (req, res) => {
  try {
    const trade = await Trade.findByIdAndUpdate(
      req.params.id,
      { status: "Completed" },
      { new: true }
    );
    res.json(trade);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   8. Get Trades
================================ */
exports.getOpenTrades = async (req, res) => {
  const trades = await Trade.find({ status: "Open" }).populate(
    "offeredProduct"
  );
  res.json(trades);
};

exports.getMyTrades = async (req, res) => {
  const trades = await Trade.find({ owner: req.user.id }).populate(
    "offeredProduct"
  );
  res.json(trades);
};

exports.cancelTrade = async (req, res) => {
  await Trade.findByIdAndDelete(req.params.id);
  res.json({ message: "ลบเรียบร้อย" });
};
