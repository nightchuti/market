import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000";

function SellerOrderManagement() {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${API_URL}/api/orders/seller/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setOrders(res.data);
  };

  const handlePrepare = async (orderId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_URL}/api/orders/${orderId}/prepare`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("สถานะ: กำลังเตรียมสินค้า");
      fetchOrders();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  return (
    <div className="order-management-list">
      {orders.length === 0 ? <p>ไม่มีคำสั่งซื้อใหม่</p> : 
        orders.map(order => (
          <div key={order._id} className="shop-card" style={{ borderLeft: '5px solid #ff9800' }}>
            <div className="card-top">
              <div>
                <p style={{ fontSize: '12px', color: '#666' }}>เลขที่คำสั่งซื้อ: #{order._id.slice(-8)}</p>
                {order.items.map(item => (
                  <h4 key={item._id}>{item.product?.name} x {item.quantity}</h4>
                ))}
              </div>
              <div className="card-actions">
                {order.status === "Paid" && (
                  <button className="publish-btn" onClick={() => handlePrepare(order._id)}>
                    📦 จัดเตรียมสินค้า
                  </button>
                )}
                <span className="status-badge pending">{order.status}</span>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

export default SellerOrderManagement;