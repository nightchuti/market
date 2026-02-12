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
    .then((res) => {
      if (Array.isArray(res.data)) {
        setProducts(res.data);
      } else if (Array.isArray(res.data.products)) {
        setProducts(res.data.products);
      } else {
        console.error("Products is not an array:", res.data);
        setProducts([]);
      }
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
            <div
              className="product-card"
              key={p._id}
              onClick={() => navigate(`/products/${p._id}`)}
            >

              <img
                src={
                  p.images && p.images.length > 0
                    ? p.images[0].startsWith("http")
                      ? p.images[0] // ถ้าเป็น URL เต็ม ใช้เลย
                      : `http://localhost:5000/uploads/${p.images[0].replace(/^\/?uploads\/?/, "")}`
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
