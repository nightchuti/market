import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AddProduct.css";

export default function AddProduct() {
  const navigate = useNavigate();

  const [images, setImages] = useState([]);

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
    locationName: ""
  });

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    setImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    const mustHavePrice =
      form.tradeOption === "sell_only" ||
      form.tradeOption === "negotiable";

    if (
      !form.title ||
      !form.category ||
      !form.deliveryType ||
      !form.tradeOption ||
      !form.locationName ||
      form.quantity === "" ||
      (mustHavePrice && !form.price)
    ) {
      alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    if (mustHavePrice && Number(form.price) <= 0) {
      alert("ราคาต้องมากกว่า 0");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("deliveryType", form.deliveryType);
      formData.append("tradeOption", form.tradeOption);
      formData.append("locationName", form.locationName);
      formData.append("quantity", Number(form.quantity));

      // 🔥 เงื่อนไขราคาใหม่
      formData.append(
        "price",
        form.tradeOption === "trade_allowed"
          ? 0
          : Number(form.price)
      );

      formData.append("lat", form.lat ? Number(form.lat) : null);
      formData.append("lng", form.lng ? Number(form.lng) : null);

      // เพิ่มรูปหลายรูป
      images.forEach((img) => {
        formData.append("images", img);
      });

      await axios.post(
        "http://localhost:5000/api/products",
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      alert("เพิ่มสินค้าเรียบร้อยแล้ว");
      navigate("/products");

    } catch (err) {
      console.error(err.response?.data || err);
      alert("เกิดข้อผิดพลาด");
    }
  };


  const getMyLocation = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        setForm((prev) => ({
          ...prev,
          lat: latitude,
          lng: longitude
        }));

        alert("ดึงตำแหน่งปัจจุบันเรียบร้อยแล้ว");
      },
      (error) => {
        alert("ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาอนุญาตการเข้าถึง");
        console.error(error);
      }
    );
  };


  return (
    <div className="add-product-container">
      <h1>ลงขายสินค้า</h1>

      <div className="form-group">
        <label>ชื่อสินค้า <span>*</span></label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>รายละเอียดสินค้า</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>รูปสินค้า</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageChange}
        />

        {/* preview รูป */}
        <div className="image-preview">
          {images.map((img, index) => (
            <div key={index} className="preview-item">
              <img
                src={URL.createObjectURL(img)}
                alt="preview"
              />
              <button
                type="button"
                className="remove-btn"
                onClick={() => removeImage(index)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

      </div>

      {(form.tradeOption === "sell_only" ||
        form.tradeOption === "negotiable") && (
          <div className="form-group">
            <label>ราคา (บาท) <span>*</span></label>

            <input
              name="price"
              type="number"
              min="0"
              value={form.price}
              onChange={handleChange}
              required
            />
          </div>
        )}

      <div className="form-group">
        <label>จำนวนสินค้า <span>*</span></label>
        <input
          name="quantity"
          type="number"
          min="0"
          value={form.quantity}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>หมวดหมู่ <span>*</span></label>

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          required
        >
          <option value="">-- เลือกหมวดหมู่ --</option>
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

      <div className="form-group">
        <label>รูปแบบการส่งสินค้า <span>*</span></label>
        <select
          name="deliveryType"
          value={form.deliveryType}
          onChange={handleChange}
        >
          <option value="delivery">จัดส่งเท่านั้น</option>
          <option value="meetup">นัดรับเท่านั้น</option>
          <option value="both">จัดส่งหรือนัดรับ</option>
        </select>
      </div>

      <div className="form-group">
        <label>ตัวเลือกการขาย <span>*</span></label>
        <select
          name="tradeOption"
          value={form.tradeOption}
          onChange={handleChange}
        >
          <option value="sell_only">ขายเท่านั้น</option>
          <option value="trade_allowed">รับแลกเท่านั้น</option>
          <option value="negotiable">รับแลก / ต่อรองได้</option>
        </select>
      </div>

      <div className="form-group">
        <label>ชื่อสถานที่อยู่ <span>*</span></label>
        <input
          name="locationName"
          value={form.locationName}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <div className="label-inline">
          <label>พิกัด (Latitude / Longitude)</label>
          <button
            type="button"
            className="location-btn"
            onClick={getMyLocation}
          >
            ใช้ตำแหน่งปัจจุบัน
          </button>
        </div>

        <div className="form-row">
          <input
            name="lat"
            type="number"
            step="any"
            placeholder="Latitude"
            value={form.lat}
            onChange={handleChange}
          />
          <input
            name="lng"
            type="number"
            step="any"
            placeholder="Longitude"
            value={form.lng}
            onChange={handleChange}
          />
        </div>
      </div>


      <button onClick={submit} className="submit-btn">
        บันทึกสินค้า
      </button>
    </div>

  );
}
