import React from 'react';
import './Inventory.css';
import api from "../../api"; // อย่าลืมลง axios หรือใช้ตัวส่ง request ที่คุณมี
const API_URL = import.meta.env.VITE_API_URL;


function Inventory({ products, openId, setOpenId, handleDelete, navigate, publishProduct, userQuota, refreshProducts }) {
  
  // ✅ ฟังก์ชันเรียก API บูสสินค้า
  const handleBoost = async (productId) => {
    if (userQuota <= 0) {
      alert("โควตาบูสของคุณหมดแล้ว กรุณาสมัครสมาชิก PRO หรือซื้อสิทธิ์เพิ่ม");
      return;
    }

    if (window.confirm(`ใช้ 1 สิทธิ์บูสสำหรับสินค้าชิ้นนี้? (คงเหลือ ${userQuota} สิทธิ์)`)) {
      try {
        const token = localStorage.getItem("token");
        const res = await api.post(`/api/products/activate-boost/${productId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          alert("บูสสินค้าสำเร็จ! สินค้าจะแสดงในลำดับแรกๆ เป็นเวลา 3 วัน");
          refreshProducts(); // เรียกฟังก์ชันดึงข้อมูลใหม่เพื่ออัปเดต UI
        }
      } catch (err) {
        alert(err.response?.data?.message || "เกิดข้อผิดพลาดในการบูส");
      }
    }
  };

  if (products.length === 0) {
    return <div style={{ padding: "40px", textAlign: "center" }}>ไม่มีสินค้าในคลัง</div>;
  }

  const getDeliveryText = (val) => {
    if (val === "delivery") return "จัดส่งเท่านั้น";
    if (val === "meetup") return "นัดรับเท่านั้น";
    if (val === "both") return "จัดส่งหรือนัดรับ";
    return val;
  };

  const getTradeText = (val) => {
    if (val === "sell_only") return "ขายเท่านั้น";
    if (val === "trade_allowed") return "รับแลกเท่านั้น";
    if (val === "negotiable") return "รับแลก / ต่อรองได้";
    return val;
  };

  return products.map(p => {
    // ✅ เช็คว่าสินค้ากำลังบูสอยู่หรือไม่
    const isCurrentlyBoosted = p.isBoosted && new Date(p.boostExpireAt) > new Date();

    return (
      <div key={p._id} className={`shop-card ${isCurrentlyBoosted ? 'boosted-border' : ''}`}>
        <div className="card-top">
          <div className="product-main-info">
            {p.images && p.images.length > 0 ? (
              <img 
                src={`${API_URL}${p.images[0]}`} 
                alt={p.title} 
                className="inventory-thumb" 
              />
            ) : (
              <div className="inventory-thumb-placeholder">ไม่มีรูป</div>
            )}
            
            <div className="title-section">
              <h4>
                {p.title} 
                {isCurrentlyBoosted && <span className="boost-tag">🚀 Boosted</span>}
              </h4>
              {(p.tradeOption === "sell_only" || p.tradeOption === "negotiable") && (
                 <span className="price">฿{p.price?.toLocaleString()}</span>
              )}
            </div>
          </div>

          <div className="card-actions">
            {/* ✅ ปุ่มบูสสินค้า (แสดงเฉพาะถ้าสถานะเป็น available) */}
            {p.status === "available" && (
              <button 
                className={`boost-action-btn ${isCurrentlyBoosted ? 'active' : ''}`}
                onClick={() => handleBoost(p._id)}
                disabled={isCurrentlyBoosted}
              >
                {isCurrentlyBoosted ? "กำลังบูส" : "🚀 บูส"}
              </button>
            )}

            <span className={`status-badge ${p.status}`}>
              {p.status === "available" && "พร้อมขาย"}
              {p.status === "pending" && "รอลงขาย"}
              {p.status === "sold" && "ขายแล้ว"}
            </span>

            {p.status === "pending" && (
              <button className="publish-btn" onClick={() => publishProduct(p._id)}>
                ลงขาย
              </button>
            )}

            <button
              className={`dropdown-btn ${openId === p._id ? 'active' : ''}`}
              onClick={() => setOpenId(openId === p._id ? null : p._id)}
            >
              {openId === p._id ? "−" : "＋"}
            </button>
          </div>
        </div>

        {openId === p._id && (
          <div className="card-dropdown">
            <div className="inventory-info">
              {isCurrentlyBoosted && (
                <p className="boost-expiry-text">
                  🌟 สินค้านี้จะได้รับการดันขึ้นหน้าแรกจนถึง: {new Date(p.boostExpireAt).toLocaleString('th-TH')}
                </p>
              )}
              <p className="description-text"><strong>รายละเอียด:</strong> {p.description || "ไม่มีคำอธิบาย"}</p>
              
              <div className="detail-grid">
                {(p.tradeOption === "sell_only" || p.tradeOption === "negotiable") && (
                  <div className="detail-item"><strong>ราคา:</strong> ฿{p.price?.toLocaleString()}</div>
                )}
                <div className="detail-item"><strong>จำนวนสินค้า:</strong> {p.quantity} ชิ้น</div>
                <div className="detail-item"><strong>หมวดหมู่:</strong> {p.category}</div>
                <div className="detail-item"><strong>รูปแบบการส่ง:</strong> {getDeliveryText(p.deliveryType)}</div>
                <div className="detail-item"><strong>ตัวเลือกการขาย:</strong> {getTradeText(p.tradeOption)}</div>
                <div className="detail-item"><strong>ชื่อสถานที่อยู่:</strong> {p.locationName}</div>
              </div>
            </div>

            <div className="dropdown-buttons">
              <button onClick={() => navigate(`/edit-product/${p._id}`)} className="edit-btn">แก้ไข</button>
              <button onClick={() => handleDelete(p._id)} className="delete-btn">ลบสินค้า</button>
            </div>
          </div>
        )}
      </div>
    );
  });
}

export default Inventory;