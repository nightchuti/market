exports.getAllProducts = async (req, res) => {
  try {
    const { search, category, tradeOption, page = 1, limit = 8 } = req.query;
    const skip = (page - 1) * limit;

    let query = { isActive: true, status: "available" };
    if (search) query.$text = { $search: search };
    if (category) query.category = category;
    if (tradeOption) query.tradeOption = tradeOption;

    // 1. ดึงข้อมูลทั้งหมด
    const allItems = await Product.find(query).populate("user", "username").sort({ createdAt: -1 });

    // 2. แยกกลุ่มและสุ่มลำดับกลุ่ม Boost
    const boosted = allItems.filter(p => p.isBoosted && new Date(p.boostExpireAt) > new Date())
                            .sort(() => 0.5 - Math.random()); // สุ่ม Shuffle คนบูส
    const regular = allItems.filter(p => !p.isBoosted || new Date(p.boostExpireAt) <= new Date());

    // 3. ผสมแบบกระจาย (Interleave) - บูส 1 ตัว ต่อ ปกติ 3 ตัว
    let mixed = [];
    let bIdx = 0, rIdx = 0;
    while (bIdx < boosted.length || rIdx < regular.length) {
      if (bIdx < boosted.length) mixed.push(boosted[bIdx++]);
      for (let i = 0; i < 3 && rIdx < regular.length; i++) {
        if (rIdx < regular.length) mixed.push(regular[rIdx++]);
      }
    }

    // 4. ตัดเอาเฉพาะหน้าที่ต้องการ
    const result = mixed.slice(skip, skip + Number(limit));

    res.json({
      products: result,
      pagination: {
        total: mixed.length,
        page: Number(page),
        pages: Math.ceil(mixed.length / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};