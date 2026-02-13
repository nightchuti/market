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
            <img src={imageUrl} alt={title} className="product-image" />

            <div className="card-content">
                <h4 className="title">{title}</h4>

                <p className="description">
                    {description
                        ? description.substring(0, 60)
                        : "ไม่มีรายละเอียด"}
                </p>

                {/* ราคา / แลก แบบเท่ากัน */}
                {tradeOption !== "trade_allowed" ? (
                    <div className="price-badge">
                        ฿{price}
                        {tradeOption === "negotiable" && (
                            <span className="sub-text"> ต่อรองได้</span>
                        )}
                    </div>
                ) : (
                    <div className="price-badge">
                        แลกเปลี่ยนได้
                    </div>
                )}

                <div className="delivery">
                    {deliveryType === "both"
                        ? "จัดส่ง / นัดรับ"
                        : deliveryType === "delivery"
                            ? "จัดส่ง"
                            : "นัดรับ"}
                </div>

                {user && (
                    <p className="seller">ผู้ขาย: {user.username}</p>
                )}
            </div>
        </div>
    );


}

export default ProductCard;
