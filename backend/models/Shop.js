const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
  // ================= 1. ความเป็นเจ้าของ (Linking) =================
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true // สำคัญ: ร้านต้องมีเจ้าของ (User ที่จะจ่ายเงินสมัครโปร)
  },

  // ================= 2. ข้อมูลพื้นฐาน (Basic Info) =================
  name: {
    type: String,
    required: true,
    trim: true,
    default: "My Shop"
  },
  description: {
    type: String,
    default: "",
    maxlength: 500 // กันใส่ยาวเกินไปหน้า Feed จะพัง
  },
  
  // ================= 3. ข้อมูลที่ตั้ง (Location) =================
  // เก็บแบบนี้ OK แล้วสำหรับการปักหมุดง่ายๆ
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, default: "" },

  // ================= 4. ข้อมูลสำหรับการโปรโมต (Promotion & Ads) =================
  // รูปที่จะโชว์ตอนร้านขึ้นหน้า Feed แนะนำ (ถ้าไม่ใส่ อาจใช้รูป Default)
  bannerImage: { 
    type: String, 
    default: "https://via.placeholder.com/800x400.png?text=No+Banner" 
  },
  
  // ลิงก์ร้านค้า (ถ้ามีเว็บแยก หรือจะลิงก์เข้าหน้าร้านในแอปก็ได้)
  shopUrl: { type: String, default: "" },

  // สถานะการสมัครโปรโมชัน
  isPromoted: { 
    type: Boolean, 
    default: false 
  },
  
  // ระดับแพ็กเกจ (เช่น จ่ายแพงได้ขึ้นก่อน)
  promotionTier: {
    type: String,
    enum: ['FREE', 'BASIC', 'PREMIUM'],
    default: 'FREE'
  },

  // วันหมดอายุโปรโมชัน (สำคัญมากสำหรับการตัดสิทธิ์อัตโนมัติ)
  promotionExpireAt: { 
    type: Date 
  },

  // (Optional) นับยอดคนกดดูร้าน (Analytics)
  viewCount: { type: Number, default: 0 }

}, {
  timestamps: true
});

// ================= INDEXING (สำคัญมากเพื่อความเร็ว) =================
// 1. ช่วยให้ดึงร้านที่ "จ่ายเงิน" มาโชว์ได้เร็วที่สุด
shopSchema.index({ isPromoted: 1, promotionExpireAt: 1 });

// 2. ช่วยเรียงลำดับตามความเทพของแพ็กเกจ
shopSchema.index({ promotionTier: 1 });

// 3. (Optional) Geo Index ถ้าอนาคตอยากทำฟีเจอร์ "ร้านใกล้ฉัน"
shopSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model("Shop", shopSchema);