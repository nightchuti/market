import React, { useState, useEffect } from "react";
import api from "../../api";

const STYLE = `
  .dash { padding:28px; background:#f4f6f9; min-height:100%; font-family:'Prompt',sans-serif; }

  /* ===== Header ===== */
  .dash-header { margin-bottom:24px; }
  .dash-title  { font-size:22px; font-weight:700; color:#0d1b2a; margin:0 0 4px; }
  .dash-sub    { font-size:13px; color:#94a3b8; margin:0; }

  /* ===== Stat cards ===== */
  .dash-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
  .dash-card {
    background:#fff; border-radius:14px; padding:20px;
    box-shadow:0 2px 10px rgba(0,0,0,.06);
    display:flex; flex-direction:column; gap:6px;
    border-top:3px solid transparent; transition:.2s;
  }
  .dash-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.1); }
  .dash-card-icon { font-size:26px; margin-bottom:4px; }
  .dash-card-num  { font-size:28px; font-weight:700; color:#0d1b2a; line-height:1; }
  .dash-card-lbl  { font-size:13px; color:#64748b; }
  .dash-card-sub  { font-size:12px; color:#94a3b8; margin-top:2px; }

  /* ===== 2-col layout ===== */
  .dash-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px; }

  /* ===== Panel ===== */
  .dash-panel { background:#fff; border-radius:14px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,.06); }
  .dash-panel-head {
    display:flex; justify-content:space-between; align-items:center;
    margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid #f1f5f9;
  }
  .dash-panel-title { font-size:15px; font-weight:700; color:#0d1b2a; margin:0; }
  .dash-panel-count {
    font-size:12px; background:#f1f5f9; color:#64748b;
    padding:3px 10px; border-radius:20px; font-weight:600;
  }

  /* ===== Order rows ===== */
  .dash-order { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f8fafc; }
  .dash-order:last-child { border-bottom:none; }
  .dash-order-id  { font-size:13px; font-weight:600; color:#334155; }
  .dash-order-shop{ font-size:12px; color:#94a3b8; }
  .dash-order-amt { font-size:14px; font-weight:700; color:#0d1b2a; }
  .dash-status {
    display:inline-block; padding:2px 9px; border-radius:10px;
    font-size:11px; font-weight:600;
  }

  /* ===== Activity rows ===== */
  .dash-act { display:flex; gap:12px; padding:10px 0; border-bottom:1px solid #f8fafc; align-items:flex-start; }
  .dash-act:last-child { border-bottom:none; }
  .dash-act-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:5px; }
  .dash-act-desc { font-size:13px; color:#334155; line-height:1.5; flex:1; }
  .dash-act-time { font-size:11px; color:#94a3b8; white-space:nowrap; }

  /* ===== Quick stat row ===== */
  .dash-quick { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
  .dash-quick-item {
    background:#fff; border-radius:12px; padding:16px;
    box-shadow:0 2px 8px rgba(0,0,0,.05);
    display:flex; align-items:center; gap:14px;
  }
  .dash-quick-icon {
    width:44px; height:44px; border-radius:12px;
    display:flex; align-items:center; justify-content:center;
    font-size:20px; flex-shrink:0;
  }
  .dash-quick-num { font-size:20px; font-weight:700; color:#0d1b2a; }
  .dash-quick-lbl { font-size:12px; color:#64748b; }

  /* ===== Empty ===== */
  .dash-empty { text-align:center; padding:30px; color:#cbd5e1; font-size:13px; }

  /* ===== Loading skeleton ===== */
  .dash-skel {
    background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
    background-size:200% 100%; animation:skel 1.4s infinite;
    border-radius:6px; height:20px;
  }
  @keyframes skel { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  /* ===== Responsive ===== */
  @media (max-width:900px) {
    .dash-grid  { grid-template-columns:repeat(2,1fr); }
    .dash-quick { grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:640px) {
    .dash      { padding:14px; }
    .dash-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
    .dash-row  { grid-template-columns:1fr; }
    .dash-quick{ grid-template-columns:1fr 1fr; }
    .dash-card-num { font-size:22px; }
  }
`;

