require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http"); // สร้าง HTTP Server
const { Server } = require("socket.io"); // Socket.io
const connectDB = require("./config/db");

// ✅ Import Logic แชทที่เราแยกไว้
const socketManager = require("./socket/socketManager"); 

// ===== ROUTES =====
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/Product");
const cartRoutes = require("./routes/Cart");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/addressRoutes");
const shopRoutes = require("./routes/shopRoutes");
const couponRoutes = require("./routes/couponRoutes"); 
const tradeRoutes = require("./routes/tradeRoutes");
const chatRoutes = require("./routes/chatRoutes");


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"], // ระบุ Port React ให้ชัดเจน
    methods: ["GET", "POST"]
  }
});

// 3️⃣ เรียกใช้ Logic แชท (ส่งตัวแปร io เข้าไปทำงาน)
socketManager(io);

// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));


// ===== Connect Database =====
connectDB();

// ===== Use Routes =====
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => {
  res.send("API Running");
});

// ===== Start server =====
const PORT = process.env.PORT || 5000;

// ⚠️ ใช้ server.listen แทน app.listen
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});