import { useEffect, useState } from "react";
import axios from "axios";
import "./AllProducts.css";
import { useNavigate } from "react-router-dom";

function AllProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [exchangeable, setExchangeable] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts({ page: 1 });
  }, []);


  const fetchProducts = async (params = {}) => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/products",
        { params }
      );

      setProducts(res.data.products);
      setPagination(res.data.pagination); // ✅ ใช้จริงตรงนี้
    } catch (err) {
      console.log(err);
      setProducts([]);
    }
  };


  const handleSearch = () => {
    const params = {
      search,
      category,
      ...(exchangeable && { tradeOption: "exchange" })
    };

    fetchProducts(params);
  };

  return (
    <div className="all-products">
      <h1>สินค้าทั้งหมด</h1>

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
                    ? p.images[0]
                    : `http://localhost:5000/uploads/${p.images[0].replace(/^\/?uploads\/?/, "")}`
                  : "https://via.placeholder.com/300"
              }
              alt={p.title}
            />

            <h4>{p.title}</h4>
            <p className="price">฿{p.price}</p>
            <p className="seller">ผู้ขาย: {p.user?.username}</p>

            {p.tradeOption === "exchange" && (
              <span className="exchange-badge">🔄 แลกเปลี่ยนได้</span>
            )}
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <p className="empty">ไม่พบสินค้า</p>
      )}

      {/* ===== PAGINATION ===== */}
      {pagination && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={pagination.page === 1}
            onClick={() =>
              fetchProducts({ page: pagination.page - 1 })
            }
          >
            ← ก่อนหน้า
          </button>

          <div className="page-info">
            หน้า <span>{pagination.page}</span> จาก {pagination.pages}
          </div>

          <button
            className="page-btn"
            disabled={pagination.page === pagination.pages}
            onClick={() =>
              fetchProducts({ page: pagination.page + 1 })
            }
          >
            ถัดไป →
          </button>
        </div>
      )}



    </div>
  );
}

export default AllProducts;
