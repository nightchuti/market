import { useEffect, useState } from "react";
import "./AllProducts.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";

import { api } from "../api";

function AllProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tradeOption, setTradeOption] = useState("");
  const [deliveryType, setDeliveryType] = useState("");

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ โหลดข้อมูลทุกครั้งที่ URL เปลี่ยน
  useEffect(() => {
    const page = parseInt(searchParams.get("page")) || 1;
    const searchQuery = searchParams.get("search") || "";
    const categoryQuery = searchParams.get("category") || "";
    const tradeQuery = searchParams.get("tradeOption") || "";
    const deliveryQuery = searchParams.get("deliveryType") || "";

    // sync state กับ URL
    setSearch(searchQuery);
    setCategory(categoryQuery);
    setTradeOption(tradeQuery);
    setDeliveryType(deliveryQuery);

    fetchProducts({
      page,
      search: searchQuery,
      category: categoryQuery,
      tradeOption: tradeQuery,
      deliveryType: deliveryQuery
    });
  }, [searchParams]);

  const fetchProducts = async (params = {}) => {
    try {
      const res = await api.get("/api/products", { params });

      setProducts(res.data.products);
      setPagination(res.data.pagination);
    } catch (err) {
      console.log(err);
      setProducts([]);
    }
  };

  // ✅ กดค้นหา = เปลี่ยน URL
  const handleSearch = () => {
    setSearchParams({
      page: 1,
      search,
      category,
      tradeOption,
      deliveryType
    });
  };

  return (
    <div className="all-products">
      <h1>สินค้าทั้งหมด</h1>

      {/* ===== FILTER BAR ===== */}
      <div className="filter-bar">
        <input
          placeholder="ค้นหาสินค้า..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">ทุกหมวดหมู่</option>
          <option value="เสื้อผ้า">เสื้อผ้า</option>
          <option value="เครื่องใช้ไฟฟ้า">เครื่องใช้ไฟฟ้า</option>
          <option value="หนังสือ">หนังสือ</option>
          <option value="เฟอร์นิเจอร์">เฟอร์นิเจอร์</option>
          <option value="อุปกรณ์การเรียน">อุปกรณ์การเรียน</option>
          <option value="อาหาร">อาหาร</option>
          <option value="อุปกรณ์สัตว์เลี้ยง">อุปกรณ์สัตว์เลี้ยง</option>
          <option value="อุปกรณ์อิเล็กทรอนิกส์">อุปกรณ์อิเล็กทรอนิกส์</option>
          <option value="อื่นๆ">อื่นๆ</option>
        </select>

        <select value={tradeOption} onChange={(e) => setTradeOption(e.target.value)}>
          <option value="">ทุกประเภทการขาย</option>
          <option value="sell_only">ขายเท่านั้น</option>
          <option value="trade_allowed">แลกเปลี่ยนเท่านั้น</option>
          <option value="negotiable">ต่อรองได้</option>
        </select>

        <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
          <option value="">ทุกประเภทการส่ง</option>
          <option value="delivery">จัดส่ง</option>
          <option value="meetup">นัดรับ</option>
        </select>

        <button className="btn-main" onClick={handleSearch}>
          ค้นหา
        </button>
      </div>

      {/* ===== PRODUCT GRID ===== */}
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="empty">ไม่พบสินค้า</p>
      )}

      {/* ===== PAGINATION ===== */}
      {pagination && (
        <div className="pagination-container">
          <button
            className="page-btn"
            disabled={pagination.page === 1}
            onClick={() =>
              setSearchParams({
                page: pagination.page - 1,
                search,
                category,
                tradeOption,
                deliveryType
              })
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
              setSearchParams({
                page: pagination.page + 1,
                search,
                category,
                tradeOption,
                deliveryType
              })
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