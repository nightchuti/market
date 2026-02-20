import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import "./ProductDetail.css";

// ================= HELPER =================
const getImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${api.defaults.baseURL}${path.startsWith("/") ? path : "/" + path}`;
};
// ==========================================

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  // ================= FETCH PRODUCT =================
  useEffect(() => {
    api
      .get(`/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        if (res.data.images?.length) {
          setSelectedImage(res.data.images[0]);
        }
      })
      .catch(() => setProduct(null));
  }, [id]);

  // ================= CHAT =================
  const handleChat = async () => {
    if (!token) return alert("กรุณาเข้าสู่ระบบก่อน");
    if (!product) return;

    const sellerId = product.user?._id || product.user;

    if (String(sellerId) === String(currentUser?._id)) {
      return alert("ไม่สามารถแชทกับตัวเองได้");
    }

    if (chatLoading) return;
    setChatLoading(true);

    try {
      // 🔥 ถ้าเป็น sell_only → normal chat
      if (product.tradeOption === "sell_only") {
        const res = await api.post(
          "/api/chat/create-normal",
          { productId: product._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return navigate(`/chat/${res.data._id}`);
      }

      // 🔥 ถ้าเป็น trade_allowed หรือ negotiable → trade chat
      const res = await api.post(
        "/api/chat/create-trade",
        {
          productId: product._id,
          offeredProductId: null // เดี๋ยวให้ผู้ใช้เลือกในหน้า trade
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate(`/chat/${res.data._id}`);

    } catch (err) {
      alert(err.response?.data?.error || "ไม่สามารถเปิดแชทได้");
    } finally {
      setChatLoading(false);
    }
  };
  // ================= ADD TO CART =================
  const handleAddToCart = async () => {
    if (!token) return alert("กรุณาเข้าสู่ระบบก่อน");
    if (!product) return;

    const sellerId = product.user?._id || product.user;

    if (String(sellerId) === String(currentUser?._id)) {
      return alert("ไม่สามารถเพิ่มสินค้าของตัวเองลงตะกร้าได้");
    }

    try {
      await api.post(
        "/api/cart/add",
        { productId: product._id, quantity: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("เพิ่มลงตะกร้าเรียบร้อยแล้ว");
    } catch {
      alert("เพิ่มสินค้าไม่สำเร็จ");
    }
  };

  // ================= BUY NOW =================
  const handleBuyNow = async () => {
    if (!token) return alert("กรุณาเข้าสู่ระบบก่อนซื้อสินค้า");
    if (!product) return;

    const sellerId = product.user?._id || product.user;

    if (String(sellerId) === String(currentUser?._id)) {
      return alert("ไม่สามารถซื้อสินค้าของตัวเองได้");
    }

    // 🔥 ถ้า trade_only → บังคับเข้า trade chat
    if (product.tradeOption === "trade_allowed") {
      return handleChat();
    }

    // 🔥 sell_only หรือ negotiable → ซื้อได้
    const itemToBuy = {
      _id: product._id,
      product: { _id: product._id },
      title: product.title,
      price: product.price,
      images: product.images,
      qty: 1,
      quantity: 1,
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
              : ""
      }
    });
  };

  // ================= RENDER =================
  if (!product) return <p>กำลังโหลด...</p>;

  const isOwnProduct =
    currentUser &&
    String(product.user?._id || product.user) ===
    String(currentUser._id);

  return (
    <div className="product-detail">

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
              src={getImageUrl(selectedImage)}
              alt={product.title}
            />

            <div className="thumbnail-row">
              {product.images?.map((img, i) => (
                <img
                  key={i}
                  src={getImageUrl(img)}
                  alt=""
                  className={selectedImage === img ? "active" : ""}
                  onClick={() => setSelectedImage(img)}
                />

              ))}
            </div>
          </div>

          {/* SELLER MINI */}
          <div
            className="seller-mini"
            onClick={() =>
              product.user?._id &&
              navigate(`/profile/${product.user._id}`)
            }
            style={{ cursor: "pointer" }}
          >
            <img
              src={
                product.user?.profileImage
                  ? getImageUrl(product.user.profileImage)
                  : "/images/default-avatar.png"
              }
              alt="seller-avatar"
              onError={(e) => {
                e.target.src = "/images/default-avatar.png";
              }}
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

          <div className="badge-row">
            {product.deliveryType === "meetup" && <span>นัดรับ</span>}
            {product.deliveryType === "delivery" && <span>จัดส่ง</span>}
            {product.deliveryType === "both" && <span>นัดรับ/จัดส่ง</span>}

            {product.tradeOption === "sell_only" && <span>ขาย</span>}
            {product.tradeOption === "trade_allowed" && <span>รับแลก</span>}
            {product.tradeOption === "negotiable" && <span>ซื้อ/แลก</span>}
          </div>

          <div className="location-box">
            <p>สถานที่ : {product.locationName || "-"}</p>
            <p>จุดนัดรับ : {product.meetupAddress || "-"}</p>
          </div>

          <div className="desc-box">
            <h4>รายละเอียดสินค้า</h4>
            <p>{product.description || "ไม่มีรายละเอียดสินค้า"}</p>
          </div>

          {(product.tradeOption === "trade_allowed" ||
            product.tradeOption === "negotiable") && (
              <div className="wanted-card">
                <div className="wanted-img-container">
                  <img
                    src={
                      product.wantedImages?.[0]
                        ? getImageUrl(product.wantedImages[0])
                        : "/images/noimage.png"
                    }
                    alt="wanted-item"
                  />
                </div>

                <div className="wanted-text-info">
                  <span className="wanted-label-top">ต้องการแลกกับ:</span>

                  <h4 className="wanted-category-name">
                    หมวดหมู่: {product.wantedCategory || "ไม่ระบุ"}
                  </h4>

                  <div className="wanted-tags">
                    {product.wantedKeywords?.length > 0 ? (
                      product.wantedKeywords.map((k, i) => (
                        <span key={i} className="tag-blue">
                          #{k}
                        </span>
                      ))
                    ) : (
                      <span className="tag-blue">#รับแลกทุกอย่าง</span>
                    )}
                  </div>
                </div>
              </div>
            )}

          <div className="button-group">

            <button
              className="btn-cart"
              onClick={handleAddToCart}
              disabled={isOwnProduct || product.tradeOption === "trade_allowed"}
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

            <button
              className="btn-buy"
              onClick={handleBuyNow}
              disabled={
                isOwnProduct || product.tradeOption === "trade_allowed"
              }
            >
              ⚡ ซื้อทันที
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
