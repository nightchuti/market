import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({ onLogin, onRegister }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="logo">YUT SHOP</div>

      <div className="menu">
        <Link
          to="/"
          className={`nav-link ${isActive("/") ? "active" : ""}`}
        >
          หน้าหลัก
        </Link>

        <Link
          to="/products"
          className={`nav-link ${isActive("/products") ? "active" : ""}`}
        >
          สินค้าทั้งหมด
        </Link>

        {user?.role === "shop" && (
          <Link
            to="/add-product"
            className={`nav-link ${isActive("/add-product") ? "active" : ""}`}
          >
            ลงขาย
          </Link>
        )}
      </div>

      <div className="nav-btn">
        {user ? (
          <>
            <span className="username">{user.username}</span>
            <button
              className="btn-outline"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button className="btn-outline" onClick={onLogin}>
              Login
            </button>
            <button className="btn-solid" onClick={onRegister}>
              Register
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
