import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ProductDetail.css";
import { api } from "../api";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  const SERVER_URL = api.defaults.baseURL;

useEffect(() => {
  api
    .get(`/api/products/${id}`)
    .then((res) => {
      console.log("Product Data:", res.data);
      setProduct(res.data);
      if (res.data.images?.length) {
        setSelectedImage(res.data.images[0]);
      }
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
      const res = await api.post(
        `/api/chat/normal`,
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
      await api.post(
        `/api/cart/add`,
        { productId: product._id, quantity: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("เพิ่มลงตะกร้าเรียบร้อยแล้ว");
    } catch {
      alert("เพิ่มสินค้าไม่สำเร็จ");
    }
  };

  const handleBuyNow = () => {
  if (!token) return alert("กรุณาเข้าสู่ระบบก่อนซื้อสินค้า");
  if (!product) return;

  const sellerId = product.user?._id || product.user;
  if (String(sellerId) === String(currentUser._id))
    return alert("ไม่สามารถซื้อสินค้าของตัวเองได้");

  const itemToBuy = {
    _id: product._id,
    product: { _id: product._id },
    title: product.title,
    price: product.price,
    images: product.images,
    qty: 1,
    quantity: 1,                // ✅ เพิ่ม
    deliveryType: product.deliveryType
  };

  navigate("/checkout", {
    state: {
      items: [itemToBuy],
      deliveryMode:
        product.deliveryType === "meetup"
          ? "PICKUP"
          : product.deliveryType === "delivery"
            ? "DELIVERY"
            : ""       // both
    }
  });
};

  // ==================

  if (!product) return <p>กำลังโหลด...</p>;

  const isOwnProduct =
    currentUser &&
    String(product.user?._id || product.user) === String(currentUser._id);

  return (
    <div className="product-detail">
      {/* ส่วนปุ่มย้อนกลับที่ปรับใหม่ */}
      <div className="back-button-wrapper">
        <button className="btn-back-global" onClick={() => navigate(-1)}>
          ← กลับ
        </button>
      </div>

      <div className="detail-container">

        {/* LEFT */}
        <div>

          <div className="image-box">
            <img
              className="main-image"
              src={
                selectedImage.startsWith("http")
                  ? selectedImage
                  : `${SERVER_URL}${selectedImage}`
              }
              alt=""
            />

            <div className="thumbnail-row">
              {product.images?.map((img, i) => (
                <img
                  key={i}
                  src={img.startsWith("http") ? img : `${SERVER_URL}${img}`}
                  className={selectedImage === img ? "active" : ""}
                  onClick={() => setSelectedImage(img)}
                />
              ))}
            </div>
          </div>

          {/* Seller */}
          {/* ส่วนข้อมูลผู้ขาย (Seller) */}

          <div
            className="seller-mini"
            onClick={() => product.user?._id && navigate(`/profile/${product.user._id}`)}
            style={{ cursor: 'pointer' }}
          >
            <img
              src={
                product.user?.profileImage
                  ? (product.user.profileImage.startsWith("http")
                    ? product.user.profileImage
                    : `${SERVER_URL}${product.user.profileImage.startsWith('/') ? '' : '/'}${product.user.profileImage}`)
                  : "/images/default-avatar.png"
              }
              alt="seller"
              onError={(e) => e.target.src = "/images/default-avatar.png"}
            />
            <div>
              <b>{product.user?.username || "ผู้ขาย"}</b>
              <p>ดูหน้าร้านค้าออนไลน์ →</p>
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


          {/* ส่วนที่แก้ไข: ข้อมูลการเทรด (Trade Wanted) */}
          {(product.tradeOption === "trade_allowed" || product.tradeOption === "negotiable") && (
            <div className="wanted-card">
              <div className="wanted-img-container">
                <img
                  src={
                    product.wantedImages?.[0]
                      ? (product.wantedImages[0].startsWith("http")
                        ? product.wantedImages[0]
                        : `${SERVER_URL}${product.wantedImages[0]}`)
                      : "/images/noimage.png"
                  }
                  alt="wanted"
                  onError={(e) => e.target.src = "/images/noimage.png"}
                />
              </div>

              <div className="wanted-text-info">
                <span className="wanted-label-top">ต้องการแลกกับ:</span>
                {/* ดึงหมวดหมู่ที่ส่งมาจาก Backend */}
                <h4 className="wanted-category-name">
                  หมวดหมู่: {product.wantedCategory || "ไม่ระบุ"}
                </h4>

                <div className="wanted-tags">
                  {product.wantedKeywords && product.wantedKeywords.length > 0 ? (
                    product.wantedKeywords.map((k, i) => (
                      <span key={i} className="tag-blue">#{k}</span>
                    ))
                  ) : (
                    <span className="tag-blue">#รับแลกทุกอย่าง</span>
                  )}
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

            <button className="btn-buy"
              onClick={handleBuyNow}
              disabled={isOwnProduct}>
              ⚡ ซื้อทันที
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
