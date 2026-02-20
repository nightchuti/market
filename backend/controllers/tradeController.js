// backend/controllers/tradeController.js
const Trade = require("../models/Trade");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ChatRoom = require("../models/ChatRoomTalk");

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

    // ✅ ตรวจซ้ำตรงนี้
    const existing = await Trade.findOne({
      offeredProduct,
      owner: req.user.id,
      status: { $in: ["Open", "Matched", "Locked"] }
    });

    if (existing) {
      return res.status(400).json({ message: "คุณมี trade นี้อยู่แล้ว" });
    }

    const product = await Product.findById(offeredProduct);
    if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });

    if (product.user.toString() !== req.user.id)
      return res.status(403).json({ message: "ไม่ใช่เจ้าของสินค้า" });

    if (product.status !== "available")
      return res.status(400).json({ message: "สินค้านี้ไม่พร้อมสำหรับเทรด" });


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
    const tradeId = req.params.id;

    // ✅ กัน id ปลอม
    if (!mongoose.Types.ObjectId.isValid(tradeId)) {
      return res.status(400).json({ message: "Invalid trade id" });
    }

    const myTrade = await Trade.findById(tradeId);
    if (!myTrade) {
      return res.status(404).json({ message: "ไม่พบรายการ" });
    }

    // ✅ กันดู trade คนอื่น
    if (myTrade.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const pipeline = [];

    // 🔹 Vector Search
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
      // 🔹 Category Match fallback
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

    // ✅ Common Security Filters
    pipeline.push({
      $match: {
        status: "Open",
        owner: { $ne: new mongoose.Types.ObjectId(req.user.id) },
        _id: { $ne: myTrade._id } // 🔥 กัน match ตัวเอง
      }
    });

    // 🔹 Populate product
    pipeline.push({
      $lookup: {
        from: "products",
        localField: "offeredProduct",
        foreignField: "_id",
        as: "offeredProduct"
      }
    });

    pipeline.push({ $unwind: "$offeredProduct" });

    pipeline.push({
      $match: {
        "offeredProduct.status": "available"
      }
    });

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tradeId } = req.body;

    const trade = await Trade.findOne({
      _id: tradeId,
      owner: req.user.id,
      status: "Matched"
    }).session(session);

    if (!trade) {
      throw new Error("Trade not found or not authorized");
    }

    if (trade.status === "Locked") {
      throw new Error("Already locked");
    }

    trade.status = "Locked";
    trade.verificationCode =
      Math.floor(100000 + Math.random() * 900000).toString();

    await trade.save({ session });

    if (trade.matchedWith) {
      await Trade.findByIdAndUpdate(
        trade.matchedWith,
        { status: "Locked" },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.json(trade);

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
};

// 🔥 แก้ confirmSwap
exports.confirmSwap = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tradeId, code } = req.body;

    const trade = await Trade.findOne({
      _id: tradeId,
      owner: req.user.id,
      status: "Locked",
      verificationCode: code
    }).session(session);

    if (!trade) {
      throw new Error("Invalid or already completed trade");
    }

    // 🔎 ดึง matched trade ก่อน
    let matchedTrade = null;

    if (trade.matchedWith) {
      matchedTrade = await Trade.findById(trade.matchedWith).session(session);
    }

    if (!matchedTrade || matchedTrade.status !== "Locked") {
      throw new Error("Waiting for other party to lock trade");
    }

    // ✅ อัปเดตทั้งสองฝั่งเป็น Completed
    trade.status = "Completed";
    trade.verificationCode = null;
    await trade.save({ session });

    matchedTrade.status = "Completed";
    matchedTrade.verificationCode = null;
    await matchedTrade.save({ session });

    // 🔥 อัปเดตสินค้า
    await Product.findByIdAndUpdate(
      trade.offeredProduct,
      { status: "exchanged", isLocked: false },
      { session }
    );

    await Product.findByIdAndUpdate(
      matchedTrade.offeredProduct,
      { status: "exchanged", isLocked: false },
      { session }
    );

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const trade = await Trade.findOne({
      _id: req.params.id,
      owner: req.user.id
    }).session(session);

    if (!trade) {
      throw new Error("Not authorized");
    }

    // 🔄 คืนสินค้า
    await Product.findByIdAndUpdate(
      trade.offeredProduct,
      {
        status: "available",
        isLocked: false
      },
      { session }
    );
    if (trade.matchedWith) {
  const matchedTrade = await Trade.findById(trade.matchedWith).session(session);

  if (matchedTrade) {
    matchedTrade.status = "Open";
    matchedTrade.matchedWith = null;
    await matchedTrade.save({ session });

    await Product.findByIdAndUpdate(
      matchedTrade.offeredProduct,
      { status: "available", isLocked: false },
      { session }
    );
  }
}

    await trade.deleteOne({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "ยกเลิกสำเร็จ" });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
};

