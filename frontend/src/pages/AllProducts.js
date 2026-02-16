import { useEffect, useState } from "react";
import api from "../api";
import "./AllProducts.css";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";

function AllProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tradeOption, setTradeOption] = useState("");
  const [deliveryType, setDeliveryType] = useState("");

  // ❌ ลบ useNavigate

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
          <option value="อื่นๆ">อื่นๆ</option>
        </select>

        <button onClick={handleSearch}>ค้นหา</button>
      </div>

      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>

      {products.length === 0 && <p>ไม่พบสินค้า</p>}
    </div>
  );
}

export default AllProducts;
