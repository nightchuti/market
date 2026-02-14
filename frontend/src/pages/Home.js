import { useEffect, useState } from "react";
import axios from "axios";
import "./Home.css";
import { useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";

function Home() {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("http://localhost:5000/api/products")
      .then((res) => setProducts(res.data.products || []))
      .catch((err) => console.log(err));
  }, []);

  const boostedItems = products.filter(p => p.isBoosted).slice(0, 4);

  return (
    <div className="home-clean-tech">
      {/* ===== LIGHT FUTURISTIC HERO ===== */}
      <section className="hero-clean">
        <div className="abstract-bg"></div> {/* วงกลมแสงสีเขียวจางๆ */}
        
        <div className="hero-inner">
          <div className="hero-text">
            <div className="status-pill">● KU Community Marketplace</div>
            <h1>ซื้อขายง่าย <br /><span className="green-gradient">สไตล์เด็กกำแพงแสน</span></h1>
            <p>เปลี่ยนการส่งต่อของมือสองให้เป็นเรื่องสนุก ด้วยระบบที่ล้ำกว่าเดิม</p>
            <div className="hero-btns">
              <button className="btn-primary-green" onClick={() => navigate("/products")}>
                เริ่มสำรวจสินค้า
              </button>
            </div>
          </div>

          {/* ✅ ส่วนสมัครสมาชิกโปรโมชัน: ดีไซน์แบบ Soft-Glass สีขาวสะอาดตา */}
          <div className="promo-white-glass">
            <div className="promo-content">
              <div className="promo-label">SPECIAL OFFER</div>
              <h3>อัปเกรดเป็นพรีเมียม ✨</h3>
              <p>สมัครวันนี้รับสิทธิ์ <strong>Boost โพสต์ฟรี!</strong> ให้สินค้าของคุณขึ้นไปอยู่ลำดับหน้าสุด</p>
              <ul className="benefit-items">
                <li>🟢 เพิ่มโอกาสขายได้เร็วขึ้น 3 เท่า</li>
                <li>🟢 ป้ายกำกับ "Verified Seller"</li>
              </ul>
              <button className="btn-white-action" onClick={() => navigate("/register")}>
                สมัครสมาชิกรับโปรโมชัน
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MINIMAL PRODUCT GRID ===== */}
      <section className="featured-home-clean">
        <div className="container">
          <div className="header-flex">
            <h2>สินค้าแนะนำพิเศษ</h2>
            <div className="view-all" onClick={() => navigate("/products")}>ดูทั้งหมด →</div>
          </div>

          <div className="clean-grid">
            {boostedItems.map((p) => (
              <div key={p._id} className="boost-wrapper-minimal">
                <div className="boost-label-minimal">RECOMMENDED</div>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;