exports.acceptMatch = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const myTradeId = req.params.id;
    const { targetTradeId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(myTradeId) ||
      !mongoose.Types.ObjectId.isValid(targetTradeId)
    ) {
      throw new Error("Invalid trade id");
    }

    const myTrade = await Trade.findById(myTradeId).session(session);
    const targetTrade = await Trade.findById(targetTradeId).session(session);

    if (!myTrade || !targetTrade) {
      throw new Error("Trade not found");
    }

    // ✅ กันกดของคนอื่น
    if (myTrade.owner.toString() !== req.user.id) {
      throw new Error("Not authorized");
    }

    // ✅ กัน match ตัวเอง
    if (myTrade._id.equals(targetTrade._id)) {
      throw new Error("Cannot match same trade");
    }

    // ✅ ต้องยัง Open เท่านั้น
    if (myTrade.status !== "Open" || targetTrade.status !== "Open") {
      throw new Error("Trade not available");
    }

    // ✅ กัน match ซ้ำ
    if (myTrade.matchedWith || targetTrade.matchedWith) {
      throw new Error("Already matched");
    }

// ✅ ต้องเช็คว่าสินค้ายัง available จริง
const myProduct = await Product.findById(myTrade.offeredProduct).session(session);
const targetProduct = await Product.findById(targetTrade.offeredProduct).session(session);

if (!myProduct || !targetProduct) {
  throw new Error("Product not found");
}

if (myProduct.status !== "available" || targetProduct.status !== "available") {
  throw new Error("Product not available");
}
    // 🔒 ล็อกสินค้า 2 ฝั่ง
const lockMyProduct = await Product.findOneAndUpdate(
  { _id: myTrade.offeredProduct, status: "available" },
  { status: "trading", isLocked: true },
  { session, new: true }
);

const lockTargetProduct = await Product.findOneAndUpdate(
  { _id: targetTrade.offeredProduct, status: "available" },
  { status: "trading", isLocked: true },
  { session, new: true }
);

if (!lockMyProduct || !lockTargetProduct) {
  throw new Error("Product already locked");
}

    // 🔥 update trade ทั้งสองฝั่ง
    myTrade.status = "Matched";
    myTrade.matchedWith = targetTrade._id;

    targetTrade.status = "Matched";
    targetTrade.matchedWith = myTrade._id;

    await myTrade.save({ session });
    await targetTrade.save({ session });

    // 🔥 สร้าง chat room
    let room = await ChatRoom.findOne({
  tradeId: myTrade._id
}).session(session);

if (!room) {
  room = await ChatRoom.create([{
    type: "trade",
    participants: [myTrade.owner, targetTrade.owner],
    tradeId: myTrade._id,
    productId: myTrade.offeredProduct,
    offeredProductId: targetTrade.offeredProduct,
    tradeStatus: "negotiating",
    lastMessage: "เริ่มต้นการเทรด",
    unreadBy: [targetTrade.owner]
  }], { session });
}

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: "Match successful",
      room
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
};