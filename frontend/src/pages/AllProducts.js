import { useEffect, useState, useRef } from "react";
import api from "../api";
import "./AllProducts.css";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";

/* ─── Custom Select — dropdown ไม่ล้นจอมือถือ ─── */
function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="cselect" ref={ref}>
      <button
        type="button"
        className={`cselect-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg className="cselect-arrow" viewBox="0 0 10 6" width="10" height="6">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <ul className="cselect-menu">
          {options.map((o) => (
            <li
              key={o.value}
              className={`cselect-option ${o.value === value ? "selected" : ""}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const CATEGORY_OPTIONS = [
  { value: "", label: "ทุกหมวดหมู่" },
  { value: "เสื้อผ้า", label: "เสื้อผ้า" },
  { value: "เครื่องใช้ไฟฟ้า", label: "เครื่องใช้ไฟฟ้า" },
  { value: "หนังสือ", label: "หนังสือ" },
  { value: "เฟอร์นิเจอร์", label: "เฟอร์นิเจอร์" },
  { value: "อุปกรณ์การเรียน", label: "อุปกรณ์การเรียน" },
  { value: "อาหาร", label: "อาหาร" },
  { value: "อุปกรณ์สัตว์เลี้ยง", label: "อุปกรณ์สัตว์เลี้ยง" },
  { value: "อุปกรณ์อิเล็กทรอนิกส์", label: "อุปกรณ์อิเล็กทรอนิกส์" },
  { value: "อื่นๆ", label: "อื่นๆ" },
];

const TRADE_OPTIONS = [
  { value: "", label: "ทุกประเภทการขาย" },
  { value: "sell_only", label: "ขายเท่านั้น" },
  { value: "trade_allowed", label: "แลกเปลี่ยนเท่านั้น" },
  { value: "negotiable", label: "ต่อรองได้" },
];

const DELIVERY_OPTIONS = [
  { value: "", label: "ทุกประเภทการส่ง" },
  { value: "delivery", label: "จัดส่ง" },
  { value: "meetup", label: "นัดรับ" },
];

function AllProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tradeOption, setTradeOption] = useState("");
  const [deliveryType, setDeliveryType] = useState("");

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const page = parseInt(searchParams.get("page")) || 1;
    const searchQuery = searchParams.get("search") || "";
    const categoryQuery = searchParams.get("category") || "";
    const tradeQuery = searchParams.get("tradeOption") || "";
    const deliveryQuery = searchParams.get("deliveryType") || "";

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

  useEffect(() => {
    setSearchParams({ page: 1, search, category, tradeOption, deliveryType });
  }, [category, tradeOption, deliveryType]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setSearchParams({ page: 1, search, category, tradeOption, deliveryType });
    }, 500);
    return () => clearTimeout(delay);
  }, [search]);

  const fetchProducts = async (params = {}) => {
    try {
      const res = await api.get("/api/products", { params });
      setProducts(res.data.products);
      setPagination(res.data.pagination);
    } catch {
      setProducts([]);
    }
  };

  const handleSearch = () => {
    setSearchParams({ page: 1, search, category, tradeOption, deliveryType });
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

        <CustomSelect value={category} onChange={setCategory} options={CATEGORY_OPTIONS} placeholder="ทุกหมวดหมู่" />
        <CustomSelect value={tradeOption} onChange={setTradeOption} options={TRADE_OPTIONS} placeholder="ทุกประเภทการขาย" />
        <CustomSelect value={deliveryType} onChange={setDeliveryType} options={DELIVERY_OPTIONS} placeholder="ทุกประเภทการส่ง" />

        <button className="btn-main" onClick={handleSearch}>ค้นหา</button>
      </div>

      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>

      {products.length === 0 && <p>ไม่พบสินค้า</p>}

      {pagination && (
        <div className="pagination-container">
          <button
            className="page-btn"
            disabled={pagination.page === 1}
            onClick={() => setSearchParams({ page: pagination.page - 1, search, category, tradeOption, deliveryType })}
          >
            ← ก่อนหน้า
          </button>
          <div className="page-info">หน้า <span>{pagination.page}</span> จาก {pagination.pages}</div>
          <button
            className="page-btn"
            disabled={pagination.page === pagination.pages}
            onClick={() => setSearchParams({ page: pagination.page + 1, search, category, tradeOption, deliveryType })}
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  );
}

export default AllProducts;