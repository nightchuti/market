import { useState } from "react";
import axios from "axios";

export default function AddProduct() {
  const [form, setForm] = useState({ exchangeable: false });

  const submit = async () => {
    await axios.post("http://localhost:5000/api/products", form, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });
    alert("เพิ่มสินค้าแล้ว");
  };

  return (
    <div>
      <h1>ลงขายสินค้า</h1>

      <input placeholder="ชื่อสินค้า" onChange={e => setForm({...form, title: e.target.value})}/>
      <input placeholder="ราคา" onChange={e => setForm({...form, price: e.target.value})}/>

      <label>
        <input
          type="checkbox"
          onChange={e => setForm({...form, exchangeable: e.target.checked})}
        />
        แลกเปลี่ยนได้
      </label>

      <button onClick={submit}>บันทึก</button>
    </div>
  );
}
