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
    user
  } = product;

  const imageUrl =
    images && images.length > 0
      ? images[0].startsWith("http")
        ? images[0]
        : `http://localhost:5000/uploads/${images[0].replace(/^\/?uploads\/?/, "")}`
      : "https://via.placeholder.com/300";

  return (
    <div
      className="product-card"
      onClick={() => navigate(`/products/${_id}`)}
    >
      <img src={imageUrl} alt={title} />

      <h4>{title}</h4>

      <p className="description">
        {description
          ? description.substring(0, 60)
          : "ไม่มีรายละเอียด"}
      </p>

      {/* ราคา / แลก */}
      {tradeOption === "sell_only" && (
        <p className="price">฿{price}</p>
      )}

      {tradeOption === "negotiable" && (
        <p className="price">฿{price} (ต่อรองได้)</p>
      )}

      {tradeOption === "trade_allowed" && (
        <p className="exchange">🔄 แลกเปลี่ยนได้</p>
      )}

      {/* ประเภทส่ง */}
      <p className="delivery">
        🚚{" "}
        {deliveryType === "both"
          ? "จัดส่ง / นัดรับ"
          : deliveryType === "delivery"
          ? "จัดส่ง"
          : "นัดรับ"}
      </p>

      {/* ผู้ขาย */}
      {user && (
        <p className="seller">ผู้ขาย: {user.username}</p>
      )}
    </div>
  );
}

export default ProductCard;
