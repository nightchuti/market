import React, { useEffect, useState } from "react";
import api from "../../api";

// ===== สีของแต่ละ Type =====
const TYPE_COLOR = {
  ORDER:   { bg: "#dbeafe", color: "#1d4ed8" },
  PAYMENT: { bg: "#d1fae5", color: "#065f46" },
  USER:    { bg: "#ede9fe", color: "#6d28d9" },
  COUPON:  { bg: "#fef9c3", color: "#92400e" },
  ADS:     { bg: "#ffedd5", color: "#c2410c" },
  REPORT:  { bg: "#fee2e2", color: "#991b1b" },
};

// ===== Action ย่อยของแต่ละ Type =====
const ACTION_MAP = {
  PAYMENT: [
    { key: "ALL_PAYMENT",              label: "ทั้งหมด"            },
    { key: "ADMIN_CONFIRM_PAYMENT",    label: "อนุมัติชำระเงิน" },
    { key: "ADMIN_TRANSFER_TO_SELLER", label: "โอนเงินให้ร้านค้า" },
  ],
  USER: [
    { key: "ALL_USER",                 label: "ทั้งหมด"          },
    { key: "ADMIN_APPROVE_MEMBERSHIP", label: "อนุมัติสมาชิก" },
  ],
  COUPON: [
    { key: "ALL_COUPON",          label: "ทั้งหมด"        },
    { key: "ADMIN_CREATE_COUPON", label: "สร้างคูปอง" },
  ],
  ADS: [
    { key: "ALL_ADS",         label: "ทั้งหมด"        },
    { key: "ADMIN_CREATE_AD", label: "สร้างโฆษณา" },
  ],
  REPORT: [
    { key: "ALL_REPORT", label: "ทั้งหมด" },
  ],
};

const TYPE_TABS = ["ALL", "PAYMENT", "USER", "COUPON", "ADS", "REPORT"];

const TYPE_LABEL = {
  ALL:     "ทั้งหมด",
  PAYMENT: "การชำระเงิน",
  USER:    "สมาชิก",
  COUPON:  "คูปอง",
  ADS:     "โฆษณา",
  REPORT:  "รายงาน",
};

const STYLE = `
  .aa-wrap  { padding:24px; max-width:1100px; margin:0 auto; font-family:'Prompt',sans-serif; }
  .aa-h2    { font-size:20px; color:#1e293b; margin-bottom:16px; }

  /* Type tabs */
  .aa-types { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
  .aa-tbtn  {
    padding:8px 16px; border-radius:8px; border:1.5px solid #e2e8f0;
    background:#fff; cursor:pointer; font-size:13px; font-family:inherit;
    font-weight:600; transition:.15s; color:#64748b;
  }
  .aa-tbtn:hover { border-color:#94a3b8; color:#1e293b; }
  .aa-tbtn.on    { color:#fff; border-color:transparent; }

  /* Action sub-filter */
  .aa-actions { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; min-height:34px; }
  .aa-abtn {
    padding:5px 13px; border-radius:20px; border:1.5px solid #e2e8f0;
    background:#f8fafc; cursor:pointer; font-size:12px; font-family:inherit;
    transition:.15s; color:#475569;
  }
  .aa-abtn:hover { background:#e2e8f0; }
  .aa-abtn.on    { background:#0d1b2a; color:#fff; border-color:#0d1b2a; }

  /* Stats bar */
  .aa-stats { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px; }
  .aa-stat  {
    background:#fff; border-radius:10px; padding:10px 18px;
    box-shadow:0 1px 6px rgba(0,0,0,.06); font-size:13px;
    display:flex; align-items:center; gap:8px;
  }
  .aa-stat-num { font-size:20px; font-weight:700; color:#0d1b2a; }
  .aa-stat-lbl { color:#64748b; font-size:12px; }

  /* table */
  .aa-table-wrap { background:#fff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,.06); overflow-x:auto; }
  .aa-table { width:100%; border-collapse:collapse; min-width:580px; }
  .aa-table thead tr { background:#f8fafc; }
  .aa-table th { padding:13px 14px; text-align:left; font-size:13px; color:#64748b; white-space:nowrap; }
  .aa-table td { padding:12px 14px; font-size:14px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
  .aa-table tr:last-child td { border-bottom:none; }
  .aa-table tr:hover td { background:#fafbfc; }

  .aa-badge { display:inline-block; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700; white-space:nowrap; }
  .aa-action-tag {
    display:inline-block; padding:2px 8px; border-radius:6px;
    font-size:11px; background:#f1f5f9; color:#475569; white-space:nowrap;
  }
  .aa-user  { font-size:12px; color:#64748b; }
  .aa-desc  { color:#334155; line-height:1.5; max-width:340px; }

  /* mobile cards */
  .aa-cards { display:none; flex-direction:column; gap:10px; }
  .aa-card  {
    background:#fff; border-radius:12px; padding:14px;
    box-shadow:0 2px 8px rgba(0,0,0,.06); border:1px solid #f0f4f8;
  }
  .aa-card-top  { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px; flex-wrap:wrap; }
  .aa-card-desc { font-size:13px; color:#334155; margin:6px 0; line-height:1.5; }
  .aa-card-foot { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; border-top:1px solid #f1f5f9; padding-top:8px; margin-top:6px; }
  .aa-card-user { font-size:12px; color:#64748b; }
  .aa-card-date { font-size:11px; color:#94a3b8; }

  .aa-empty { text-align:center; padding:50px; color:#94a3b8; font-size:15px; }

  .aa-divider { height:1px; background:#f1f5f9; margin:12px 0; }

  @media (max-width:640px) {
    .aa-wrap { padding:14px; }
    .aa-table-wrap { display:none; }
    .aa-cards { display:flex; }
    .aa-stat-num { font-size:17px; }
  }
`;

