import { useEffect, useState } from "react";
import axios from "axios";
import "./Home.css";
import { useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";

function Home() {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/products")
      .then((res) => {
        setProducts(res.data.products || []);
      })
      .catch((err) => console.log(err));
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
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
