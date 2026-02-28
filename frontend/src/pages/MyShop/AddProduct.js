import { useState } from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";
import "./AddProduct.css";

export default function AddProduct() {
  const navigate = useNavigate();

  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [errors, setErrors] = useState({});

  const [tradeImages, setTradeImages] = useState([]);
  const [tradePreviews, setTradePreviews] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    quantity: 1,
    deliveryType: "delivery",
    tradeOption: "sell_only",
    lat: "",
    lng: "",
    locationName: "",
    wantedCategory: "",
    wantedKeywords: [],
    meetupAddress: ""
  });

  const [keywordInput, setKeywordInput] = useState("");

  const handleKeywordKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = keywordInput.trim();
      if (!value) return;
      if (!form.wantedKeywords.includes(value)) {
        setForm({ ...form, wantedKeywords: [...form.wantedKeywords, value] });
      }
      setKeywordInput("");
    }
  };

  const removeKeyword = (word) => {
    setForm({ ...form, wantedKeywords: form.wantedKeywords.filter(k => k !== word) });
  };

  // ---------------- IMAGE ----------------
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    const validFiles = files.filter(file => {
      if (!file.type.startsWith("image/")) {
        alert("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น");
        return false;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("ไฟล์ต้องไม่เกิน 5MB");
        return false;
      }

      return true;
    });

    const previewUrls = validFiles.map(file => URL.createObjectURL(file));

    setImages(prev => [...prev, ...validFiles]);
    setImagePreviews(prev => [...prev, ...previewUrls]);
  };

  const handleTradeImageChange = (e) => {
    setTradeImages(prev => [...prev, ...Array.from(e.target.files)]);
  };
  const removeImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index]);

    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };
  const removeTradeImage = (i) => setTradeImages(prev => prev.filter((_, idx) => idx !== i));

  // ---------------- CHANGE ----------------
  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ---------------- VALIDATE ----------------
  const validate = () => {
    const e = {};
    if (!form.title.trim())       e.title       = "กรุณากรอกชื่อสินค้า";
    if (images.length === 0)      e.images      = "กรุณาอัปโหลดรูปสินค้าอย่างน้อย 1 รูป";
    if (!form.category)           e.category    = "กรุณาเลือกหมวดหมู่";
    if ((form.tradeOption === "sell_only" || form.tradeOption === "negotiable") && (!form.price || Number(form.price) <= 0))
                                  e.price       = "กรุณากรอกราคาสินค้า";
    if ((form.deliveryType === "meetup" || form.deliveryType === "both") && !form.meetupAddress.trim())
                                  e.meetupAddress = "กรุณากรอกจุดนัดรับ";
    if (!form.locationName.trim()) e.locationName = "กรุณากรอกที่อยู่โดยประมาณ หรือกดใช้ตำแหน่งปัจจุบัน";
    if (form.tradeOption === "trade_allowed") {
      if (!form.wantedCategory)   e.wantedCategory = "กรุณาเลือกหมวดที่ต้องการแลก";
      if (form.wantedKeywords.length === 0) e.wantedKeywords = "กรุณาเพิ่มคำค้นหาสินค้าที่อยากได้อย่างน้อย 1 คำ";
    }
    return e;
  };

  // ---------------- SUBMIT ----------------
  const submit = async (e) => {
    if (e) e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // scroll ไปที่ error แรก
      setTimeout(() => {
        const el = document.querySelector(".ap-error");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    setErrors({});

    // ── Build FormData ───────────────────────────────────
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("กรุณาเข้าสู่ระบบก่อนลงขาย");
        return;
      }

      const formData = new FormData();

      // วนลูปเพิ่มข้อมูลจาก state 'form'
      Object.keys(form).forEach((key) => {
        if (key === "wantedKeywords") {
          // ส่งเป็น String คั่นด้วยคอมมาให้ Backend ไป split เอง
          formData.append(key, form.wantedKeywords.join(","));
        } else {
          formData.append(key, form[key]);
        }
      });

      // เพิ่มไฟล์ภาพหลัก
      images.forEach((file) => {
        formData.append("images", file);
      });

      // เพิ่มไฟล์ภาพของที่อยากแลก
      tradeImages.forEach((file) => {
        formData.append("wantedImages", file);
      });

      const res = await api.post(
        "/api/products",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Response:", res.data);
      alert("ลงขายสินค้าสำเร็จ!");
      navigate("/my-shop");

    } catch (err) {
      console.error("❌ Submit Error:", err.response?.data || err.message);
      const errorMsg = err.response?.data?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์";
      alert("ไม่สามารถเพิ่มสินค้าได้: " + errorMsg);
    }
  };

  // ---------------- LOCATION ----------------
  const ErrMsg = ({ field }) => errors[field]
    ? <p style={{color:"#dc2626",fontSize:12,marginTop:4,marginBottom:0}}>⚠ {errors[field]}</p>
    : null;

  const [locLoading, setLocLoading] = useState(false);

  const getMyLocation = () => {
    if (!navigator.geolocation) {
      return alert("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง");
    }

    setLocLoading(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(
            `${process.env.REACT_APP_API_URL}/api/location/reverse?lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          setForm(prev => ({
            ...prev,
            lat: String(latitude),
            lng: String(longitude),
            locationName:
              data.display_name ||
              data.address?.road ||
              data.address?.suburb ||
              data.address?.city ||
              data.address?.town || "",
          }));
        } catch (err) {
          console.error(err);
          // ดึงพิกัดสำเร็จแต่แปลงชื่อไม่ได้ — เซ็ตพิกัดไว้ก่อน
          setForm(prev => ({
            ...prev,
            lat: String(latitude),
            lng: String(longitude),
          }));
          alert("ดึงพิกัดแล้ว แต่แปลงเป็นชื่อสถานที่ไม่ได้\nสามารถพิมพ์ที่อยู่เองได้เลยครับ");
        } finally {
          setLocLoading(false);
        }
      },
      (err) => {
        setLocLoading(false);
        const MSG = {
          1: "คุณปฏิเสธการอนุญาตตำแหน่ง\nกรุณาไปที่การตั้งค่าเบราว์เซอร์ แล้วอนุญาตการเข้าถึงตำแหน่ง",
          2: "ไม่พบสัญญาณ GPS หรือเครือข่าย\nลองเปิด Wi-Fi หรือ GPS แล้วลองอีกครั้ง",
          3: "หมดเวลาดึงตำแหน่ง กรุณาลองใหม่อีกครั้ง",
        };
        alert(MSG[err.code] || "ไม่สามารถดึงตำแหน่งได้ กรุณาลองใหม่");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // ================= UI =================
  return (
    <div className="add-product-container">

      {/* ปุ่มย้อนกลับ */}
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← ย้อนกลับ
      </button>

      <h1>ลงขายสินค้า</h1>

      <div className="form-group">
        <label>ชื่อสินค้า *</label>
        <input name="title" value={form.title} onChange={handleChange}
          style={errors.title?{borderColor:"#dc2626"}:{}}/>
        <ErrMsg field="title" />
      </div>

      <div className="form-group">
        <label>รายละเอียดสินค้า</label>
        <textarea name="description" value={form.description} onChange={handleChange} />
      </div>

      {/* รูปสินค้า */}
      <div className="form-group">
        <label>รูปสินค้า *</label>
        <input type="file" multiple accept="image/*" onChange={handleImageChange} />
        <ErrMsg field="images" />
        <div className="image-preview">
          {imagePreviews.map((preview, i) => (
            <div key={i} className="preview-item">
              <img
                src={preview}
                alt=""
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/no-image.png";
                }}
              />
              <button onClick={() => removeImage(i)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* ราคา + จำนวน */}
      {(form.tradeOption === "sell_only" || form.tradeOption === "negotiable") && (
        <div className="inline-row">
          <div className="form-group">
            <label>ราคา (บาท) *</label>
            <input name="price" type="number" min="0" value={form.price} onChange={handleChange}
              style={errors.price?{borderColor:"#dc2626"}:{}}/>
            <ErrMsg field="price" />
          </div>
          <div className="form-group">
            <label>จำนวนสินค้า</label>
            <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} />
          </div>
        </div>
      )}

      {/* หมวด + ส่งสินค้า */}
      <div className="inline-row">
        <div className="form-group">
          <label>หมวดหมู่ *</label>
          <select name="category" value={form.category} onChange={handleChange}
            style={errors.category?{borderColor:"#dc2626"}:{}}>
            <option value="">-- เลือกหมวด --</option>
            <option value="เสื้อผ้า">เสื้อผ้า</option>
            <option value="เครื่องใช้ไฟฟ้า">เครื่องใช้ไฟฟ้า</option>
            <option value="หนังสือ">หนังสือ</option>
            <option value="เฟอร์นิเจอร์">เฟอร์นิเจอร์</option>
            <option value="อุปกรณ์การเรียน">อุปกรณ์การเรียน</option>
            <option value="อาหาร">อาหาร</option>
            <option value="อุปกรณ์สัตว์เลี้ยง">อุปกรณ์สัตว์เลี้ยง</option>
            <option value="อุปกรณ์อิเล็กทรอนิกส์">อุปกรณ์อิเล็กทรอนิกส์</option>
            <option value="อื่นๆ">อื่นๆ</option>
          </select>
          <ErrMsg field="category" />
        </div>

        <div className="form-group">
          <label>รูปแบบการส่ง</label>
          <select name="deliveryType" value={form.deliveryType} onChange={handleChange}>
            <option value="delivery">จัดส่ง</option>
            <option value="meetup">นัดรับ</option>
            <option value="both">ได้ทั้งคู่</option>
          </select>
        </div>
      </div>

      {/* จุดนัดรับ */}
      {(form.deliveryType === "meetup" || form.deliveryType === "both") && (
        <div className="form-group">
          <label>จุดนัดรับ *</label>
          <input
            name="meetupAddress"
            value={form.meetupAddress}
            onChange={handleChange}
            placeholder="เช่น หอ A ห้อง 203 หรือ หน้าอาคารเรียน"
            style={errors.meetupAddress?{borderColor:"#dc2626"}:{}}/>
          <ErrMsg field="meetupAddress" />
        </div>
      )}

      {/* ตัวเลือกขาย */}
      <div className="form-group">
        <label>ตัวเลือกการขาย</label>
        <select name="tradeOption" value={form.tradeOption} onChange={handleChange}>
          <option value="sell_only">ขายเท่านั้น</option>
          <option value="trade_allowed">รับแลก</option>
          <option value="negotiable">ขาย/แลก</option>
        </select>
      </div>

      {/* ⭐ เฉพาะเทรด */}
      {form.tradeOption === "trade_allowed" && (
        <>
          <hr />
          <h3>ข้อมูลสินค้าที่ต้องการแลก</h3>

          <div className="inline-row">
            <div className="form-group">
              <label>หมวดหมู่ที่อยากได้ *</label>
              <select name="wantedCategory" value={form.wantedCategory} onChange={handleChange}
                style={errors.wantedCategory?{borderColor:"#dc2626"}:{}}>
                <option value="">-- เลือกหมวด --</option>
                <option value="เสื้อผ้า">เสื้อผ้า</option>
                <option value="เครื่องใช้ไฟฟ้า">เครื่องใช้ไฟฟ้า</option>
                <option value="หนังสือ">หนังสือ</option>
                <option value="เฟอร์นิเจอร์">เฟอร์นิเจอร์</option>
                <option value="อุปกรณ์การเรียน">อุปกรณ์การเรียน</option>
                <option value="อาหาร">อาหาร</option>
                <option value="อุปกรณ์สัตว์เลี้ยง">อุปกรณ์สัตว์เลี้ยง</option>
                <option value="อุปกรณ์อิเล็กทรอนิกส์">อุปกรณ์อิเล็กทรอนิกส์</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>

            {/* Keywords */}
            <div className="form-group">
              <label>คำค้นหาสินค้าที่อยากได้ * <small>(กด Enter เพื่อเพิ่ม)</small></label>
              <div style={{ border: "1px solid #ccc", padding: 8, borderRadius: 5 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {form.wantedKeywords.map((word, index) => (
                    <span
                      key={index}
                      style={{
                        background: "#1976d2", color: "#fff",
                        padding: "4px 8px", borderRadius: 12,
                        fontSize: 12, display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      {word}
                      <button
                        type="button"
                        onClick={() => removeKeyword(word)}
                        style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
                      >×</button>
                    </span>
                  ))}
                </div>
                <input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                  placeholder="พิมพ์คำแล้วกด Enter"
                  style={{ border: "none", outline: "none", marginTop: 6, width: "100%" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>รูปสินค้าที่อยากได้ *</label>
              <input type="file" multiple accept="image/*" onChange={handleTradeImageChange} />
              <div className="image-preview">
                {tradeImages.map((img, i) => (
                  <div key={i} className="preview-item">
                    <img src={URL.createObjectURL(img)} alt="" />
                    <button onClick={() => removeTradeImage(i)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ที่อยู่ */}
      <div className="form-group">
        <label>ที่อยู่โดยประมาณ *</label>
        <input
          name="locationName"
          value={form.locationName}
          onChange={handleChange}
          placeholder="กดใช้ตำแหน่งปัจจุบัน หรือพิมพ์เอง"
          style={errors.locationName?{borderColor:"#dc2626"}:{}}/>
        <ErrMsg field="locationName" />
      </div>

      {/* พิกัด */}
      <div className="form-group">
        <div className="location-header">
          <label>พิกัด</label>
          <button type="button" className="location-btn" onClick={getMyLocation} disabled={locLoading}>
            {locLoading ? "กำลังดึงตำแหน่ง..." : "📍 ใช้ตำแหน่งปัจจุบัน"}
          </button>
        </div>
        <div className="form-row">
          <input name="lat" value={form.lat} onChange={handleChange} placeholder="Latitude" />
          <input name="lng" value={form.lng} onChange={handleChange} placeholder="Longitude" />
        </div>
      </div>

      <button onClick={submit} className="submit-btn">
        บันทึกสินค้า
      </button>
    </div>
  );
}