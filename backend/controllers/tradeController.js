const Trade = require("../models/Trade");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

/* ===== Gemini Setup ===== */

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

/* ===== Create Trade ===== */

exports.createTrade = async (req, res) => {
  try {
    const {
      offeredProduct,
      wantedCategory,
      description,
      wantedPriceRange,
      lat,
      lng
    } = req.body;

    const product = await Product.findById(offeredProduct);

    if (!product)
      return res.status(404).json({ message: "ไม่พบสินค้า" });

    if (product.user.toString() !== req.user.id)
      return res.status(403).json({ message: "ไม่ใช่เจ้าของสินค้า" });

    let embeddings = [];

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({
          model: "text-embedding-004"
        });

        const text = `
        Offer: ${product.title}
        Category: ${product.category}
        Want: ${wantedCategory}
        Desc: ${description}
        `;

        const result = await model.embedContent(text);
        embeddings = result.embedding.values;
      } catch (err) {
        console.log("AI Error:", err.message);
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

/* ===== Find Matches ===== */

exports.findMatches = async (req, res) => {
  try {
    const myTrade = await Trade.findById(req.params.id);

    if (!myTrade)
      return res.status(404).json({ message: "ไม่พบรายการ" });

    if (myTrade.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "ไม่มีสิทธิ์" });

    const pipeline = [];

    if (myTrade.embeddings.length) {
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
        $match: {
          "productInfo.category": myTrade.wantedCategory
        }
      });
    }

    pipeline.push({
      $match: {
        status: "Open",
        owner: { $ne: new mongoose.Types.ObjectId(req.user.id) }
      }
    });

    const matches = await Trade.aggregate(pipeline);
    res.json(matches);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ===== Manual Search ===== */

exports.manualSearch = async (req, res) => {
  const q = req.query.q;

  const trades = await Trade.find({
    status: "Open",
    $or: [
      { description: { $regex: q, $options: "i" } },
      { wantedCategory: { $regex: q, $options: "i" } }
    ]
  }).populate("offeredProduct");

  res.json(trades);
};

/* ===== Search By Image ===== */

exports.searchByImage = async (req, res) => {
  if (!genAI)
    return res.status(500).json({ message: "ยังไม่ได้ตั้งค่า AI" });

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash"
  });

  const imagePart = fileToGenerativePart(
    req.file.buffer,
    req.file.mimetype
  );

  const result = await model.generateContent([
    "Describe this item for barter",
    imagePart
  ]);

  const description = result.response.text();

  const embedModel = genAI.getGenerativeModel({
    model: "text-embedding-004"
  });

  const embed = await embedModel.embedContent(description);

  const matches = await Trade.aggregate([
    {
      $vectorSearch: {
        index: "trade_ai",
        path: "embeddings",
        queryVector: embed.embedding.values,
        numCandidates: 50,
        limit: 10
      }
    }
  ]);

  res.json({ description, matches });
};

/* ===== Lock ===== */

exports.lockTrade = async (req, res) => {
  const trade = await Trade.findByIdAndUpdate(
    req.params.id,
    {
      status: "Locked",
      matchedWith: req.body.partnerTradeId
    },
    { new: true }
  );

  res.json(trade);
};

/* ===== Verify ===== */

exports.verifyLocation = async (req, res) => {
  const trade = await Trade.findById(req.params.id);

  const dist =
    Math.sqrt(
      Math.pow(req.body.userLat - trade.lat, 2) +
      Math.pow(req.body.userLng - trade.lng, 2)
    ) * 111320;

  res.json({ distance: dist });
};

/* ===== Confirm ===== */

exports.confirmSwap = async (req, res) => {
  const trade = await Trade.findByIdAndUpdate(
    req.params.id,
    { status: "Completed" },
    { new: true }
  );

  res.json(trade);
};

/* ===== Lists ===== */

exports.getOpenTrades = async (req, res) => {
  const trades = await Trade.find({ status: "Open" })
    .populate("offeredProduct");

  res.json(trades);
};

exports.getMyTrades = async (req, res) => {
  const trades = await Trade.find({ owner: req.user.id })
    .populate("offeredProduct");

  res.json(trades);
};

exports.cancelTrade = async (req, res) => {
  await Trade.findByIdAndDelete(req.params.id);
  res.json({ message: "ลบเรียบร้อย" });
};
