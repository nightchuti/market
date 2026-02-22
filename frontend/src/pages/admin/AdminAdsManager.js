import React, { useState } from 'react';
import api from '../../api';
import "./AdminAdsManager.css";

const AdminAdsManager = () => {
  const [formData, setFormData] = useState({
    shopName: '',
    description: '',
    imageUrl: '', // หรือทำระบบ Upload File
    location: '',
    priceRange: '',
    link: '',
    days: 7 // จำนวนวันที่ต้องการให้โฆษณาแสดงผล
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await api.post("/api/ads/create-direct", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("ยิงโฆษณาขึ้นระบบสำเร็จ!");
    } catch (err) {
      alert("ผิดพลาด: " + err.response?.data?.message);
    }
  };

  return (
    <div className="ads-wrapper">
      <div className="ads-container">
        <h2 className="ads-title">ยิงโฆษณาเข้าระบบ (Admin Only)</h2>

        <form onSubmit={handleSubmit} className="ads-form">

          <input
            className="ads-input"
            placeholder="ชื่อร้าน"
            onChange={e => setFormData({ ...formData, shopName: e.target.value })}
          />

          <textarea
            className="ads-textarea"
            placeholder="คำอธิบาย"
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />

          <input
            className="ads-input"
            placeholder="ลิงก์รูปภาพ"
            onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
          />

          <input
            className="ads-input"
            placeholder="สถานที่"
            onChange={e => setFormData({ ...formData, location: e.target.value })}
          />

          <input
            className="ads-input"
            placeholder="ราคาเริ่มต้น"
            onChange={e => setFormData({ ...formData, priceRange: e.target.value })}
          />

          <input
            className="ads-input"
            placeholder="ลิงก์เว็บไซต์/ร้านค้า"
            onChange={e => setFormData({ ...formData, link: e.target.value })}
          />

          <input
            className="ads-input"
            type="number"
            placeholder="จำนวนวันที่แสดงผล"
            onChange={e => setFormData({ ...formData, days: e.target.value })}
          />

          <button className="ads-button">
            ยิงโฆษณาเลย
          </button>

        </form>
      </div>
    </div>
  );
};
export default AdminAdsManager;