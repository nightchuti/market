import { useEffect, useState } from "react";
import axios from "axios";
import "./Home.css";
import { useNavigate } from "react-router-dom";

function Home() {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/products")
      .then((res) => setProducts(res.data));
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <h1>ตลาดนัดมือสอง มก. กำแพงแสน</h1>
        <p>ซื้อ–ขาย–แลกเปลี่ยนสินค้าในชุมชนมหาวิทยาลัย</p>
        <button className="btn-main" onClick={() => navigate("/products")}>
          เริ่มช้อปปิ้ง
        </button>
      </section>

      <section className="product-section">
        <h2>สินค้าแนะนำ</h2>

        <div className="product-grid">
          {products.slice(0, 6).map((p) => (
            <div
              className="product-card"
              key={p._id}
              onClick={() => navigate(`/products/${p._id}`)}
            >
              <img
                src={
                  p.images?.length
                    ? `http://localhost:5000${p.images[0]}`
                    : "https://via.placeholder.com/300"
                }
                alt={p.title}
              />
              <h4>{p.title}</h4>
              <p className="price">฿{p.price}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
