import React, { useState } from "react";
import "./SalesHistory.css";

const API_URL = process.env.REACT_APP_API_URL;

function SalesHistory({ orders }) {
  const [openId, setOpenId] = useState(null);

  const getImageUrl = (img) => {
    if (!img) return "/no-image.png";
    if (img.startsWith("http")) return img;
    if (!API_URL) return img;

    return `${API_URL.replace(/\/$/, "")}/${img.replace(/^\//, "")}`;
  };

  if (!orders || orders.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        ยังไม่มีประวัติการขาย
      </div>
    );
  }

  return (
    <div>
      {orders.map(order => (
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
              {order.items?.[0]?.product?.images?.[0] ? (
                <img
                  src={getImageUrl(order.items?.[0]?.product?.images?.[0])}
                  alt="product"
                  className="inventory-thumb"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/no-image.png";
                  }}
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

                <div className="top-meta">
                  <span className="order-id">
                    ORDER #{order._id.slice(-6).toUpperCase()}
                  </span>

                </div>
                <span className="top-price">
                  ฿{order.totalPrice?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* RIGHT : status + dropdown */}
            <div className="card-actions">
              <span className={`status-badge ${order.status?.toLowerCase()}`}>
                {order.status}
              </span>

              <button className="dropdown-btn">
                {openId === order._id ? "−" : "＋"}
              </button>
            </div>
          </div>

          {/* ===== DROPDOWN DETAIL ===== */}
          {openId === order._id && (
            <div className="card-dropdown">

              {/* หมวด 1 */}
              <div className="detail-section">
                <h4>ข้อมูลคำสั่งซื้อ</h4>
                <div className="detail-grid">
                  <div>
                    <strong>วันที่สั่ง:</strong>{" "}
                    {new Date(order.createdAt).toLocaleString("th-TH")}
                  </div>

                  {order.paidAt && (
                    <div>
                      <strong>วันที่ชำระ:</strong>{" "}
                      {new Date(order.paidAt).toLocaleString("th-TH")}
                    </div>
                  )}

                  <div>
                    <strong>ยอดรวม:</strong> ฿
                    {order.totalPrice?.toLocaleString()}
                  </div>

                  <div>
                    <strong>สถานะ:</strong> {order.status}
                  </div>
                </div>
              </div>

              {/* หมวด 2 */}
              <div className="detail-section">
                <h4>ข้อมูลลูกค้า</h4>
                <div className="detail-grid">
                  <div>
                    <strong>ชื่อ:</strong> {order.user?.username}
                  </div>
                  <div>
                    <strong>เบอร์:</strong>{" "}
                    {order.shippingAddress?.phone || "-"}
                  </div>
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
                        <span>
                          {" "}
                          (฿{item.product.price.toLocaleString()})
                        </span>
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
                    {order.shippingAddress.fullName}
                    <br />
                    {order.shippingAddress.addressLine}
                    <br />
                    {order.shippingAddress.phone}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default SalesHistory;