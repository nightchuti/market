// controllers/productController.js
const Product = require("../models/Product");

exports.getAllProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      tradeOption,
      page = 1,
      limit = 8
    } = req.query;

    const query = {
      isActive: true,
      status: "available"
    };

    if (search) {
      query.$text = { $search: search };
    }

    if (category) {
      query.category = category;
    }

    if (tradeOption) {
      query.tradeOption = tradeOption;
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .populate("user", "username")
      .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
};