if (!document.getElementById("dash-style")) {
  const el = document.createElement("style");
  el.id = "dash-style"; el.textContent = STYLE;
  document.head.appendChild(el);
}

// ===== สีสถานะออเดอร์ =====
const STATUS_STYLE = {
  WaitingConfirm: { bg: "#fef9c3", color: "#92400e", label: "รอยืนยัน" },
  Paid:           { bg: "#d1fae5", color: "#065f46", label: "ชำระแล้ว" },
  Preparing:      { bg: "#dbeafe", color: "#1d4ed8", label: "เตรียมสินค้า" },
  Shipping:       { bg: "#ede9fe", color: "#6d28d9", label: "กำลังส่ง" },
  Completed:      { bg: "#f0fdf4", color: "#15803d", label: "เสร็จสิ้น" },
  Cancelled:      { bg: "#fee2e2", color: "#991b1b", label: "ยกเลิก" },
};

const TYPE_DOT = {
  PAYMENT: "#065f46",
  USER:    "#6d28d9",
  COUPON:  "#92400e",
  ADS:     "#c2410c",
  ORDER:   "#1d4ed8",
  REPORT:  "#991b1b",
};

// ===== Format เวลา =====
const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "เมื่อกี้";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
};

const AdminDashboard = () => {
  const [payments, setPayments]   = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [members, setMembers]     = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, t, m, a] = await Promise.allSettled([
          api.get("/api/orders/admin/all-payments"),
          api.get("/api/orders/admin/pending-transfer"),
          api.get("/api/memberships/admin/memberships"),
          api.get("/api/admin/activities", { params: { limit: 8 } }),
        ]);

        if (p.status === "fulfilled") setPayments(p.value.data || []);
        if (t.status === "fulfilled") setTransfers(t.value.data || []);
        if (m.status === "fulfilled") setMembers(m.value.data || []);
        if (a.status === "fulfilled") {
          const d = a.value.data;
          setActivities(Array.isArray(d) ? d : d.activities || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ===== คำนวณตัวเลข =====
  const waitingPayment  = payments.filter(o => o.status === "WaitingConfirm").length;
  const paidOrders      = payments.filter(o => o.status === "Paid").length;
  const pendingTransfer = transfers.length;
  const pendingMembers  = members.filter(m => m.status === "pending").length;

  const totalRevenue = payments
    .filter(o => o.status === "Paid")
    .reduce((s, o) => s + (o.totalPrice || 0), 0);

  const recentPayments = payments.slice(0, 5);
  const recentActivities = activities.slice(0, 8);

  const now = new Date();
  const dateStr = now.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // ===== Stat cards config =====
  const CARDS = [
    {
      icon: "", num: waitingPayment,
      label: "รอตรวจสอบสลิป", sub: "ต้องอนุมัติ",
      color: "#f59e0b", urgent: waitingPayment > 0
    },
    {
      icon: "", num: paidOrders,
      label: "ชำระเงินแล้ว", sub: "ออเดอร์ที่ผ่านแล้ว",
      color: "#10b981"
    },
    {
      icon: "", num: pendingTransfer,
      label: "รอโอนเงินร้านค้า", sub: "ต้องดำเนินการ",
      color: "#6366f1", urgent: pendingTransfer > 0
    },
    {
      icon: "", num: pendingMembers,
      label: "คำขอสมาชิกใหม่", sub: "รออนุมัติ",
      color: "#8b5cf6", urgent: pendingMembers > 0
    },
  ];

  return (
    <div className="dash">

      {/* Header */}
      <div className="dash-header">
        <p className="dash-title">Dashboard</p>
        <p className="dash-sub">{dateStr}</p>
      </div>

      {/* Stat cards */}
      <div className="dash-grid">
        {CARDS.map((c, i) => (
          <div key={i} className="dash-card"
            style={{ borderTopColor: c.color, position: "relative", overflow: "hidden" }}>
            {c.urgent && (
              <div style={{
                position: "absolute", top: 10, right: 10,
                width: 8, height: 8, borderRadius: "50%",
                background: "#ef4444",
                boxShadow: "0 0 0 3px rgba(239,68,68,.2)"
              }} />
            )}
            <div className="dash-card-icon">{c.icon}</div>
            {loading
              ? <div className="dash-skel" style={{ width: 60 }} />
              : <div className="dash-card-num" style={{ color: c.color }}>{c.num}</div>
            }
            <div className="dash-card-lbl">{c.label}</div>
            <div className="dash-card-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue quick stat */}
      <div className="dash-quick">
        <div className="dash-quick-item">
          <div className="dash-quick-icon" style={{ background: "#d1fae5" }}>💰</div>
          <div>
            {loading
              ? <div className="dash-skel" style={{ width: 80 }} />
              : <div className="dash-quick-num">฿{totalRevenue.toLocaleString()}</div>
            }
            <div className="dash-quick-lbl">ยอดชำระทั้งหมด</div>
          </div>
        </div>
        <div className="dash-quick-item">
          <div className="dash-quick-icon" style={{ background: "#ede9fe" }}>👥</div>
          <div>
            {loading
              ? <div className="dash-skel" style={{ width: 50 }} />
              : <div className="dash-quick-num">{members.length}</div>
            }
            <div className="dash-quick-lbl">คำขอสมาชิกทั้งหมด</div>
          </div>
        </div>
        <div className="dash-quick-item">
          <div className="dash-quick-icon" style={{ background: "#fef9c3" }}>📋</div>
          <div>
            {loading
              ? <div className="dash-skel" style={{ width: 50 }} />
              : <div className="dash-quick-num">{payments.length}</div>
            }
            <div className="dash-quick-lbl">ออเดอร์ทั้งหมด</div>
          </div>
        </div>
      </div>

      {/* Bottom 2-col */}
      <div className="dash-row">

        {/* Recent payments */}
        <div className="dash-panel">
          <div className="dash-panel-head">
            <p className="dash-panel-title">รายการชำระเงินล่าสุด</p>
            <span className="dash-panel-count">{recentPayments.length} รายการ</span>
          </div>
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[1,2,3].map(i => <div key={i} className="dash-skel" />)}
            </div>
          ) : recentPayments.length === 0 ? (
            <div className="dash-empty">ไม่มีรายการ</div>
          ) : recentPayments.map(o => {
            const ss = STATUS_STYLE[o.status] || { bg:"#f1f5f9", color:"#64748b", label: o.status };
            const shop = o.items?.[0]?.product?.user?.username || "ร้านค้าทั่วไป";
            return (
              <div key={o._id} className="dash-order">
                <div>
                  <div className="dash-order-id">#{o._id.slice(-6).toUpperCase()}</div>
                  <div className="dash-order-shop">{shop}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div className="dash-order-amt">฿{o.totalPrice?.toLocaleString()}</div>
                  <span className="dash-status" style={{ background: ss.bg, color: ss.color }}>
                    {ss.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent activities */}
        <div className="dash-panel">
          <div className="dash-panel-head">
            <p className="dash-panel-title">กิจกรรมล่าสุด</p>
            <span className="dash-panel-count">{recentActivities.length} รายการ</span>
          </div>
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[1,2,3].map(i => <div key={i} className="dash-skel" />)}
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="dash-empty">ยังไม่มีกิจกรรม</div>
          ) : recentActivities.map(act => (
            <div key={act._id} className="dash-act">
              <div className="dash-act-dot"
                style={{ background: TYPE_DOT[act.type] || "#94a3b8" }} />
              <div className="dash-act-desc">{act.description}</div>
              <div className="dash-act-time">{timeAgo(act.createdAt)}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;