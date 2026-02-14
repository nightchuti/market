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
const productRoutes = require("./routes/Product"); // เช็คชื่อไฟล์ดีๆ ว่า Product.js หรือ products.js
const cartRoutes = require("./routes/Cart");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/addressRoutes");

// Shop & Promotion System
const shopRoutes = require("./routes/shopRoute"); // *แก้ชื่อไฟล์ให้ตรงกับที่สร้าง (shops.js)
const subscriptionRoutes = require("./routes/subscription"); // *เพิ่มอันนี้เข้ามาครับ!

const couponRoutes = require("./routes/couponRoutes"); 
const tradeRoutes = require("./routes/tradeRoutes");
const chatRoutes = require("./routes/chatRoutes");


const app = express();
const server = http.createServer(app);

// ✅ 3. SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true
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

// Shop & Subscription API
app.use("/api/shops", shopRoutes); // ใช้ /api/shops จะสื่อความหมายกว่า /api/shop (พหูพจน์)
app.use("/api/subscription", subscriptionRoutes); // *ต้องมีบรรทัดนี้ ไม่งั้นจ่ายเงินอัปเกรดไม่ได้

app.use("/api/coupons", couponRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/chat", chatRoutes);


app.get("/", (req, res) => {
  res.send("API Running");
});

// ===== 8. START SERVER =====
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});