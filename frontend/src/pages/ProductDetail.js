import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProductDetail.css";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        if (res.data.images?.length) {
          setSelectedImage(res.data.images[0]);
        }
      })
      .catch(() => {
        setProduct(null);
      });
  }, [id]);

  const handleChat = () => {
    navigate(`/chat/${product.user._id}`);
  };

  const handleAddToCart = () => {
    alert("เพิ่มลงตะกร้าแล้ว (เชื่อม cart API ได้เลย)");
  };

  if (!product) return <p className="loading">ไม่พบสินค้า</p>;

  return (
    <div className="product-detail">

      <div className="detail-container">

        {/* ================= LEFT : IMAGES ================= */}
        <div className="image-section">
          <div className="image-section">
            {product.images?.length > 0 && selectedImage ? (
              <img
                className="main-image"
                src={
                  selectedImage.startsWith("http")
                    ? selectedImage
                    : `http://localhost:5000${selectedImage}`
                }
                alt={product.title}
              />
            ) : (
              <div className="main-image placeholder">
                ไม่มีรูปสินค้า
              </div>
            )}

            {product.images?.length > 0 && (
              <div className="thumbnail-row">
                {product.images.map((img, i) => (
                  <img
                    key={i}
                    src={
                      img.startsWith("http")
                        ? img
                        : `http://localhost:5000${img}`
                    }
                    alt="thumb"
                    onClick={() => setSelectedImage(img)}
                  />
                ))}
              </div>
            )}
          </div>


          <div className="thumbnail-row">
            {product.images?.map((img, i) => (
              <img
                key={i}
                src={
                  img.startsWith("http")
                    ? img
                    : `http://localhost:5000${img}`
                }
                alt="thumb"
                onClick={() => setSelectedImage(img)}
              />
            ))}
          </div>
        </div>

        {/* ================= RIGHT : INFO ================= */}
        <div className="info-section">
          <h2 className="title">{product.title}</h2>

          <p className="price">฿{product.price}</p>

          <p className="stock">คงเหลือ {product.quantity} ชิ้น</p>

          <p className="delivery-type">
            {product.deliveryType === "meetup" && "📍 นัดรับเท่านั้น"}
            {product.deliveryType === "delivery" && "📦 จัดส่งเท่านั้น"}
            {product.deliveryType === "both" && "🔁 นัดรับหรือจัดส่งได้"}
          </p>

          <p className="trade-option">
            {product.tradeOption === "sell_only" && "💰 ขายเท่านั้น"}
            {product.tradeOption === "trade_allowed" && "🔄 สามารถแลกได้"}
            {product.tradeOption === "negotiable" && "🤝 ตกลงกันได้"}
          </p>


          {/* ===== SELLER BOX ===== */}
          <div className="seller-box">
            <h4>ผู้ขาย: {product.user?.username}</h4>
            <p className="seller-rating">
              ⭐ {product.user?.rating?.toFixed(1) || "5.0"}
              ({product.user?.reviewCount || 0} รีวิว)
            </p>
            <p className="seller-location">
              📍 {product.user?.location || "ไม่ระบุ"}
            </p>
          </div>

          {/* ===== BUTTONS ===== */}
          <div className="button-group">
            <button className="btn-cart" onClick={handleAddToCart}>
              🛒 เพิ่มลงตะกร้า
            </button>
            <button className="btn-chat" onClick={handleChat}>
              💬 แชทผู้ขาย
            </button>
          </div>
        </div>

      </div>

      {/* ================= DESCRIPTION ================= */}
      <div className="description-section">
        <h3>รายละเอียดสินค้า</h3>
        <p>
          {product.description || "ไม่มีรายละเอียดเพิ่มเติม"}
        </p>
      </div>

    </div>
  );
}

export default ProductDetail;
