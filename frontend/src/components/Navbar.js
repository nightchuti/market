import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({ onLogin, onRegister }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  // ฟังก์ชัน Logout แบบยืนยันความปลอดภัย
  const handleLogout = () => {
    const confirmLogout = window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?");
    if (confirmLogout) {
      localStorage.clear();
      // ใช้ navigate แทนการ reload เพื่อความลื่นไหล หรือจะ reload ก็ได้ถ้าต้องการเคลียร์ state ทั้งหมด
      navigate("/");
      window.location.reload(); 
    }
  };

  return (
    <nav className="navbar">
      <div className="logo" onClick={() => navigate("/")} style={{ cursor: 'pointer' }}>
        YUT SHOP
      </div>

      <div className="menu">
        <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
          หน้าหลัก
        </Link>

        <Link to="/products" className={`nav-link ${isActive("/products") ? "active" : ""}`}>
          สินค้าทั้งหมด
        </Link>

        <Link to="/my-shop" className={`nav-link ${isActive("/my-shop") ? "active" : ""}`}>
          ร้านค้าของฉัน
        </Link>
      </div>

      <div className="nav-btn">
        {user ? (
          <>
            <button className="btn-add" onClick={() => navigate("/cart")}>
              🛒 ตะกร้าสินค้า
            </button>

            {/* ✅ เปลี่ยนชื่อผู้ใช้ให้กดเข้าหน้าโปรไฟล์ได้ */}
            <span 
              className={`username-link ${isActive("/profile") ? "active" : ""}`} 
              onClick={() => navigate("/profile")}
              style={{ cursor: 'pointer', margin: '0 15px', fontWeight: 'bold' }}
            >
              👤 {user.username}
            </span>

            {/* ✅ ปุ่ม Logout แบบต้องกดยืนยัน */}
            <button className="btn-outline" onClick={handleLogout}>
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