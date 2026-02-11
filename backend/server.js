require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

// ===== ROUTES =====
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/Product");
const cartRoutes = require("./routes/Cart");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/addressRoutes");
const shopRoutes = require("./routes/shopRoutes");
const couponRoutes = require("./routes/couponRoutes"); 

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// Static folder
app.use("/uploads", express.static("uploads"));

// ===== Connect Database =====
connectDB();

// ===== Use Routes =====
app.use("/api/auth", authRoutes);      // ✅ ถูกต้อง
app.use("/api/products", productRoutes);  // ✅ ถูกต้อง
app.use("/api/cart", cartRoutes);      // ✅ ถูกต้อง
app.use("/api/order", orderRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/coupons", couponRoutes);

app.get("/", (req, res) => {
  res.send("API Running");
});

// ===== Start server =====
app.listen(5000, () => {
  console.log("Server running on port 5000");
});

