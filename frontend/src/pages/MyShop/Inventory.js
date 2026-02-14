import React from 'react';
import './Inventory.css';

const API_URL = "http://localhost:5000";

function Inventory({ products, openId, setOpenId, handleDelete, navigate, publishProduct }) {
  if (products.length === 0) {
    return <div style={{ padding: "40px", textAlign: "center" }}>ไม่มีสินค้าในคลัง</div>;
  }

  // ฟังก์ชันแปลงค่า value เป็นคำอ่านที่เข้าใจง่าย
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

  return products.map(p => (
    <div key={p._id} className="shop-card">
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
            <h4>{p.title}</h4>
            {/* แสดงราคาเฉพาะเมื่อไม่ใช่ trade_allowed */}
            {(p.tradeOption === "sell_only" || p.tradeOption === "negotiable") && (
               <span className="price">฿{p.price?.toLocaleString()}</span>
            )}
          </div>
        </div>

        <div className="card-actions">
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
            <p className="description-text"><strong>รายละเอียด:</strong> {p.description || "ไม่มีคำอธิบาย"}</p>
            
            <div className="detail-grid">
              {/* แสดงราคาในรายละเอียดด้วยเงื่อนไขเดียวกัน */}
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
  ));
}

export default Inventory;