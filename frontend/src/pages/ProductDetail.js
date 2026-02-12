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

        {/* ===== LEFT : IMAGES ===== */}
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
              📷 ไม่มีรูปสินค้า
            </div>
          )}

          {product.images?.length > 1 && (
            <div className="thumbnail-row">
              {product.images.map((img, i) => (
                <img
                  key={i}
                  className={selectedImage === img ? "active" : ""}
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

        {/* ===== RIGHT : INFO ===== */}
        <div className="info-section">
          <h2 className="title">{product.title}</h2>
          <p className="price">฿{product.price}</p>
          <p className="stock">คงเหลือ {product.quantity} ชิ้น</p>

          <div className="badges">

            {/* การจัดส่ง */}
            {product.deliveryType === "meetup" && <span>📍 นัดรับเท่านั้น</span>}
            {product.deliveryType === "delivery" && <span>📦 จัดส่งเท่านั้น</span>}
            {product.deliveryType === "both" && <span>🔁 นัดรับหรือจัดส่ง</span>}

            {/* รับแลกไหม */}
            {product.tradeOption === "sell_only" && (
              <span className="badge-gray">❌ ไม่รับแลก</span>
            )}

            {product.tradeOption === "trade_allowed" && (
              <span className="badge-blue">🔄 รับแลกสินค้า</span>
            )}

            {product.tradeOption === "negotiable" && (
              <span className="badge-green">🤝 รับแลก / ต่อรองได้</span>
            )}

          </div>



          {/* SELLER CARD */}
          <div className="seller-card">
            <h4>{product.user?.username}</h4>
            <p>ที่อยู่ :  {product.user?.location || "ไม่ระบุ"}</p>
          </div>

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

      {/* DESCRIPTION */}
      <div className="description-section">
        <h3>รายละเอียดสินค้า</h3>
        <p>{product.description || "ไม่มีรายละเอียดเพิ่มเติม"}</p>
      </div>
    </div>
  );

}

export default ProductDetail;
