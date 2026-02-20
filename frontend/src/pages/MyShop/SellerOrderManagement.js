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

      const res = await axios.get(
        `${API_URL}/api/orders/seller/all`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const activeOrders = res.data.filter(order =>
        ["Paid", "Preparing", "Shipping"].includes(order.status)
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
    if (statusTab === "paid") return orders.filter(o => o.status === "Paid");
    if (statusTab === "preparing") return orders.filter(o => o.status === "Preparing");
    if (statusTab === "shipping") return orders.filter(o => o.status === "Shipping");
    return orders;
  };

  const handleAccept = async (orderId) => {
    try {
      const token = localStorage.getItem("token");

      await axios.patch(
        `${API_URL}/api/orders/${orderId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("รับออเดอร์แล้ว");
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleShip = async (orderId) => {
    const riderName = prompt("ชื่อไรเดอร์:");
    const riderPhone = prompt("เบอร์โทรไรเดอร์:");
    const trackingUrl = prompt("ลิงก์ติดตาม (ถ้ามี):");

    if (!riderName || !riderPhone) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.patch(
        `${API_URL}/api/orders/${orderId}/ship`,
        { riderName, riderPhone, trackingUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("จัดส่งแล้ว");
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  if (loading) return <div style={{ padding: 40 }}>กำลังโหลด...</div>;
  if (orders.length === 0)
    return <div style={{ padding: 40, textAlign: "center" }}>ไม่มีคำสั่งซื้อใหม่</div>;

  return (
    <div style={{ padding: 20 }}>

      {/* STATUS TABS */}
      <div className="seller-tabs">
        <button
          className={statusTab === "all" ? "tab active" : "tab"}
          onClick={() => setStatusTab("all")}
        >
          ทั้งหมด
        </button>
        <button
          className={statusTab === "paid" ? "tab active" : "tab"}
          onClick={() => setStatusTab("paid")}
        >
          รอยืนยัน
        </button>
        <button
          className={statusTab === "preparing" ? "tab active" : "tab"}
          onClick={() => setStatusTab("preparing")}
        >
          รอส่ง
        </button>
        <button
          className={statusTab === "shipping" ? "tab active" : "tab"}
          onClick={() => setStatusTab("shipping")}
        >
          จัดส่งแล้ว
        </button>
      </div>

      {getFilteredOrders().length === 0 ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          ไม่มีคำสั่งซื้อในหมวดนี้
        </div>
      ) : (
        getFilteredOrders().map(order => (
          <div key={order._id} className="shop-card">

            {/* ===== TOP BAR ===== */}
            <div
              className="card-top"
              onClick={() =>
                setOpenId(openId === order._id ? null : order._id)
              }
            >

              {/* LEFT : รูป + ชื่อ */}
              <div className="product-main-info">
console.log(order.items?.[0]?.product?.images?.[0])
                {order.items?.[0]?.product?.images?.[0] ? (
                  
                  <img
                    src={order.items?.[0]?.product?.images?.[0]}
                    alt="product"
                    className="inventory-thumb"
                  />
                ) : (
                  <div className="inventory-thumb-placeholder">
                    ไม่มีรูป
                  </div>
                )}

                <div className="title-section">
                  <h4>
                    {order.items?.[0]?.product?.title || "สินค้า"}
                  </h4>
                  <div className="order-id">
                    ORDER #{order._id.slice(-6).toUpperCase()}
                  </div>
                </div>

              </div>

              {/* RIGHT : ปุ่ม + status */}
              <div className="card-actions">

                <span className={`status-badge ${order.status.toLowerCase()}`}>
                  {order.status}
                </span>

                {order.status === "Paid" && (
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAccept(order._id);
                    }}
                  >
                    รับออเดอร์
                  </button>
                )}

                {order.status === "Preparing" && (
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShip(order._id);
                    }}
                  >
                    เรียกไรเดอร์
                  </button>
                )}

                <button className="dropdown-btn">
                  {openId === order._id ? "−" : "＋"}
                </button>

              </div>
            </div>

            {/* ===== DROPDOWN SECTION ===== */}
            {openId === order._id && (
              <div className="card-dropdown">

                {/* หมวด 1 */}
                <div className="detail-section">
                  <h4>ข้อมูลคำสั่งซื้อ</h4>
                  <div className="detail-grid">
                    <div><strong>วันที่สั่ง:</strong> {new Date(order.createdAt).toLocaleString("th-TH")}</div>
                    {order.paidAt && (
                      <div><strong>วันที่ชำระ:</strong> {new Date(order.paidAt).toLocaleString("th-TH")}</div>
                    )}
                    <div><strong>ยอดรวม:</strong> ฿{order.totalPrice?.toLocaleString()}</div>
                    <div><strong>สถานะ:</strong> {order.status}</div>
                  </div>
                </div>

                {/* หมวด 2 */}
                <div className="detail-section">
                  <h4>ข้อมูลลูกค้า</h4>
                  <div className="detail-grid">
                    <div><strong>ชื่อ:</strong> {order.user?.username}</div>
                    <div><strong>เบอร์:</strong> {order.shippingAddress?.phone || "-"}</div>
                  </div>
                </div>

                {/* หมวด 3 */}
                <div className="detail-section">
                  <h4>รายการสินค้า</h4>
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="product-row">
                      <div>
                        • {item.product?.title}
                        {item.product?.price && (
                          <span> (฿{item.product.price.toLocaleString()})</span>
                        )}
                      </div>
                      <div>x {item.quantity}</div>
                    </div>
                  ))}
                </div>

                {/* หมวด 4 */}
                {order.shippingAddress && (
                  <div className="detail-section">
                    <h4>ที่อยู่จัดส่ง</h4>
                    <div>
                      {order.shippingAddress.fullName}<br />
                      {order.shippingAddress.addressLine}<br />
                      {order.shippingAddress.phone}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default SellerOrderManagement;