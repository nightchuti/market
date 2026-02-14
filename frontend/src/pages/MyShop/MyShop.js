import { useEffect, useState } from "react";
import axios from "axios";
import "./MyShop.css";
import { useNavigate } from "react-router-dom";
import Inventory from "./Inventory";
import SalesHistory from "./SalesHistory";

const API_URL = "http://localhost:5000";

function MyShop() {
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("inventory");
  const [openId, setOpenId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoggedIn(false);
      setLoading(false);
    } else {
      setIsLoggedIn(true);
      fetchMyProducts();
    }
  }, []);

  const fetchMyProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products/my`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      setProducts(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
      } else {
        alert("โหลดข้อมูลสินค้าไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("ต้องการลบสินค้านี้หรือไม่?");
    if (!confirmDelete) return;
    try {
      await axios.delete(`${API_URL}/api/products/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      setProducts(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert("ลบสินค้าไม่สำเร็จ");
    }
  };

  const publishProduct = async (id) => {
    try {
      await axios.put(
        `${API_URL}/api/products/${id}/publish`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      setProducts(prev =>
        prev.map(p => (p._id === id ? { ...p, status: "available" } : p))
      );
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการลงขาย");
    }
  };

  if (loading) {
    return <div style={{ padding: "100px 20px", textAlign: "center" }}>กำลังโหลดข้อมูล...</div>;
  }

  if (!isLoggedIn) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center" }}>
        <h2>กรุณาเข้าสู่ระบบก่อนใช้งาน</h2>
        <button style={{ marginTop: "20px" }} onClick={() => navigate("/login")}>ไปหน้าเข้าสู่ระบบ</button>
      </div>
    );
  }

  // =========================================================
  // ✅ ส่วนการคำนวณ (ต้องอยู่ก่อน return และหลัง check loading/login)
  // =========================================================
  
  // 1. แยกกลุ่มสินค้าตามสถานะ
  const pendingProducts = products.filter(p => p.status === "pending");
  const availableProducts = products.filter(p => p.status === "available");
  const soldProducts = products.filter(p => p.status === "sold");

  // 2. สินค้าที่แสดงในคลัง (รวมตัวที่พร้อมขาย และ ตัวที่รอเรากดยืนยันลงขาย)
  const inventoryProducts = [...availableProducts, ...pendingProducts];

  // 3. คำนวณรายได้ (เฉพาะตัวที่ขายแล้ว)
  const totalIncome = soldProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  // =========================================================

  return (
    <div className="shop-wrapper">
      <div className="shop-header">
        <div>
          <h2>ร้านค้าของฉัน</h2>
          <p className="sub-text">จัดการสินค้าและติดตามยอดขายของคุณ</p>
        </div>
        <button className="btn-main" onClick={() => navigate("/add-product")}>
          + เพิ่มสินค้า
        </button>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          {/* แสดงจำนวนสินค้าที่มีอยู่จริงในคลัง ไม่นับของที่ขายไปแล้ว */}
          <h3>{inventoryProducts.length}</h3>
          <span>สินค้าในคลัง</span>
        </div>

        <div className="summary-card">
          {/* แจ้งเตือนจำนวนสินค้าที่ต้องกด 'ลงขาย' */}
          <h3 style={{ color: pendingProducts.length > 0 ? "#ef6c00" : "inherit" }}>
            {pendingProducts.length}
          </h3>
          <span>รอลงขาย</span>
        </div>

        <div className="summary-card">
          <h3>{soldProducts.length}</h3>
          <span>ขายแล้ว</span>
        </div>

        <div className="summary-card">
          <h3>฿{totalIncome.toLocaleString()}</h3>
          <span>รายได้รวม</span>
        </div>
      </div>

      <div className="shop-tabs">
        <button
          className={activeTab === "inventory" ? "active" : ""}
          onClick={() => setActiveTab("inventory")}
        >
          คลังสินค้า ({inventoryProducts.length})
        </button>
        <button
          className={activeTab === "sales" ? "active" : ""}
          onClick={() => setActiveTab("sales")}
        >
          ประวัติการขาย ({soldProducts.length})
        </button>
      </div>

      <div className="shop-list">
        {activeTab === "inventory" && (
          <Inventory
            products={inventoryProducts}
            openId={openId}
            setOpenId={setOpenId}
            handleDelete={handleDelete}
            navigate={navigate}
            publishProduct={publishProduct}
          />
        )}

        {activeTab === "sales" && (
          <SalesHistory products={soldProducts} />
        )}
      </div>
    </div>
  );
}

export default MyShop;