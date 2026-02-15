import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProductDetail.css";

const API_URL = "http://localhost:5000";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    axios
      .get(`${API_URL}/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        if (res.data.images?.length) setSelectedImage(res.data.images[0]);
      })
      .catch(() => setProduct(null));
  }, [id]);

  // ===== ห้ามแก้ =====
  const handleChat = async () => {
    if (!token) return alert("กรุณาเข้าสู่ระบบก่อนแชท");
    if (!product) return;

    const sellerId = product.user?._id || product.user;
    if (String(sellerId) === String(currentUser._id))
      return alert("ไม่สามารถแชทกับตัวเองได้");

    if (chatLoading) return;
    setChatLoading(true);

    try {
      const res = await axios.post(
        `${API_URL}/api/chat/normal`,
        { productId: product._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/chat/${res.data._id}`);
    } catch {
      alert("ไม่สามารถเปิดแชทได้");
    } finally {
      setChatLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!token) return alert("กรุณาเข้าสู่ระบบก่อน");
    if (!product) return;

    const sellerId = product.user?._id || product.user;
    if (String(sellerId) === String(currentUser._id))
      return alert("ไม่สามารถเพิ่มสินค้าของตัวเองลงตะกร้าได้");

    try {
      await axios.post(
        `${API_URL}/api/cart/add`,
        { productId: product._id, quantity: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("เพิ่มลงตะกร้าเรียบร้อยแล้ว");
    } catch {
      alert("เพิ่มสินค้าไม่สำเร็จ");
    }
  };
  // ==================

  if (!product) return <p>กำลังโหลด...</p>;

  const isOwnProduct =
    currentUser &&
    String(product.user?._id || product.user) === String(currentUser._id);

  return (
    <div className="product-detail">

      {/* ปุ่มย้อนกลับ */}
      <button className="btn-back" onClick={() => navigate(-1)}>
        ← กลับ
      </button>

      <div className="detail-container">

        {/* LEFT */}
        <div>

          <div className="image-box">
            <img
              className="main-image"
              src={
                selectedImage.startsWith("http")
                  ? selectedImage
                  : `${API_URL}${selectedImage}`
              }
              alt=""
            />

            <div className="thumbnail-row">
              {product.images?.map((img, i) => (
                <img
                  key={i}
                  src={img.startsWith("http") ? img : `${API_URL}${img}`}
                  className={selectedImage === img ? "active" : ""}
                  onClick={() => setSelectedImage(img)}
                />
              ))}
            </div>
          </div>

          {/* Seller */}
          <div
            className="seller-mini clickable"
            onClick={() =>
              navigate(`/profile/${product.user?._id || product.user}`)
            }

          >


            <img
              src={
                product.user?.profileImage
                  ? product.user.profileImage.startsWith("http")
                    ? product.user.profileImage
                    : `${API_URL}${product.user.profileImage}`
                  : "/default-avatar.png"
              }
            />
            <div>
              <b>
                {product.user?.shopId?.name || product.user?.username}
              </b>
            </div>
          </div>

        </div>

        {/* RIGHT */}
        <div className="info-section">

          <h2>{product.title}</h2>
          <div className="price">฿{product.price}</div>

          {/* badges */}
          <div className="badge-row">
            {product.deliveryType === "meetup" && <span>นัดรับ</span>}
            {product.deliveryType === "delivery" && <span>จัดส่ง</span>}
            {product.deliveryType === "both" && <span>นัดรับ/จัดส่ง</span>}

            {product.tradeOption === "sell_only" && <span>ขาย</span>}
            {product.tradeOption === "trade_allowed" && <span>รับแลก</span>}
            {product.tradeOption === "negotiable" && <span>ซื้อ/แลก</span>}
          </div>

          {/* location */}
          <div className="location-box">
            <p>สถานที่ : {product.locationName || "-"}</p>
            <p>จุดนัดรับ : {product.meetupAddress || "-"}</p>
          </div>

          {/* description */}
          <div className="desc-box">
            <h4>รายละเอียดสินค้า</h4>
            <p>{product.description || "ไม่มีรายละเอียดสินค้า"}</p>
          </div>

          {/* trade wanted */}
          {product.tradeOption === "trade_allowed" && (
            <div className="wanted-card">
              <img
                src={
                  product.wantedImages?.[0]
                    ? product.wantedImages[0].startsWith("http")
                      ? product.wantedImages[0]
                      : `${API_URL}${product.wantedImages[0]}`
                    : "/noimage.png"
                }
              />

              <div>
                <b>{product.wantedName || "สินค้าที่ต้องการแลก"}</b>
                <p>{product.wantedCategory}</p>

                <div className="wanted-tags">
                  {product.wantedKeywords?.map((k, i) => (
                    <span key={i}>#{k}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* buttons */}
          <div className="button-group">

            <button
              className="btn-cart"
              onClick={handleAddToCart}
              disabled={isOwnProduct}
            >
              🛒 เพิ่มลงตะกร้า
            </button>

            {!isOwnProduct && (
              <button
                className="btn-chat"
                onClick={handleChat}
                disabled={chatLoading}
              >
                💬 แชทผู้ขาย
              </button>
            )}

            <button className="btn-buy">
              ⚡ ซื้อทันที
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
