import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminDashboardPay from "./AdminDashboardPay";
import AdminCoupon from "./AdminCoupon";
import AdminAdsManager from "./AdminAdsManager";
import AdminActivity from "./AdminActivity";
import AdminTransfer from "./AdminTransfer";
import AdminMember from "./AdminDashboardSubPay";
import AdminDashboard from "./AdminDashboard";

const MENUS = [
  { key: "dashboard", label: " Dashboard" },
  { key: "payments",  label: " ตรวจสอบการจ่ายเงิน" },
  { key: "member",    label: " ตรวจสอบสมาชิก" },
  { key: "coupon",    label: " จัดการคูปอง" },
  { key: "ads",       label: " จัดการโฆษณา" },
  { key: "transfer",  label: " โอนเงินให้ร้านค้า" },
  { key: "activity",  label: " กิจกรรมทั้งหมด" },
];

/* inject CSS once */
const STYLE = `
  .ap-wrap { display:flex; height:100vh; overflow:hidden; position:relative; font-family:'Prompt',sans-serif; }

  .ap-sidebar {
    width:230px; background:#0d1b2a; color:#fff;
    padding:20px 14px; display:flex; flex-direction:column; gap:6px;
    flex-shrink:0; overflow-y:auto; transition:transform .25s ease; z-index:250;
  }
  .ap-logo {
    font-size:18px; font-weight:700; margin-bottom:16px;
    padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,.15); letter-spacing:1px;
  }
  .ap-menu {
    background:transparent; border:none; color:#cdd7e0;
    text-align:left; padding:10px 12px; cursor:pointer;
    font-size:14px; border-radius:8px; font-family:inherit;
    transition:background .15s, color .15s; white-space:nowrap;
  }
  .ap-menu:hover  { background:rgba(255,255,255,.07); color:#fff; }
  .ap-menu.active { background:rgba(255,255,255,.13); color:#fff; font-weight:600; }

  .ap-main { flex:1; display:flex; flex-direction:column; min-width:0; overflow:hidden; }
  .ap-header {
    height:56px; background:#fff; border-bottom:1px solid #e2e8f0;
    display:flex; align-items:center; justify-content:space-between;
    padding:0 16px; flex-shrink:0; font-weight:700; font-size:15px;
  }
  .ap-header-left { display:flex; align-items:center; gap:10px; }
  .ap-burger {
    display:none; background:none; border:none;
    font-size:22px; cursor:pointer; color:#333; padding:2px 6px; line-height:1;
  }
  .ap-logout {
    background:#e63946; border:none; color:#fff;
    padding:7px 14px; border-radius:6px; cursor:pointer; font-size:13px; font-family:inherit;
  }
  .ap-content { flex:1; overflow-y:auto; background:#f4f6f9; }

  /* overlay */
  .ap-overlay {
    display:none; position:fixed; inset:0;
    background:rgba(0,0,0,.45); z-index:200;
  }

  /* mobile */
  @media (max-width:768px) {
    .ap-sidebar {
      position:fixed; top:0; left:0; bottom:0;
      transform:translateX(-100%);
      box-shadow:4px 0 24px rgba(0,0,0,.3);
    }
    .ap-sidebar.open { transform:translateX(0); }
    .ap-burger { display:block; }
    .ap-overlay.open { display:block; }
  }
`;
if (!document.getElementById("ap-style")) {
  const el = document.createElement("style");
  el.id = "ap-style"; el.textContent = STYLE;
  document.head.appendChild(el);
}

const AdminPanel = () => {
  const [active, setActive] = useState("dashboard");
  const [open, setOpen]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const pick = (key) => { setActive(key); setOpen(false); };

  const handleLogout = () => {
    if (window.confirm("ออกจากระบบแอดมินใช่หรือไม่?")) {
      localStorage.clear(); navigate("/"); window.location.reload();
    }
  };

  const renderContent = () => {
    switch (active) {
      case "payments":  return <AdminDashboardPay />;
      case "coupon":    return <AdminCoupon />;
      case "ads":       return <AdminAdsManager />;
      case "activity":  return <AdminActivity />;
      case "transfer":  return <AdminTransfer />;
      case "member":    return <AdminMember />;
      default: return <AdminDashboard />;
    }
  };

  const label = MENUS.find(m => m.key === active)?.label || "Dashboard";

  return (
    <div className="ap-wrap">
      <div className={`ap-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />

      <div className={`ap-sidebar ${open ? "open" : ""}`}>
        <div className="ap-logo">⚙️ ADMIN</div>
        {MENUS.map(m => (
          <button key={m.key} className={`ap-menu ${active === m.key ? "active" : ""}`}
            onClick={() => pick(m.key)}>{m.label}</button>
        ))}
      </div>

      <div className="ap-main">
        <div className="ap-header">
          <div className="ap-header-left">
            <button className="ap-burger" onClick={() => setOpen(v => !v)}>☰</button>
            <span>{label}</span>
          </div>
          <button className="ap-logout" onClick={handleLogout}>Logout</button>
        </div>
        <div className="ap-content">{renderContent()}</div>
      </div>
    </div>
  );
};

export default AdminPanel;