if (!document.getElementById("aa-style")) {
  const el = document.createElement("style");
  el.id = "aa-style"; el.textContent = STYLE;
  document.head.appendChild(el);
}

// ===== คำนวณสีปุ่ม Type tab =====
const getTypeBtnStyle = (type, isOn) => {
  if (type === "ALL") {
    return isOn
      ? { background: "#0d1b2a", borderColor: "#0d1b2a" }
      : {};
  }
  const c = TYPE_COLOR[type];
  if (!c) return {};
  return isOn
    ? { background: c.color, borderColor: c.color }
    : { borderColor: c.color, color: c.color };
};

const AdminActivity = () => {
  const [activities, setActivities]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterType, setFilterType]   = useState("ALL");
  const [filterAction, setFilterAction] = useState("ALL_ALL");

  // โหลดข้อมูลตาม type
  const load = async (type) => {
    setLoading(true);
    try {
      const params = type !== "ALL" ? { type } : {};
      const res = await api.get("/api/admin/activities", { params });
      setActivities(Array.isArray(res.data) ? res.data : res.data.activities || []);
    } catch (err) {
      console.error(err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filterType); }, [filterType]);

  // เปลี่ยน type tab → reset action filter
  const handleTypeChange = (type) => {
    setFilterType(type);
    setFilterAction(type === "ALL" ? "ALL_ALL" : `ALL_${type}`);
  };

  // กรอง action ในฝั่ง client
  const displayed = activities.filter(act => {
    const isAllAction = filterAction.startsWith("ALL_");
    if (isAllAction) return true;
    return act.action === filterAction;
  });

  // นับจำนวนแต่ละ type
  const countByType = TYPE_TABS.reduce((acc, t) => {
    acc[t] = t === "ALL" ? activities.length : activities.filter(a => a.type === t).length;
    return acc;
  }, {});

  // action sub-tabs ของ type ที่เลือก
  const actionTabs = filterType !== "ALL" ? (ACTION_MAP[filterType] || []) : [];

  const Badge = ({ type }) => {
    const s = TYPE_COLOR[type] || { bg: "#f1f5f9", color: "#475569" };
    return (
      <span className="aa-badge" style={{ background: s.bg, color: s.color }}>
        {type}
      </span>
    );
  };

  const ActionTag = ({ action }) => (
    <span className="aa-action-tag">{action}</span>
  );

  return (
    <div className="aa-wrap">
      <h2 className="aa-h2">ประวัติกิจกรรมของระบบ</h2>

      {/* ===== Type tabs ===== */}
      <div className="aa-types">
        {TYPE_TABS.map(t => (
          <button
            key={t}
            className={`aa-tbtn ${filterType === t ? "on" : ""}`}
            style={getTypeBtnStyle(t, filterType === t)}
            onClick={() => handleTypeChange(t)}
          >
            {TYPE_LABEL[t]}
            {countByType[t] > 0 && (
              <span style={{
                marginLeft: 6, background: filterType === t ? "rgba(255,255,255,.25)" : "#f1f5f9",
                color: filterType === t ? "#fff" : "#64748b",
                borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700
              }}>
                {countByType[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== Action sub-filter (เฉพาะเมื่อเลือก type แล้ว) ===== */}
      {actionTabs.length > 0 && (
        <div className="aa-actions">
          {actionTabs.map(a => (
            <button
              key={a.key}
              className={`aa-abtn ${filterAction === a.key ? "on" : ""}`}
              onClick={() => setFilterAction(a.key)}
            >
              {a.label}
              {a.key.startsWith("ALL_")
                ? ` (${activities.length})`
                : ` (${activities.filter(x => x.action === a.key).length})`
              }
            </button>
          ))}
        </div>
      )}

      <div className="aa-divider" />

      {/* ===== Content ===== */}
      {loading ? (
        <p style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>กำลังโหลด...</p>
      ) : displayed.length === 0 ? (
        <div className="aa-empty">ไม่มีกิจกรรมในหมวดนี้</div>
      ) : (<>

        {/* Desktop table */}
        <div className="aa-table-wrap">
          <table className="aa-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ประเภท</th>
                <th>Action</th>
                <th>รายละเอียด</th>
                <th>แอดมิน</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(act => (
                <tr key={act._id}>
                  <td style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                    {new Date(act.createdAt).toLocaleString("th-TH")}
                  </td>
                  <td><Badge type={act.type} /></td>
                  <td><ActionTag action={act.action} /></td>
                  <td className="aa-desc">{act.description}</td>
                  <td className="aa-user">{act.user?.username || act.user?.email || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="aa-cards">
          {displayed.map(act => (
            <div key={act._id} className="aa-card">
              <div className="aa-card-top">
                <Badge type={act.type} />
                <ActionTag action={act.action} />
              </div>
              <div className="aa-card-desc">{act.description}</div>
              <div className="aa-card-foot">
                <span className="aa-card-user">👤 {act.user?.username || act.user?.email || "-"}</span>
                <span className="aa-card-date">{new Date(act.createdAt).toLocaleString("th-TH")}</span>
              </div>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
};

export default AdminActivity;