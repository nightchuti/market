import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function AddProduct() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    quantity: 1,
    deliveryType: "delivery",
    tradeOption: "sell_only"
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    if (!form.title || !form.price || !form.category) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    try {
      await axios.post(
        "http://localhost:5000/api/products",
        form,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      alert("เพิ่มสินค้าเรียบร้อยแล้ว");
      navigate("/products");
    } catch (err) {
      console.log(err);
      alert("เกิดข้อผิดพลาด");
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "40px auto" }}>
      <h1>ลงขายสินค้า</h1>

      <input
        name="title"
        placeholder="ชื่อสินค้า"
        value={form.title}
        onChange={handleChange}
      />

      <textarea
        name="description"
        placeholder="รายละเอียดสินค้า"
        value={form.description}
        onChange={handleChange}
      />

      <input
        name="price"
        type="number"
        placeholder="ราคา"
        value={form.price}
        onChange={handleChange}
      />

      <input
        name="quantity"
        type="number"
        placeholder="จำนวน"
        value={form.quantity}
        onChange={handleChange}
      />

      <select
        name="category"
        value={form.category}
        onChange={handleChange}
      >
        <option value="">เลือกหมวดหมู่</option>
        <option value="เสื้อผ้า">เสื้อผ้า</option>
        <option value="เครื่องใช้ไฟฟ้า">เครื่องใช้ไฟฟ้า</option>
        <option value="หนังสือ">หนังสือ</option>
        <option value="เฟอร์นิเจอร์">เฟอร์นิเจอร์</option>
        <option value="อุปกรณ์การเรียน">อุปกรณ์การเรียน</option>
        <option value="อาหาร">อาหาร</option>
        <option value="อุปกรณ์สัตว์เลี้ยง">อุปกรณ์สัตว์เลี้ยง</option>
        <option value="อื่นๆ">อื่นๆ</option>
      </select>

      <select
        name="deliveryType"
        value={form.deliveryType}
        onChange={handleChange}
      >
        <option value="delivery">จัดส่งเท่านั้น</option>
        <option value="meetup">นัดรับเท่านั้น</option>
        <option value="both">จัดส่งหรือนัดรับ</option>
      </select>

      <select
        name="tradeOption"
        value={form.tradeOption}
        onChange={handleChange}
      >
        <option value="sell_only">ขายอย่างเดียว</option>
        <option value="trade_allowed">รับแลก</option>
        <option value="negotiable">รับแลก / ต่อรองได้</option>
      </select>

      <button
        onClick={submit}
        style={{
          marginTop: "15px",
          padding: "10px",
          backgroundColor: "#2e7d32",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer"
        }}
      >
        บันทึก
      </button>
    </div>
  );
}
