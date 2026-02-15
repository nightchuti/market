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
  if (product.isLocked) {
  return res.status(400).json({ message: "สินค้านี้ถูกใช้ในดีลอยู่แล้ว" });
}

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
    if (myTrade.embeddings && myTrade.embeddings.length > 10) {
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
    const q = req.query.q || "";
    const trades = await Trade.find({
      status: "Open",
      owner: { $ne: req.user.id },
      $or: [
        { description: { $regex: q, $options: "i" } },
        { wantedCategory: { $regex: q, $options: "i" } }
      ]
    }).populate("offeredProduct"); // ต้อง Populate เพื่อให้ Frontend เห็นรูป

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
exports.lockTrade = async (req, res) => {
  try {
    const { partnerTradeId } = req.body;

    const myTrade = await Trade.findById(req.params.id);
    const partnerTrade = await Trade.findById(partnerTradeId);

    if (!myTrade || !partnerTrade) {
      return res.status(404).json({ message: "ไม่พบรายการเทรด" });
    }

    if (myTrade.status !== "Open" || partnerTrade.status !== "Open") {
      return res.status(400).json({ message: "บางรายการไม่อยู่ในสถานะ Open" });
    }

    // 🔒 Lock ทั้ง 2 Trade
    myTrade.status = "Locked";
    myTrade.matchedWith = partnerTrade._id;

    partnerTrade.status = "Locked";
    partnerTrade.matchedWith = myTrade._id;

    await myTrade.save();
    await partnerTrade.save();

    // 🔒 Lock Product ทั้ง 2 ตัว
    await Product.findByIdAndUpdate(myTrade.offeredProduct, {
      isLocked: true
    });

    await Product.findByIdAndUpdate(partnerTrade.offeredProduct, {
      isLocked: true
    });

    res.json({
      message: "ล็อกดีลสำเร็จ",
      myTrade,
      partnerTrade
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (v) => v * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


exports.confirmSwap = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: "ไม่พบดีล" });

    trade.status = "Completed";
    await trade.save();

    // คู่ของมัน
    if (trade.matchedWith) {
      const partner = await Trade.findById(trade.matchedWith);
      if (partner) {
        partner.status = "Completed";
        await partner.save();

        await Product.findByIdAndUpdate(partner.offeredProduct, {
          isLocked: false
        });
      }
    }

    await Product.findByIdAndUpdate(trade.offeredProduct, {
      isLocked: false
    });

    res.json({ message: "ยืนยันการแลกสำเร็จ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: "ไม่พบดีล" });

    // ปลดล็อก product ของฝั่งนี้
    await Product.findByIdAndUpdate(trade.offeredProduct, {
      isLocked: false
    });

    // ถ้ามีคู่
    if (trade.matchedWith) {
      const partner = await Trade.findById(trade.matchedWith);

      if (partner) {
        partner.status = "Open";
        partner.matchedWith = null;
        await partner.save();

        await Product.findByIdAndUpdate(partner.offeredProduct, {
          isLocked: false
        });
      }
    }

    await Trade.findByIdAndDelete(req.params.id);

    res.json({ message: "ยกเลิกดีลเรียบร้อย" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ ต้องอยู่นอก cancelTrade
exports.verifyLocation = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade) {
      return res.status(404).json({ message: "ไม่พบดีล" });
    }

    trade.locationVerified = true; // ถ้ามี field นี้
    await trade.save();

    res.json({ message: "ยืนยันตำแหน่งเรียบร้อย" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  createTrade: exports.createTrade,
  findMatches: exports.findMatches,
  manualSearch: exports.manualSearch,
  searchByImage: exports.searchByImage,
  lockTrade: exports.lockTrade,
  verifyLocation: exports.verifyLocation,
  confirmSwap: exports.confirmSwap,
  getOpenTrades: exports.getOpenTrades,
  getMyTrades: exports.getMyTrades,
  cancelTrade: exports.cancelTrade
};
