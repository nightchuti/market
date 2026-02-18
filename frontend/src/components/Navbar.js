import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import "./Navbar.css";

export default function Navbar({ onLogin, onRegister }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      
      if (!token) {
        setUser(null);
        setOrderCount(0);
        return;
      }

      try {
        const res = await api.get("/api/auth/profile");
        setUser(res.data);

        const orderRes = await api.get("/api/orders/seller/all");
        const pending = orderRes.data.filter(
          (o) => o.status === "Paid"
        );

        setOrderCount(pending.length);

      } catch (err) {
        console.error("Navbar fetch error:", err);

        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      }
    };

    fetchUserData();
  }, [location.pathname, token]);

  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.clear();
      setUser(null);
      setOrderCount(0);
      navigate("/");
      window.location.reload();
    }
  };

  return (
    <nav className="navbar">

      <div
        className="logo"
        onClick={() => navigate("/")}
        style={{ cursor: "pointer" }}
      >
        <img src="/logo.png" alt="Logo" className="logo-img" />
        <span>FUSION J.I.F. ZAP</span>
      </div>

      <div className="menu">
        <Link
          to="/"
          className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
        >
          หน้าหลัก
        </Link>

        <Link
          to="/products"
          className={`nav-link ${location.pathname === "/products" ? "active" : ""}`}
        >
          สินค้าทั้งหมด
        </Link>

        <Link
          to="/my-shop"
          className={`nav-link shop-link-container ${
            location.pathname === "/my-shop" ? "active" : ""
          }`}
        >
          ร้านค้าของฉัน
          {orderCount > 0 && (
            <span className="nav-badge">{orderCount}</span>
          )}
        </Link>
      </div>

      <div className="nav-btn">
        {user ? (
          <>
            <button
              className="btn-add"
              onClick={() => navigate("/cart")}
            >
              🛒 ตะกร้าสินค้า
            </button>

            <div
              className={`user-mini ${
                location.pathname === "/profile" ? "active" : ""
              }`}
              onClick={() => navigate("/profile")}
            >
              <img
                src={
                  user.profileImage
                    ? `${api.defaults.baseURL}${user.profileImage}`
                    : "/images/default-avatar.png"
                }
                alt="profile"
                className="mini-avatar"
                onError={(e) => {
                  e.currentTarget.src = "/images/default-avatar.png";
                }}
              />

              <div className="user-mini-info">
                <span className="user-mini-name">
                  {user.username}
                </span>
                <span className="user-mini-sub">
                  บัญชีของฉัน
                </span>
              </div>
            </div>

            <button
              className="btn-outline"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-outline"
              onClick={onLogin}
            >
              Login
            </button>

            <button
              className="btn-solid"
              onClick={onRegister}
            >
              Register
            </button>
          </>
        )}
      </div>

    </nav>
  );
}
