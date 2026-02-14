import React from 'react';
import './Inventory.css'; // อย่าลืม Import ไฟล์ CSS ใหม่

const API_URL = "http://localhost:5000";

function Inventory({ products, openId, setOpenId, handleDelete, navigate, publishProduct }) {
  if (products.length === 0) {
    return <div style={{ padding: "40px", textAlign: "center" }}>ไม่มีสินค้าในคลัง</div>;
  }

  return products.map(p => (
    <div key={p._id} className="shop-card">
      <div className="card-top">
        {/* ส่วนซ้าย: รูปภาพและชื่อสินค้า */}
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
            <span className="price">฿{p.price?.toLocaleString()}</span>
          </div>
        </div>

        {/* ส่วนขวา: Badge สถานะ และปุ่ม Action หลัก */}
        <div className="card-actions">
          <span className={`status-badge ${p.status}`}>
            {p.status === "available" && "พร้อมขาย"}
            {p.status === "pending" && "รอลงขาย"}
            {p.status === "sold" && "ขายแล้ว"}
          </span>

          {p.status === "pending" && (
            <button
              className="publish-btn"
              onClick={() => publishProduct(p._id)}
            >
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

      {/* ส่วนรายละเอียดเมื่อกด Dropdown */}
      {openId === p._id && (
        <div className="card-dropdown">
          <div className="inventory-info">
            <p className="description-text"><strong>รายละเอียด:</strong> {p.description || "ไม่มีคำอธิบาย"}</p>
            
            <div className="detail-grid">
              <div className="detail-item"><strong>หมวดหมู่:</strong> {p.category}</div>
              <div className="detail-item"><strong>จำนวน:</strong> {p.quantity} ชิ้น</div>
              <div className="detail-item"><strong>การจัดส่ง:</strong> {p.deliveryType}</div>
              <div className="detail-item"><strong>สถานที่:</strong> {p.locationName}</div>
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