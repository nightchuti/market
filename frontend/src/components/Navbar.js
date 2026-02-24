import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import "./Navbar.css";

export default function Navbar({ onLogin, onRegister }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [orderCount, setOrderCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuRef = useRef(null);

  // ปิด mobile menu เมื่อเปลี่ยนหน้า
  useEffect(() => {
    setMobileOpen(false);
    setToken(localStorage.getItem("token"));
  }, [location.pathname]);

  // ปิด menu เมื่อ click นอก
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    if (mobileOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileOpen]);

  // ปิด menu เมื่อ scroll
  useEffect(() => {
    const handleScroll = () => { if (mobileOpen) setMobileOpen(false); };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileOpen]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!token) {
        setUser(null);
        setOrderCount(0);
        return;
      }
      try {
        const res = await api.get("/api/auth/profile");
        setUser(res.data);
        const orderRes = await api.get("/api/orders/seller/orders");
        const pending = orderRes.data.orders.filter((o) => o.status === "Paid");
        setOrderCount(pending.length);
      } catch (err) {
        console.error("Navbar fetch error:", err);
        const savedUser = localStorage.getItem("user");
        if (savedUser) setUser(JSON.parse(savedUser));
      }
    };
    fetchUserData();
  }, [location.pathname, token]);

  const handleLogout = () => {
    setMobileOpen(false);
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.clear();
      setUser(null);
      setOrderCount(0);
      navigate("/");
      window.location.reload();
    }
  };

  const closeMenu = () => setMobileOpen(false);
  const isActive = (path) => location.pathname === path;

  return (
    <div ref={menuRef}>
      <nav className="navbar">

        {/* LOGO */}
        <div className="logo" onClick={() => navigate("/")}>
          <img src="/logo.png" alt="Logo" className="logo-img" />
          <span>FUSION J.I.F. ZAP</span>
        </div>

        {/* DESKTOP MENU */}
        <div className="menu">
          <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
            หน้าหลัก
          </Link>
          <Link
            to="/products"
            className={`nav-link ${isActive("/products") ? "active" : ""}`}
          >
            สินค้าทั้งหมด
          </Link>
          <Link
            to="/my-shop"
            className={`nav-link shop-link-container ${isActive("/my-shop") ? "active" : ""}`}
          >
            ร้านค้าของฉัน
            {orderCount > 0 && <span className="nav-badge">{orderCount}</span>}
          </Link>
          {user?.email === "admin@gmail.com" && user?.role === "admin" && (
            <Link
              to="/admin"
              className={`nav-link ${isActive("/admin") ? "active" : ""}`}
            >
              แดชบอร์ดแอดมิน
            </Link>
          )}
        </div>

        {/* DESKTOP RIGHT BUTTONS */}
        <div className="nav-btn">
          {user ? (
            <>
              <button className="btn-add" onClick={() => navigate("/cart")}>
                ตะกร้าสินค้า
              </button>
              <div
                className={`user-mini ${isActive("/profile") ? "active" : ""}`}
                onClick={() => navigate("/profile")}
              >
                <img
                  src={user?.profileImage || "/images/default-avatar.png"}
                  alt="profile"
                  className="mini-avatar"
                  onError={(e) => { e.currentTarget.src = "/images/default-avatar.png"; }}
                />
                <div className="user-mini-info">
                  <span className="user-mini-name">{user.username}</span>
                  <span className="user-mini-sub">บัญชีของฉัน</span>
                </div>
              </div>
              <button className="btn-outline" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button className="btn-outline" onClick={onLogin}>Login</button>
              <button className="btn-solid" onClick={onRegister}>Register</button>
            </>
          )}
        </div>

        {/* HAMBURGER (mobile only) */}
        <button
          className="hamburger"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="เมนู"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>

      </nav>

      {/* MOBILE MENU DRAWER */}
      {mobileOpen && (
        <div className="mobile-menu">

          {/* USER INFO HEADER */}
          {user && (
            <div className="mobile-user-info">
              <img
                src={user?.profileImage || "/images/default-avatar.png"}
                alt="profile"
                onError={(e) => { e.currentTarget.src = "/images/default-avatar.png"; }}
              />
              <div>
                <div className="mobile-user-name">{user.username}</div>
                <div className="mobile-user-role">สมาชิก KU Marketplace</div>
              </div>
            </div>
          )}

          {/* NAV LINKS */}
          <Link to="/" onClick={closeMenu} className={isActive("/") ? "active-link" : ""}>
            หน้าหลัก
          </Link>
          <Link
            to="/products"
            onClick={closeMenu}
            className={isActive("/products") ? "active-link" : ""}
          >
            สินค้าทั้งหมด
          </Link>
          <Link
            to="/my-shop"
            onClick={closeMenu}
            className={isActive("/my-shop") ? "active-link" : ""}
          >
            ร้านค้าของฉัน
            {orderCount > 0 && <span className="mobile-badge">{orderCount}</span>}
          </Link>
          {user?.email === "admin@gmail.com" && user?.role === "admin" && (
            <Link to="/admin" onClick={closeMenu}>แดชบอร์ดแอดมิน</Link>
          )}

          <div className="mobile-menu-divider" />

          {user ? (
            <>
              <button className="mobile-menu-btn" onClick={() => { navigate("/cart"); closeMenu(); }}>
                ตะกร้าสินค้า
              </button>
              <button className="mobile-menu-btn" onClick={() => { navigate("/profile"); closeMenu(); }}>
                โปรไฟล์ของฉัน
              </button>
              <div className="mobile-menu-divider" />
              <button className="mobile-menu-btn logout" onClick={handleLogout}>
                ออกจากระบบ
              </button>
            </>
          ) : (
            <>
              <button className="mobile-menu-btn" onClick={() => { onLogin(); closeMenu(); }}>
                เข้าสู่ระบบ
              </button>
              <button className="mobile-menu-btn" onClick={() => { onRegister(); closeMenu(); }}>
                สมัครสมาชิก
              </button>
            </>
          )}

        </div>
      )}
    </div>
  );
}