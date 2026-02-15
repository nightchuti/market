import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000";

function SellerOrderManagement({ setOrderCount }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/orders/seller/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // กรองเฉพาะออเดอร์ที่จ่ายเงินแล้ว (Paid) หรือกำลังเตรียม (Preparing)
      // หรือถ้าต้องการแค่ "คำสั่งซื้อใหม่" ให้กรองเฉพาะ "Paid"
      const newOrders = res.data.filter(order => order.status === "Paid");
      setOrders(newOrders);
      
      // อัปเดตตัวเลขแจ้งเตือนใน MyShop/Navbar
      if (setOrderCount) setOrderCount(newOrders.length);
      
      setLoading(false);
    } catch (err) {
      console.error("Fetch orders error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handlePrepare = async (orderId) => {
    if (!window.confirm("ยืนยันการรับออเดอร์และเริ่มจัดเตรียมสินค้า?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_URL}/api/orders/${orderId}/prepare`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("เริ่มเตรียมสินค้าเรียบร้อย!");
      fetchOrders(); // โหลดข้อมูลใหม่
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <p>กำลังโหลดข้อมูล...</p>;

  return (
    <div className="order-management-list">
      <h3 style={{ marginBottom: '20px' }}>คำสั่งซื้อใหม่ ({orders.length})</h3>
      
      {orders.length === 0 ? (
        <div className="empty-state">
          <p>ไม่มีคำสั่งซื้อใหม่ในขณะนี้</p>
        </div>
      ) : (
        orders.map(order => (
          <div key={order._id} className="shop-card" style={{ borderLeft: '5px solid #10bd4a', marginBottom: '15px' }}>
            <div className="card-top">
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                  เลขที่ออเดอร์: #{order._id.slice(-8).toUpperCase()}
                </p>
                <p style={{ fontSize: '14px', fontWeight: '600' }}>
                  ผู้ซื้อ: {order.user?.username || "ไม่ระบุชื่อ"}
                </p>
                
                <div className="order-items" style={{ margin: '10px 0' }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '14px', color: '#444' }}>
                      • {item.product?.title} <span style={{ color: '#10bd4a' }}>x {item.quantity}</span>
                    </div>
                  ))}
                </div>

                <p style={{ fontWeight: 'bold', color: '#333' }}>
                  ยอดรวม: ฿{order.totalPrice?.toLocaleString()}
                </p>
              </div>

              <div className="card-actions">
                <button 
                  className="btn-main" 
                  style={{ width: 'auto', padding: '10px 20px', backgroundColor: '#10bd4a' }}
                  onClick={() => handlePrepare(order._id)}
                >
                  จัดเตรียมสินค้า
                </button>
              </div>
            </div>
            
            {order.paymentSlip && (
              <div style={{ marginTop: '10px' }}>
                <a 
                  href={`${API_URL}${order.paymentSlip}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ fontSize: '12px', color: '#007bff' }}
                >
                  ดูหลักฐานการโอนเงิน
                </a>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default SellerOrderManagement;