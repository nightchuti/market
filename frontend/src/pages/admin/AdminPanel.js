import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminDashboardPay from "./AdminDashboardPay";
import AdminCoupon from "./AdminCoupon";
import AdminAdsManager from "./AdminAdsManager";
import AdminActivity from "./AdminActivity";
import AdminTransfer from "./AdminTransfer";
import AdminMember from "./AdminDashboardSubPay"

const AdminPanel = () => {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm("ออกจากระบบแอดมินใช่หรือไม่?")) {
      localStorage.clear();
      navigate("/");
      window.location.reload();
    }
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "payments":
        return <AdminDashboardPay />;
      case "coupon":
        return <AdminCoupon />;
      case "ads":
        return <AdminAdsManager />;
      case "activity":
        return <AdminActivity />;
      case "transfer":
        return <AdminTransfer />;
      case "member":
        return <AdminMember />;
      default:
        return (
          <div style={{ padding: 30 }}>
            <h2>Dashboard</h2>
            <p>ยินดีต้อนรับเข้าสู่ระบบผู้ดูแลระบบ</p>
          </div>
        );
    }
  };

  return (
    <div style={styles.wrapper}>

      {/* ===== Sidebar ===== */}
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>ADMIN</h2>

        <button style={styles.menuBtn} onClick={() => setActiveMenu("dashboard")}>Dashboard</button>
        <button style={styles.menuBtn} onClick={() => setActiveMenu("payments")}>ตรวจสอบการจ่ายเงิน</button>
        <button style={styles.menuBtn} onClick={() => setActiveMenu("member")}>ตรวจสอบการจ่ายเงินสมาชิก</button>
        <button style={styles.menuBtn} onClick={() => setActiveMenu("coupon")}>จัดการคูปอง</button>
        <button style={styles.menuBtn} onClick={() => setActiveMenu("ads")}>จัดการโฆษณา</button>
        <button style={styles.menuBtn} onClick={() => setActiveMenu("transfer")}>โอนเงินให้ร้านค้า</button>
        <button style={styles.menuBtn} onClick={() => setActiveMenu("activity")}>กิจกรรมทั้งหมด</button>
      </div>

      {/* ===== Main Section ===== */}
      <div style={styles.mainSection}>

        {/* ===== Header ===== */}
        <div style={styles.header}>
          <div>🛠 ระบบจัดการแอดมิน</div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* ===== Content ===== */}
        <div style={styles.content}>
          {renderContent()}
        </div>

      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    display: "flex",
    height: "100vh",
    overflow: "hidden"
  },

  sidebar: {
    width: "230px",
    background: "#0d1b2a",
    color: "#fff",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  logo: {
    marginBottom: "20px",
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    paddingBottom: "10px"
  },

  menuBtn: {
    background: "transparent",
    border: "none",
    color: "#fff",
    textAlign: "left",
    padding: "10px",
    cursor: "pointer",
    fontSize: "14px"
  },

  mainSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column"
  },

  header: {
    height: "60px",
    background: "#ffffff",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    fontWeight: "bold"
  },

  logoutBtn: {
    background: "#e63946",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer"
  },

  content: {
    flex: 1,
    overflowY: "auto",
    background: "#f4f6f9"
  }
};

export default AdminPanel;