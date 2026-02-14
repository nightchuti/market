require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const socketManager = require("./socket/socketManager"); 

// ===== 2. ROUTES IMPORT =====
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/Product");
const cartRoutes = require("./routes/Cart");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/addressRoutes");
const adRoutes = require("./routes/adRoutes"); // ✅ เพิ่มบรรทัดนี้เพื่อแก้ไข ReferenceError

// Shop & Promotion System
const shopRoutes = require("./routes/shopRoute"); 
const subscriptionRoutes = require("./routes/subscription"); // คงไว้สำหรับระบบ 20.- และ 99.-

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
  }
});
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
app.use("/api/ads", adRoutes); // ✅ ใช้งานได้แล้วหลังจาก Import ด้านบน

app.use("/api/shops", shopRoutes); 
app.use("/api/subscription", subscriptionRoutes); // ระบบสมัครสมาชิก/บูสสินค้าแบบอัตโนมัติ

app.use("/api/coupons", couponRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));