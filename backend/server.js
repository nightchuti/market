require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const socketManager = require("./socket/socketManager"); 

// ===== Connect Database =====
connectDB();

const app = express();
const server = http.createServer(app);

// ===== ตั้งค่า Socket.io =====
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"], 
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ✅ ฝัง io ไว้ใน app เพื่อให้เรียกใช้ใน Controller ได้ด้วย req.app.get("socketio")
app.set("socketio", io);

// เรียกใช้ Logic Socket
socketManager(io);

// ===== Middleware =====
app.use(cors()); // หรือระบุ origin ให้ตรงกับ Socket.io
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ===== ROUTES =====
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/Product"));
app.use("/api/cart", require("./routes/Cart"));
app.use("/api/order", require("./routes/orderRoutes"));
app.use("/api/address", require("./routes/addressRoutes"));
app.use("/api/shop", require("./routes/shopRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes")); 
app.use("/api/trades", require("./routes/tradeRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));

app.get("/", (req, res) => {
  res.send("🚀 ProManage API is Running...");
});

// ===== Error Handling (เพิ่มเติมเพื่อความปลอดภัย) =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🟢 Server & Socket running on port ${PORT}`);
});