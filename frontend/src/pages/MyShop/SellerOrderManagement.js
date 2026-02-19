import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./SellerOrderManagement.css";

const API_URL = process.env.REACT_APP_API_URL;

function SellerOrderManagement({ setOrderCount }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  }, [setOrderCount]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  if (loading) return <p className="loading">กำลังโหลดคำสั่งซื้อ...</p>;

  return (
    <div className="seller-orders-wrapper">

      <h2 className="page-title">
        คำสั่งซื้อร้านค้า ({orders.length})
      </h2>

      {orders.length === 0 ? (
        <div className="empty-box">
          ยังไม่มีคำสั่งซื้อใหม่
        </div>
      ) : (
        orders.map(order => (
          <div key={order._id} className="order-card">

            <div className="order-header">
              <div>
                <div className="order-id">
                  ORDER #{order._id.slice(-8).toUpperCase()}
                </div>
                <div className="order-date">
                  {new Date(order.createdAt).toLocaleString()}
                </div>
              </div>

              <div className={`status-badge ${order.status.toLowerCase()}`}>
                {order.status}
              </div>
            </div>

            <div className="buyer-info">
              ผู้ซื้อ: <strong>{order.user?.username || "ไม่ระบุ"}</strong>
            </div>

            <div className="product-list">
              {order.items.map((item, idx) => (
                <div key={idx} className="product-row">
                  <div className="product-title">
                    {item.product?.title}
                  </div>
                  <div className="product-qty">
                    x {item.quantity}
                  </div>
                </div>
              ))}
            </div>

            {order.shippingAddress && (
              <div className="shipping-box">
                <strong>ที่อยู่จัดส่ง:</strong>
                <div>
                  {order.shippingAddress.fullName} <br />
                  {order.shippingAddress.addressLine} <br />
                  {order.shippingAddress.phone}
                </div>
              </div>
            )}

            <div className="order-footer">
              <div className="total-price">
                ฿{order.totalPrice?.toLocaleString()}
              </div>

              {order.status === "Paid" && (
                <button
                  className="btn-prepare"
                  onClick={() => handlePrepare(order._id)}
                >
                  เริ่มเตรียมสินค้า
                </button>
              )}
            </div>

            {order.paymentSlip && (
              <div className="slip-link">
                <a
                  href={`${API_URL}${order.paymentSlip}`}
                  target="_blank"
                  rel="noreferrer"
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
