require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const socketManager = require("./socket/socketManager");

// ===== ROUTES =====
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/Product");
const cartRoutes = require("./routes/Cart");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/addressRoutes");
const adRoutes = require("./routes/adRoutes");
const messageRoutes = require("./routes/messageRoutes");
const locationRoutes = require("./routes/location");

const shopRoutes = require("./routes/shopRoute");
const subscriptionRoutes = require("./routes/subscription");
const couponRoutes = require("./routes/couponRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();
const server = http.createServer(app);

// ===== SOCKET.IO =====
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});
socketManager(io);

// ===== MIDDLEWARE =====
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ✅ Health Check
app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 5000;

// ===== DATABASE =====
// ===== DATABASE + CRON START =====
const startServer = async () => {
  await connectDB();

  // 🔥 เรียก Cron หลัง DB connect
  // require("./cron/autoRelease");

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();

// ===== ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/messages", messageRoutes);

