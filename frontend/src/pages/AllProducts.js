import { useEffect, useState } from "react";
import axios from "axios";
import "./AllProducts.css";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";

function AllProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [tradeOption, setTradeOption] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page")) || 1;

  useEffect(() => {
    fetchProducts({ page });
  }, [page]);

  const fetchProducts = async (params = {}) => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/products",
        { params }
      );

      setProducts(res.data.products);
      setPagination(res.data.pagination);
    } catch (err) {
      console.log(err);
      setProducts([]);
    }
  };

  const handleSearch = () => {
    fetchProducts({
      search,
      category,
      tradeOption,
      deliveryType,
      page: 1
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

      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="empty">ไม่พบสินค้า</p>
      )}
    </div>
  );
}

export default AllProducts;
