import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";   // ✅ ต้องมีบรรทัดนี้
import "./MyShop.css";
import Inventory from "./Inventory";
import SalesHistory from "./SalesHistory";
import SellerOrderManagement from "./SellerOrderManagement"; // ✅ นำเข้า Component ใหม่

const API_URL = process.env.REACT_APP_API_URL;


function MyShop() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("inventory");
  const [openId, setOpenId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orderCount, setOrderCount] = useState(0); // เก็บจำนวนออเดอร์ใหม่
  const [completedOrders, setCompletedOrders] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {

      await fetchCompletedOrders();

      const token = localStorage.getItem("token");

      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      try {
        setIsLoggedIn(true);
        await fetchUserProfile();
        await fetchMyProducts();
        await fetchOrderCount();
      } catch (err) {
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, [navigate]);  // หรือใส่ location.pathname ก็ได้


  const fetchUserProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setUser(res.data);
    } catch (err) {
      console.error("โหลดโปรไฟล์ไม่สำเร็จ", err);
    }
  };

  const fetchMyProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products/my`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setProducts(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
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
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setProducts(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert("ลบสินค้าไม่สำเร็จ");
    }
  };

  const fetchOrderCount = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        `${API_URL}/api/orders/seller/all`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const paidOrders = res.data.filter(
        (order) => order.status === "Paid"
      );

      setOrderCount(paidOrders.length);

    } catch (err) {
      console.error("โหลดจำนวนออเดอร์ไม่สำเร็จ", err);
    }
  };

  const fetchCompletedOrders = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        `${API_URL}/api/orders/seller/all`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const completed = res.data.filter(
        order => order.status === "Completed"
      );

      setCompletedOrders(completed);

    } catch (err) {
      console.error("โหลดประวัติการขายไม่สำเร็จ", err);
    }
  };

  const publishProduct = async (id) => {
    try {
      await axios.put(`${API_URL}/api/products/${id}/publish`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setProducts(prev => prev.map(p => (p._id === id ? { ...p, status: "available" } : p)));
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการลงขาย");
    }
  };

  if (loading) return <div style={{ padding: "100px 20px", textAlign: "center" }}>กำลังโหลดข้อมูล...</div>;

  if (!isLoggedIn) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center" }}>
        <h2>กรุณาเข้าสู่ระบบก่อนใช้งาน</h2>
        <button style={{ marginTop: "20px" }} onClick={() => navigate("/login")}>ไปหน้าเข้าสู่ระบบ</button>
      </div>
    );
  }

  const pendingProducts = products.filter(p => p.status === "pending");
  const availableProducts = products.filter(p => p.status === "available");
  const soldCount = completedOrders.length;
  const inventoryProducts = [...availableProducts, ...pendingProducts];
  const totalIncome = completedOrders.reduce(
    (sum, order) => sum + (Number(order.totalPrice) || 0),
    0
  );

  return (
    <div className="shop-wrapper">
      <div className="shop-header">
        <div>
          <h2>ร้านค้าของฉัน {user?.membershipTier === "PRO" && <span className="pro-badge">PRO</span>}</h2>
          <p className="sub-text">จัดการสินค้าและติดตามยอดขายของคุณ</p>
        </div>
        <button className="btn-main" onClick={() => navigate("/add-product")}>
          + เพิ่มสินค้า
        </button>
      </div>

      {user?.membershipTier === "PRO" && (
        <div className="ad-request-card">
          <div className="ad-card-content">
            <div className="ad-icon">🍴</div>
            <div>
              <h4>สิทธิพิเศษ: ลงโฆษณาร้านอาหาร</h4>
              <p>โปรโมทร้านของคุณแทรกระหว่างสินค้าในหน้าแรกฟรี!</p>
            </div>
          </div>
          <button className="btn-request" onClick={() => navigate("/request-ad")}>
            ส่งคำขอโฆษณา
          </button>
        </div>
      )}

      <div className="summary-cards">
        <div className="summary-card">
          <h3>{inventoryProducts.length}</h3>
          <span>สินค้าในคลัง</span>
        </div>
        <div className="summary-card">
          <h3 style={{ color: pendingProducts.length > 0 ? "#ef6c00" : "inherit" }}>
            {pendingProducts.length}
          </h3>
          <span>รอลงขาย</span>
        </div>
        <div className="summary-card">
          <h3>{soldCount}</h3>
          <span>ขายแล้ว</span>
        </div>
        <div className="summary-card">
          <h3>฿{totalIncome.toLocaleString()}</h3>
          <span>รายได้รวม</span>
        </div>
      </div>

      <div className="shop-tabs">
        <button className={activeTab === "inventory" ? "active" : ""} onClick={() => setActiveTab("inventory")}>
          คลังสินค้า ({inventoryProducts.length})
        </button>
        <button className={activeTab === "orders" ? "active" : ""} onClick={() => setActiveTab("orders")}>
          คำสั่งซื้อ ({orderCount})
        </button>
        <button className={activeTab === "sales" ? "active" : ""} onClick={() => setActiveTab("sales")}>
          สำเร็จแล้ว ({soldProducts.length})
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
            userQuota={user?.boostQuota || 0}
            refreshProducts={() => {
              fetchMyProducts();
              fetchUserProfile();
            }}
          />
        )}

        {/* ✅ เพิ่มส่วนเรียกใช้ SellerOrderManagement */}
        {activeTab === "orders" && (
          <SellerOrderManagement setOrderCount={setOrderCount} />
        )}

        {activeTab === "sales" && (
          <SalesHistory orders={completedOrders} />
        )}

      </div>
    </div>
  );
}

export default MyShop;