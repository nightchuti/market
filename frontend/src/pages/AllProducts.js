import { useEffect, useState } from "react";
import axios from "axios";
import "./AllProducts.css";
import { useNavigate } from "react-router-dom";

function AllProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [exchangeable, setExchangeable] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async (params = {}) => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/products",
        { params }
      );
      setProducts(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleSearch = () => {
    const params = {
      search,
      category,
      ...(exchangeable && { exchangeable: true })
    };

    fetchProducts(params);
  };

  return (
    <div className="all-products">

      {/* ===== HEADER ===== */}
      <h1>สินค้าทั้งหมด</h1>

      {/* ===== FILTER ===== */}
      <div className="filter-bar">
        <input
          placeholder="ค้นหาสินค้า..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">ทุกหมวดหมู่</option>
          <option value="เสื้อผ้า">เสื้อผ้า</option>
          <option value="เครื่องใช้ไฟฟ้า">เครื่องใช้ไฟฟ้า</option>
          <option value="หนังสือ">หนังสือ</option>
          <option value="เฟอร์นิเจอร์">เฟอร์นิเจอร์</option>
          <option value="อุปกรณ์การเรียน">อุปกรณ์การเรียน</option>
          <option value="อาหาร">อาหาร</option>
          <option value="อุปกรณ์สัตว์เลี้ยง">อุปกรณ์สัตว์เลี้ยง</option>
          <option value="อื่นๆ">อื่นๆ</option>
        </select>

        {/* 🔄 แลกเปลี่ยนได้ */}
        <label className="exchange-filter">
          <input
            type="checkbox"
            checked={exchangeable}
            onChange={() => setExchangeable(!exchangeable)}
          />
          แลกเปลี่ยนได้
        </label>

        <button className="btn-main" onClick={handleSearch}>
          ค้นหา
        </button>
      </div>

      {/* ===== PRODUCT GRID ===== */}
      <div className="product-grid">
        {products.map((p) => (
          <div
            className="product-card"
            key={p._id}
            onClick={() => navigate(`/products/${p._id}`)}
          >
            
            <img
              src={
                p.images && p.images.length > 0
                  ? p.images[0].startsWith("http")
                    ? p.images[0] // ถ้าเป็น URL เต็ม
                    : `http://localhost:5000/uploads/${p.images[0].replace(/^\/?uploads\/?/, "")}`
                  : "https://via.placeholder.com/300"
              }
              alt={p.title}
            />

            <h4>{p.title}</h4>
            <p className="price">฿{p.price}</p>
            <p className="seller">ผู้ขาย: {p.user?.username}</p>

            {p.exchangeable && (
              <span className="exchange-badge">🔄 แลกเปลี่ยนได้</span>
            )}
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <p className="empty">ไม่พบสินค้า</p>
      )}
    </div>
  );
}

export default AllProducts;
