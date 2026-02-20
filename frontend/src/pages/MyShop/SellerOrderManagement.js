import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./SellerOrderManagement.css";

const API_URL = process.env.REACT_APP_API_URL;

function SellerOrderManagement({ setOrderCount }) {
  const [orders, setOrders] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("all");

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/orders/seller/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // กรองเฉพาะสถานะที่ผู้ขายต้องจัดการ
      const activeOrders = res.data.filter(order =>
        ["Paid", "Preparing", "Shipping", "Completed"].includes(order.status)
      );

      setOrders(activeOrders);

      if (setOrderCount) {
        const paidCount = activeOrders.filter(o => o.status === "Paid").length;
        setOrderCount(paidCount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [setOrderCount]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getFilteredOrders = () => {
    if (statusTab === "all") return orders;
    return orders.filter(o => o.status.toLowerCase() === statusTab.toLowerCase());
  };

  const handleAccept = async (orderId) => {
    if (!window.confirm("ยืนยันการรับออเดอร์เพื่อเตรียมจัดส่ง?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_URL}/api/orders/${orderId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("รับออเดอร์แล้ว");
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleShip = async (orderId) => {
    const riderName = prompt("ชื่อไรเดอร์ / ขนส่ง:");
    const riderPhone = prompt("เบอร์โทรติดต่อ:");
    const trackingUrl = prompt("ลิงก์ติดตามพัสดุ (ถ้ามี):");

    if (!riderName || !riderPhone) {
      alert("กรุณากรอกข้อมูลชื่อและเบอร์โทรให้ครบถ้วน");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_URL}/api/orders/${orderId}/ship`, 
        { riderName, riderPhone, trackingUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("อัปเดตสถานะจัดส่งเรียบร้อย");
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  if (loading) return <div className="loading-state">กำลังโหลดข้อมูล...</div>;
  if (orders.length === 0) return <div className="empty-state">ไม่มีคำสั่งซื้อในขณะนี้</div>;

  return (
    <div className="management-container">
      {/* Tab Navigation เหมือนหน้าหลัก */}
      <div className="seller-tabs">
        {["all", "paid", "preparing", "shipping"].map((tab) => (
          <button
            key={tab}
            className={`tab ${statusTab === tab ? "active" : ""}`}
            onClick={() => setStatusTab(tab)}
          >
            {tab === "all" && "ทั้งหมด"}
            {tab === "paid" && "ชำระเงินแล้ว"}
            {tab === "preparing" && "กำลังเตรียม"}
            {tab === "shipping" && "จัดส่งแล้ว"}
          </button>
        ))}
      </div>

      <div className="orders-list">
        {getFilteredOrders().length === 0 ? (
          <div className="empty-substate">ไม่มีรายการในหมวดนี้</div>
        ) : (
          getFilteredOrders().map(order => {
            // เพิ่ม Class พิเศษตามสถานะเหมือนหน้า Inventory
            const isUrgent = order.status === "Paid"; 

            return (
              <div key={order._id} className={`shop-card ${isUrgent ? 'urgent-border' : ''}`}>
                <div className="card-top" onClick={() => setOpenId(openId === order._id ? null : order._id)}>
                  
                  <div className="product-main-info">
                    {order.items?.[0]?.product?.images?.[0] ? (
                      <img
                        src={`${API_URL}/${order.items[0].product.images[0]}`}
                        alt="product"
                        className="inventory-thumb"
                      />
                    ) : (
                      <div className="inventory-thumb-placeholder">ไม่มีรูป</div>
                    )}

                    <div className="title-section">
                      <h4>{order.items?.[0]?.product?.title || "หลายรายการ..."}</h4>
                      <div className="top-meta">
                        <span className="order-id">#{order._id.slice(-6).toUpperCase()}</span>
                        <span className="price">฿{order.totalPrice?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions">
                    <span className={`status-badge ${order.status.toLowerCase()}`}>
                      {order.status === "Paid" && "จ่ายแล้ว"}
                      {order.status === "Preparing" && "เตรียมส่ง"}
                      {order.status === "Shipping" && "ส่งแล้ว"}
                      {order.status === "Completed" && "สำเร็จ"}
                    </span>

                    {order.status === "Paid" && (
                      <button className="publish-btn" onClick={(e) => { e.stopPropagation(); handleAccept(order._id); }}>
                        รับออเดอร์
                      </button>
                    )}

                    {order.status === "Preparing" && (
                      <button className="boost-action-btn active" onClick={(e) => { e.stopPropagation(); handleShip(order._id); }}>
                        🚀 ส่งสินค้า
                      </button>
                    )}

                    <button className={`dropdown-btn ${openId === order._id ? 'active' : ''}`}>
                      {openId === order._id ? "−" : "＋"}
                    </button>
                  </div>
                </div>

                {/* Dropdown Section ที่ปรับให้เหมือน Inventory.js */}
                {openId === order._id && (
                  <div className="card-dropdown">
                    <div className="inventory-info">
                      <p className="description-text">
                        <strong>บันทึกจากลูกค้า:</strong> {order.note || "ไม่มีข้อความเพิ่มเติม"}
                      </p>
                      
                      <div className="detail-grid">
                        <div className="detail-item"><strong>วันที่สั่ง:</strong> {new Date(order.createdAt).toLocaleString("th-TH")}</div>
                        <div className="detail-item"><strong>ช่องทางการชำระ:</strong> {order.paymentMethod}</div>
                        <div className="detail-item"><strong>ชื่อลูกค้า:</strong> {order.user?.username}</div>
                        <div className="detail-item"><strong>เบอร์โทร:</strong> {order.shippingAddress?.phone || "-"}</div>
                        <div className="detail-item"><strong>รูปแบบการส่ง:</strong> {order.deliveryMode}</div>
                        <div className="detail-item"><strong>ค่าส่ง:</strong> ฿{order.deliveryFee}</div>
                      </div>

                      <div className="product-list-section">
                        <h5 style={{ margin: "10px 0" }}>รายการสินค้า</h5>
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="product-row" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #eee" }}>
                            <span>• {item.product?.title} (฿{item.price?.toLocaleString()})</span>
                            <strong>x {item.quantity}</strong>
                          </div>
                        ))}
                      </div>

                      {order.shippingAddress && (
                        <div className="address-section" style={{ marginTop: "15px", padding: "10px", background: "#f9f9f9", borderRadius: "8px" }}>
                          <strong>ที่อยู่จัดส่ง:</strong><br />
                          {order.shippingAddress.fullName}<br />
                          {order.shippingAddress.addressLine} {order.shippingAddress.city} {order.shippingAddress.postalCode}
                        </div>
                      )}

                      {order.deliveryDetails?.riderName && (
                        <div className="rider-section" style={{ marginTop: "10px", color: "#28a745" }}>
                          <strong>ข้อมูลการส่ง:</strong> {order.deliveryDetails.riderName} ({order.deliveryDetails.riderPhone})
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SellerOrderManagement;