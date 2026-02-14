import { useEffect, useState } from "react";
import axios from "axios";
import "./MyShop.css";
import { useNavigate } from "react-router-dom";

function MyShop() {
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("inventory");
  const [openId, setOpenId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsLoggedIn(false);
    } else {
      setIsLoggedIn(true);
      fetchMyProducts();
    }
  }, []);


  const fetchMyProducts = async () => {
    const res = await axios.get(
      "http://localhost:5000/api/products/my",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );
    setProducts(res.data);
  };

  const available = products.filter(p => p.status === "available");
  const sold = products.filter(p => p.status === "sold");
  const totalIncome = sold.reduce((sum, p) => sum + (p.price || 0), 0);

  const list = activeTab === "inventory" ? available : sold;

  const toggleDropdown = (id) => {
    setOpenId(openId === id ? null : id);
  };

  if (!isLoggedIn) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center"}}>
        <h2>กรุณาเข้าสู่ระบบก่อนใช้งาน</h2>
      </div>
    );
  }

  return (
    <div className="shop-wrapper">

      {/* HEADER */}
      <div className="shop-header">
        <div>
          <h2>ร้านค้าของฉัน</h2>
          <p className="sub-text">จัดการสินค้าและติดตามยอดขายของคุณ</p>
        </div>

        <button
          className="btn-main"
          onClick={() => navigate("/add-product")}
        >
          + เพิ่มสินค้า
        </button>
      </div>

      {/* SUMMARY */}
      <div className="summary-cards">
        <div className="summary-card">
          <h3>{products.length}</h3>
          <span>สินค้าทั้งหมด</span>
        </div>

        <div className="summary-card">
          <h3>{available.length}</h3>
          <span>พร้อมขาย</span>
        </div>

        <div className="summary-card">
          <h3>{sold.length}</h3>
          <span>ขายแล้ว</span>
        </div>

        <div className="summary-card">
          <h3>฿{totalIncome}</h3>
          <span>รายได้รวม</span>
        </div>
      </div>

      {/* TABS */}
      <div className="shop-tabs">
        <button
          className={activeTab === "inventory" ? "active" : ""}
          onClick={() => setActiveTab("inventory")}
        >
          คลังสินค้า
        </button>

        <button
          className={activeTab === "sales" ? "active" : ""}
          onClick={() => setActiveTab("sales")}
        >
          ประวัติการขาย
        </button>
      </div>

      {/* LIST */}
      <div className="shop-list">
        {list.map(p => (
          <div key={p._id} className="shop-card">

            <div className="card-top">
              <div>
                <h4>{p.title}</h4>
                <span className="price">฿{p.price}</span>
              </div>

              <div className="card-actions">
                <span className={`status ${p.status}`}>
                  {p.status === "available" ? "พร้อมขาย" : "ขายแล้ว"}
                </span>

                <button
                  className="dropdown-btn"
                  onClick={() => toggleDropdown(p._id)}
                >
                  {openId === p._id ? "−" : "+"}
                </button>
              </div>
            </div>

            {openId === p._id && (
              <div className="card-dropdown">
                <p>{p.description}</p>

                <div className="detail-grid">
                  <div>
                    <strong>ประเภทขาย</strong>
                    <span>{p.tradeOption}</span>
                  </div>

                  <div>
                    <strong>การจัดส่ง</strong>
                    <span>{p.deliveryType}</span>
                  </div>

                  <div>
                    <strong>หมวดหมู่</strong>
                    <span>{p.category}</span>
                  </div>
                </div>

                {activeTab === "inventory" && (
                  <div className="dropdown-buttons">
                    <button
                      onClick={() => navigate(`/edit-product/${p._id}`)}
                      className="edit-btn"
                    >
                      แก้ไข
                    </button>

                    <button className="delete-btn">
                      ลบสินค้า
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  );
}

export default MyShop;
