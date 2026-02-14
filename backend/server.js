require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

// ✅ 1. Import Socket Logic
const socketManager = require("./socket/socketManager"); 

// ===== 2. ROUTES IMPORT =====
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

// ✅ 3. SOCKET.IO SETUP (ประกาศแค่ครั้งเดียวพอ)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // ✅ ตรวจสอบว่าพอร์ต 3000 ตรงกับหน้าเว็บที่รันอยู่
    methods: ["GET", "POST"],
    credentials: true // ✅ เพิ่มตัวนี้เพื่อให้ส่ง Token/Cookie ได้ราบรื่นขึ้น
  },
  allowEIO3: true // ✅ เพิ่มเพื่อรองรับ Socket.io version เก่า-ใหม่ให้คุยกันได้
});

// ✅ 4. INITIALIZE SOCKET LOGIC
socketManager(io);

// ===== 5. MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ===== 6. CONNECT DATABASE =====
connectDB();

// ===== 7. USE ROUTES =====
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

// ===== 8. START SERVER =====
const PORT = process.env.PORT || 5000;

// ⚠️ ใช้ server.listen เพื่อให้ Socket.io และ Express ทำงานบนพอร์ตเดียวกันได้
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});