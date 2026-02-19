const cron = require("node-cron");
const Order = require("../models/Order");

cron.schedule("*/10 * * * *", async () => {
  const now = new Date();

  try {
    const orders = await Order.find({
      status: "Shipping",
      escrowStatus: "Holding",
      autoReleaseAt: { $lte: now }
    });

    for (let order of orders) {
      order.status = "Completed";
      order.escrowStatus = "Released";
      order.completedAt = new Date();
      await order.save();

      console.log("Auto Released:", order._id);
    }

  } catch (err) {
    console.error("Auto release error:", err);
  }
});
