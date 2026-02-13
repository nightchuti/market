import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({ onLogin, onRegister }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation();
  const navigate = useNavigate()

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

        <Link
          to="/my-shop"
          className={`nav-link ${isActive("/my-shop") ? "active" : ""}`}
        >
          ร้านค้าของฉัน
        </Link>
      </div>

      <div className="nav-btn">
        {user ? (
          <>

            <button
              className="btn-add"
              onClick={() => navigate("/add-product")}
            >
              🛒ตะกร้าสินค้า
            </button>

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
