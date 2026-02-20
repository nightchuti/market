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

  const getFilteredOrders = () => {
    if (statusTab === "all") return orders;

    if (statusTab === "paid")
      return orders.filter(o => o.status === "Paid");

    if (statusTab === "preparing")
      return orders.filter(o => o.status === "Preparing");

    if (statusTab === "shipping")
      return orders.filter(o => o.status === "Shipping");

    return orders;
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleAccept = async (orderId) => {
    try {
      const token = localStorage.getItem("token");

      await axios.patch(
        `${API_URL}/api/orders/${orderId}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert("รับออเดอร์แล้ว");
      fetchOrders();

    } catch (err) {
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };


  const handlePrepare = async (orderId) => {
    if (!window.confirm("ยืนยันเริ่มเตรียมสินค้า?")) return;

    try {
      const token = localStorage.getItem("token");

      await axios.patch(
        `${API_URL}/api/orders/${orderId}/prepare`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
        {
          headers: { Authorization: `Bearer ${token}` }
        }
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

      {/* 🔥 STATUS TABS */}
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

            <div
              className="card-top"
              onClick={() =>
                setOpenId(openId === order._id ? null : order._id)
              }
              style={{ cursor: "pointer" }}
            >

              {/* LEFT SIDE */}
              <div className="order-main-info">

                <div className="order-id">
                  ORDER #{order._id.slice(-8).toUpperCase()}
                </div>

                <div className="order-meta">
                  <span>👤 {order.user?.username || "ไม่ระบุ"}</span>
                  <span>📅 {new Date(order.createdAt).toLocaleString("th-TH")}</span>
                </div>

                <div className="order-total">
                  ฿{order.totalPrice?.toLocaleString()}
                </div>

              </div>

              {/* RIGHT ACTIONS */}
              <div className="card-actions">

                {order.status === "Paid" && (
                  <button
                    className="btn-main"
                    onClick={() => handleAccept(order._id)}
                  >
                    รับออเดอร์
                  </button>
                )}

                {order.status === "Preparing" && (
                  <button
                    className="btn-main"
                    onClick={() => handleShip(order._id)}
                  >
                    เรียกไรเดอร์
                  </button>
                )}

                {order.status === "Shipping" && (
                  <div style={{ fontSize: "13px" }}>
                    🚚 กำลังจัดส่ง
                    <br />
                    ไรเดอร์: {order.deliveryDetails?.riderName}
                  </div>
                )}

              </div>

            </div>

            {/* DROPDOWN DETAIL */}
            {openId === order._id && (
              <div className="card-dropdown">

                <div className="detail-section">
                  <h4>ข้อมูลคำสั่งซื้อ</h4>
                  <div><strong>Order ID:</strong> {order._id}</div>
                  <div><strong>สถานะ:</strong> {order.status}</div>
                  <div><strong>วันที่สั่ง:</strong> {new Date(order.createdAt).toLocaleString("th-TH")}</div>
                  {order.paidAt && (
                    <div><strong>วันที่ชำระ:</strong> {new Date(order.paidAt).toLocaleString("th-TH")}</div>
                  )}
                </div>

                <div className="detail-section">
                  <h4>ข้อมูลลูกค้า</h4>
                  <div><strong>ชื่อ:</strong> {order.user?.username}</div>
                  <div><strong>เบอร์:</strong> {order.shippingAddress?.phone}</div>
                </div>

                <div className="detail-section">
                  <h4>รายการสินค้า</h4>
                  {order.items.map((item, idx) => (
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

                <div className="detail-section total-box">
                  <strong>ยอดรวมทั้งหมด:</strong> ฿{order.totalPrice?.toLocaleString()}
                </div>

                {order.shippingAddress && (
                  <div className="detail-section">
                    <h4>ที่อยู่จัดส่ง</h4>
                    <div>
                      {order.shippingAddress.fullName} <br />
                      {order.shippingAddress.addressLine} <br />
                      {order.shippingAddress.phone}
                    </div>
                  </div>
                )}

                {order.deliveryDetails && (
                  <div className="detail-section">
                    <h4>ข้อมูลการจัดส่ง</h4>
                    <div><strong>ไรเดอร์:</strong> {order.deliveryDetails.riderName}</div>
                    <div><strong>เบอร์:</strong> {order.deliveryDetails.riderPhone}</div>
                    {order.deliveryDetails.trackingUrl && (
                      <div>
                        <a
                          href={order.deliveryDetails.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ลิงก์ติดตามพัสดุ
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {order.paymentSlip && (
                  <div className="detail-section">
                    <h4>หลักฐานการโอน</h4>
                    <a
                      href={order.paymentSlip}
                      target="_blank"
                      rel="noreferrer"
                      className="slip-link"
                    >
                      ดูสลิปการโอนเงิน
                    </a>
                  </div>
                )}

              </div>
            )}

          </div>
        )))}
    </div>
  );
}

export default SellerOrderManagement;
