import React, { useState } from 'react';
import api from "../../api";
import './AdminCoupon.css'; // อย่าลืมสร้างไฟล์ CSS นะครับ

const AdminCoupon = () => {
  const [form, setForm] = useState({
    code: '', description: '', discountType: 'AMOUNT', discountValue: 0,
    maxDiscountAmount: 0, minSpend: 0, quotaLimit: 0, tier: 'FREE', expireAt: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/coupons', form, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert("🎉 สร้างคูปองสำเร็จ!");
    } catch (err) { alert(err.response?.data?.message || "เกิดข้อผิดพลาด"); }
  };

  return (
    <div className="admin-coupon-container">
      <div className="admin-card">
        <h2>🎟️ สร้างคูปองใหม่</h2>
        
        <form onSubmit={handleSubmit} className="admin-form">
          
          {/* ส่วนหัว: โค้ดและประเภท */}
          <div className="input-group">
            <label>ชื่อโค้ดคูปอง</label>
            <input type="text" placeholder="เช่น KU69" onChange={e => setForm({...form, code: e.target.value})} required />
          </div>

          <div className="input-group">
            <label>ระดับสมาชิก</label>
            <select onChange={e => setForm({...form, tier: e.target.value})}>
              <option value="FREE">ทั่วไป (FREE)</option>
              <option value="PRO">พรีเมียม (PRO)</option>
            </select>
          </div>

          <div className="input-group full-width">
            <label>รายละเอียดคูปอง</label>
            <textarea rows="2" placeholder="เช่น ส่วนลดพิเศษวันเปิดเทอม..." onChange={e => setForm({...form, description: e.target.value})} />
          </div>

          {/* ส่วนตัวเลข: ส่วนลดและเงื่อนไข */}
          <div className="input-group">
            <label>ประเภทการลด</label>
            <select onChange={e => setForm({...form, discountType: e.target.value})}>
              <option value="AMOUNT">ลดเป็นบาท (฿)</option>
              <option value="PERCENT">ลดเป็นเปอร์เซ็นต์ (%)</option>
            </select>
          </div>

          <div className="input-group">
            <label>มูลค่าที่ลด</label>
            <input type="number" placeholder="เช่น 50" onChange={e => setForm({...form, discountValue: e.target.value})} required />
          </div>

          <div className="input-group">
            <label>ซื้อขั้นต่ำ (฿)</label>
            <input type="number" placeholder="0 = ไม่มีขั้นต่ำ" onChange={e => setForm({...form, minSpend: e.target.value})} />
          </div>

          <div className="input-group">
            <label>ลดสูงสุด (฿)</label>
            <input type="number" placeholder="กรณีลดเป็น %" onChange={e => setForm({...form, maxDiscountAmount: e.target.value})} />
          </div>

          {/* ส่วนกำหนดการ */}
          <div className="input-group">
            <label>จำนวนสิทธิ์ทั้งหมด</label>
            <input type="number" placeholder="0 = ไม่จำกัด" onChange={e => setForm({...form, quotaLimit: e.target.value})} />
          </div>

          <div className="input-group">
            <label>วันหมดอายุ</label>
            <input type="date" onChange={e => setForm({...form, expireAt: e.target.value})} required />
          </div>

          <button type="submit" className="btn-submit">ปล่อยคูปองเข้าสู่ระบบ</button>
        </form>
      </div>
    </div>
  );
};

export default AdminCoupon;