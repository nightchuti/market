import React from "react";
import { useNavigate } from "react-router-dom";
import "./ProductCard.css";

function ProductCard({ product }) {
    const navigate = useNavigate();

    const {
        _id,
        title,
        description,
        price,
        tradeOption,
        deliveryType,
        images,
        user,
        isBoosted // ดึงค่า isBoosted มาใช้
    } = product;

    // ✅ ปรับ Logic การดึง URL รูปภาพ
    const API_URL = "http://localhost:5000";
    const imageUrl =
        images && images.length > 0
            ? images[0].startsWith("http")
                ? images[0]
                : `${API_URL}/uploads/${images[0].replace(/^\/?uploads\/?/, "")}`
            : "/no-image.png"; // 👈 เปลี่ยนจาก placeholder เป็นรูปในเครื่องเรา (เก็บไว้ใน public folder)

    // ✅ ฟังก์ชันดักจับถ้ารูปภาพจาก Server โหลดไม่ได้
    const handleImageError = (e) => {
        e.target.src = "/no-image.png"; // 👈 ใส่รูป default ที่เราเตรียมไว้
    };

    return (
        <div
            className={`product-card ${isBoosted ? "boosted-card" : ""}`} // ✅ เพิ่ม class ถ้ามีการบูส
            onClick={() => navigate(`/products/${_id}`)}
        >
            {/* ✅ แสดง Tag บูสสินค้า */}
            {isBoosted && <div className="boost-tag-mini">🚀 บูสแล้ว</div>}

            <img 
                src={imageUrl} 
                alt={title} 
                className="product-image" 
                onError={handleImageError} // ✅ ถ้า Error ให้เปลี่ยนเป็นรูปสำรอง
            />

            <div className="card-content">
                <h4 className="title">{title}</h4>

                <p className="description">
                    {description
                        ? description.substring(0, 60) + (description.length > 60 ? "..." : "")
                        : "ไม่มีรายละเอียด"}
                </p>

                {tradeOption !== "trade_allowed" ? (
                    <div className="price-badge">
                        ฿{price?.toLocaleString()}
                        {tradeOption === "negotiable" && (
                            <span className="sub-text"> ต่อรองได้</span>
                        )}
                    </div>
                ) : (
                    <div className="price-badge">แลกเปลี่ยนได้</div>
                )}

                <div className="delivery">
                    {deliveryType === "both"
                        ? "🚚 จัดส่ง / 🤝 นัดรับ"
                        : deliveryType === "delivery"
                            ? "🚚 จัดส่ง"
                            : "🤝 นัดรับ"}
                </div>

                {user && (
                    <p className="seller">👤 ผู้ขาย: {user.username}</p>
                )}
            </div>
        </div>
    );
}

export default ProductCard;