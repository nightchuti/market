import React, { useState } from 'react';
import api from '../api';

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
    <div className="p-8 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-6">ยิงโฆษณาเข้าระบบ (Admin Only)</h2>
      <form onSubmit={handleSubmit} className="max-w-lg bg-white p-6 rounded shadow">
        <input className="w-full border p-2 mb-4" placeholder="ชื่อร้าน" onChange={e => setFormData({...formData, shopName: e.target.value})} />
        <textarea className="w-full border p-2 mb-4" placeholder="คำอธิบาย" onChange={e => setFormData({...formData, description: e.target.value})} />
        <input className="w-full border p-2 mb-4" placeholder="ลิงก์รูปภาพ" onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
        <input className="w-full border p-2 mb-4" placeholder="สถานที่" onChange={e => setFormData({...formData, location: e.target.value})} />
        <input className="w-full border p-2 mb-4" placeholder="ราคาเริ่มต้น" onChange={e => setFormData({...formData, priceRange: e.target.value})} />
        <input className="w-full border p-2 mb-4" placeholder="ลิงก์เว็บไซต์/ร้านค้า" onChange={e => setFormData({...formData, link: e.target.value})} />
        <input className="w-full border p-2 mb-4" type="number" placeholder="จำนวนวันที่แสดงผล" onChange={e => setFormData({...formData, days: e.target.value})} />
        <button className="w-full bg-orange-500 text-white p-3 rounded font-bold hover:bg-orange-600">ยิงโฆษณาเลย 🚀</button>
      </form>
    </div>
  );
};
export default AdminAdsManager;