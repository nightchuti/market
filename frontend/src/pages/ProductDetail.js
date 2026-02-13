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
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    axios
      .get(`${API_URL}/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        if (res.data.images?.length) setSelectedImage(res.data.images[0]);
      })
      .catch(() => setProduct(null));
  }, [id]);

  // ✅ ฟังก์ชัน handleChat ต้องมี async อยู่ข้างหน้าแบบนี้
  const handleChat = async () => {
    if (!token) {
      alert("กรุณาเข้าสู่ระบบก่อนแชท");
      navigate("/login");
      return;
    }

    if (!product) return;

    // เช็คว่าเป็นสินค้าตัวเองหรือไม่
    const sellerId = product.user?._id || product.user;
    if (String(sellerId) === String(currentUser._id)) {
      alert("ไม่สามารถแชทกับตัวเองได้");
      return;
    }

    if (chatLoading) return;
    setChatLoading(true);

    try {
      // ✅ ตอนนี้จะใช้ await ได้แล้วเพราะอยู่ในฟังก์ชัน async
      const res = await axios.post(
        `${API_URL}/api/chat/normal`,
        { productId: product._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate(`/chat/${res.data._id}`);
    } catch (err) {
      const msg = err.response?.data?.error || "ไม่สามารถเปิดแชทได้";
      alert(msg);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAddToCart = () => {
    alert("เพิ่มลงตะกร้าแล้ว");
  };

  if (!product) return <p className="loading">กำลังโหลดข้อมูลสินค้า...</p>;

  // ตรวจสอบเจ้าของสินค้าเพื่อซ่อนปุ่มแชท
  const isOwnProduct = String(product.user?._id || product.user) === String(currentUser._id);

  return (
    <div className="product-detail">
      <button className="btn-back" onClick={() => navigate(-1)}>← กลับ</button>

      <div className="detail-container">
        {/* ส่วนรูปภาพ */}
        <div className="image-section">
          {product.images?.length > 0 && selectedImage ? (
            <img
              className="main-image"
              src={selectedImage.startsWith("http") ? selectedImage : `${API_URL}${selectedImage}`}
              alt={product.title}
            />
          ) : (
            <div className="main-image placeholder">📷 ไม่มีรูปสินค้า</div>
          )}

          <div className="thumbnail-row">
            {product.images?.map((img, i) => (
              <img
                key={i}
                className={selectedImage === img ? "active" : ""}
                src={img.startsWith("http") ? img : `${API_URL}${img}`}
                alt="thumb"
                onClick={() => setSelectedImage(img)}
              />
            ))}
          </div>
        </div>

        {/* ส่วนข้อมูลสินค้า */}
        <div className="info-section">
          <h2 className="title">{product.title}</h2>
          <p className="price">฿{product.price?.toLocaleString()}</p>
          <p className="stock">คงเหลือ {product.quantity} ชิ้น</p>

          <div className="badges">
            {product.deliveryType === "meetup" && <span>📍 นัดรับเท่านั้น</span>}
            {product.deliveryType === "delivery" && <span>📦 จัดส่งเท่านั้น</span>}
            {product.deliveryType === "both" && <span>🔁 นัดรับหรือจัดส่ง</span>}
          </div>

          <div className="seller-card">
            <h4>ผู้ขาย : {product.user?.username || "ไม่ทราบชื่อ"}</h4>
            <p>สถานที่ : {product.locationName || "ไม่ระบุ"}</p>
          </div>

          <div className="button-group">
            <button className="btn-cart" onClick={handleAddToCart}>🛒 เพิ่มลงตะกร้า</button>
            {!isOwnProduct && (
              <button className="btn-chat" onClick={handleChat} disabled={chatLoading}>
                {chatLoading ? "⏳ กำลังเปิด..." : "💬 แชทผู้ขาย"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="description-section">
        <h3>รายละเอียดสินค้า</h3>
        <p>{product.description || "ไม่มีรายละเอียดเพิ่มเติม"}</p>
      </div>
    </div>
  );
}

export default ProductDetail;