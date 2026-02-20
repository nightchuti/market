// backend/controllers/tradeController.js
const Trade = require("../models/Trade");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Setup Gemini
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    }
  };
}

// 1. Create Trade
exports.createTrade = async (req, res) => {
  try {
    const { offeredProduct, wantedCategory, description, wantedPriceRange, lat, lng } = req.body;

    const product = await Product.findById(offeredProduct);
    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
    if (product.user.toString() !== req.user.id) return res.status(403).json({ message: "ไม่ใช่เจ้าของสินค้า" });

    // AI Embedding
    let embeddings = [];
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const text = `Offer: ${product.title} Category: ${product.category} Want: ${wantedCategory} Desc: ${description}`;
        const result = await model.embedContent(text);
        embeddings = result.embedding.values;
      } catch (err) {
        console.log("AI Error (Skip):", err.message);
      }
    }

    const trade = await Trade.create({
      owner: req.user.id,
      offeredProduct,
      wantedCategory,
      description,
      wantedPriceRange,
      lat: lat || product.lat,
      lng: lng || product.lng,
      embeddings
    });

    res.status(201).json(trade);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Find Matches
exports.findMatches = async (req, res) => {
  try {
    const myTrade = await Trade.findById(req.params.id);
    if (!myTrade) return res.status(404).json({ message: "ไม่พบรายการ" });

    // สร้าง Pipeline
    const pipeline = [];

    // ถ้ามี Embedding ใช้ Vector Search
    if (myTrade.embeddings && myTrade.embeddings.length > 0) {
      pipeline.push({
        $vectorSearch: {
          index: "trade_ai",
          path: "embeddings",
          queryVector: myTrade.embeddings,
          numCandidates: 50,
          limit: 10
        }
      });
    } else {
      // ถ้าไม่มี ใช้ Category Matching
      pipeline.push({
        $lookup: {
          from: "products",
          localField: "offeredProduct",
          foreignField: "_id",
          as: "productInfo"
        }
      });
      pipeline.push({ $unwind: "$productInfo" });
      pipeline.push({
        $match: { "productInfo.category": myTrade.wantedCategory }
      });
    }

    // Common Filters
    pipeline.push({
      $match: {
        status: "Open",
        owner: { $ne: new mongoose.Types.ObjectId(req.user.id) }
      }
    });

    // Populate กลับมาเพื่อให้ Frontend แสดงรูปได้
    pipeline.push({
      $lookup: {
        from: "products",
        localField: "offeredProduct",
        foreignField: "_id",
        as: "offeredProduct" // ทับ field เดิมให้เป็น Object
      }
    });
    pipeline.push({ $unwind: "$offeredProduct" });

    const matches = await Trade.aggregate(pipeline);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Manual Search
exports.manualSearch = async (req, res) => {
  try {
    // ✅ จำกัดความยาว input (กัน ReDoS)
    let q = (req.query.q || "").substring(0, 50);

    // ✅ Escape regex characters กัน injection
    q = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

// 4. Search By Image
exports.searchByImage = async (req, res) => {
  try {
    if (!genAI || !req.file) return res.status(400).json({ message: "ข้อมูลไม่ครบ" });

    // 1. Describe Image
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);
    const result = await model.generateContent(["Describe item for barter trade", imagePart]);
    const description = result.response.text();

    // 2. Embed Description
    const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const embed = await embedModel.embedContent(description);

    // 3. Search
    const matches = await Trade.aggregate([
      {
        $vectorSearch: {
          index: "trade_ai",
          path: "embeddings",
          queryVector: embed.embedding.values,
          numCandidates: 50,
          limit: 10
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "offeredProduct",
          foreignField: "_id",
          as: "offeredProduct"
        }
      },
      { $unwind: "$offeredProduct" }
    ]);

    res.json({ description, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Actions (Lock, Verify, Confirm)
// 🔥 เพิ่มเงื่อนไขก่อน lock
exports.lockTrade = async (req, res) => {
  try {
    const { tradeId } = req.body;

    const updated = await Trade.findOneAndUpdate(
      {
        _id: tradeId,
        owner: req.user.id,
        status: "Matched"
      },
      {
        status: "Locked",
        verificationCode: Math.floor(100000 + Math.random() * 900000).toString()
      },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({
        error: "Trade not found, not authorized, or not matched"
      });
    }

    res.json(updated);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyLocation = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: "Not found" });
    const dist = Math.sqrt(Math.pow(req.body.userLat - trade.lat, 2) + Math.pow(req.body.userLng - trade.lng, 2)) * 111320;
    res.json({ distance: dist, inRange: dist <= 500 });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 🔥 แก้ confirmSwap
exports.confirmSwap = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tradeId } = req.body;

    const trade = await Trade.findById(tradeId).session(session);

    if (!trade) {
      throw new Error("Trade not found");
    }

    if (trade.status === "Completed") {
      throw new Error("Trade already completed");
    }

    if (req.body.code !== trade.verificationCode) {
      throw new Error("Invalid verification code");
    }

    // ✅ update trade หลัก
    trade.status = "Completed";
    await trade.save({ session });

    // ✅ update matchedWith ถ้ามี
    if (trade.matchedWith) {
      await Trade.findByIdAndUpdate(
        trade.matchedWith,
        { status: "Completed" },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
};

// 6. Get Lists
exports.getOpenTrades = async (req, res) => {
  try {
    const trades = await Trade.find({ status: "Open" })
      .populate("offeredProduct") // สำคัญ!
      .sort("-createdAt");
    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyTrades = async (req, res) => {
  try {
    const trades = await Trade.find({ owner: req.user.id })
      .populate("offeredProduct");
    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelTrade = async (req, res) => {
  try {
    await Trade.findByIdAndDelete(req.params.id);
    res.json({ message: "ลบเรียบร้อย" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};