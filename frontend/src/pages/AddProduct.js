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
    setImages(files);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    if (
      !form.title ||
      !form.category ||
      !form.deliveryType ||
      !form.tradeOption ||
      !form.locationName ||
      form.quantity === "" ||
      (form.tradeOption === "sell_only" && !form.price)
    ) {
      alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    if (form.tradeOption === "sell_only" && Number(form.price) <= 0) {
      alert("สินค้าขายต้องมีราคามากกว่า 0");
      return;
    }

    try {
      const formData = new FormData();

      // เพิ่มข้อมูลปกติ
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("deliveryType", form.deliveryType);
      formData.append("tradeOption", form.tradeOption);
      formData.append("locationName", form.locationName);
      formData.append("quantity", Number(form.quantity));
      formData.append(
        "price",
        form.tradeOption === "sell_only" ? Number(form.price) : 0
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
      console.error(err);
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
            <img
              key={index}
              src={URL.createObjectURL(img)}
              alt="preview"
            />
          ))}
        </div>
      </div>

      {form.tradeOption === "sell_only" && (
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
          <option value="sell_only">ขายอย่างเดียว</option>
          <option value="trade_allowed">รับแลก</option>
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

      <button onClick={submit} className="submit-btn">
        บันทึกสินค้า
      </button>
    </div>

  );
}
