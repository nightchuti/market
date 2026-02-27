import React, { useEffect, useState } from "react";
import api from "../../api";

const TYPE_COLOR = {
  ORDER:   { bg: "#dbeafe", color: "#1d4ed8" },
  PAYMENT: { bg: "#d1fae5", color: "#065f46" },
  USER:    { bg: "#ede9fe", color: "#6d28d9" },
  COUPON:  { bg: "#fef9c3", color: "#92400e" },
  ADS:     { bg: "#ffedd5", color: "#c2410c" },
  REPORT:  { bg: "#fee2e2", color: "#991b1b" },
};

const STYLE = `
  .aa-wrap { padding:24px; max-width:1000px; margin:0 auto; font-family:'Prompt',sans-serif; }
  .aa-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:10px; }
  .aa-h2   { font-size:20px; color:#1e293b; }
  .aa-filter { display:flex; gap:8px; flex-wrap:wrap; }
  .aa-fbtn { padding:7px 14px; border-radius:20px; border:1.5px solid #e2e8f0; background:#fff;
    cursor:pointer; font-size:13px; font-family:inherit; transition:.15s; }
  .aa-fbtn.on { background:#0d1b2a; color:#fff; border-color:#0d1b2a; }

  /* table */
  .aa-table-wrap { background:#fff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,.06); overflow-x:auto; }
  .aa-table { width:100%; border-collapse:collapse; min-width:560px; }
  .aa-table thead tr { background:#f8fafc; }
  .aa-table th { padding:13px 14px; text-align:left; font-size:13px; color:#64748b; white-space:nowrap; }
  .aa-table td { padding:12px 14px; font-size:14px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
  .aa-table tr:last-child td { border-bottom:none; }
  .aa-badge { display:inline-block; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700; white-space:nowrap; }
  .aa-user  { font-size:12px; color:#64748b; }
  .aa-desc  { color:#334155; line-height:1.4; }

  /* mobile cards */
  .aa-cards { display:none; flex-direction:column; gap:10px; }
  .aa-card  { background:#fff; border-radius:12px; padding:14px; box-shadow:0 2px 8px rgba(0,0,0,.06); border:1px solid #f0f4f8; }
  .aa-card-top  { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px; }
  .aa-card-date { font-size:11px; color:#94a3b8; margin-top:4px; }
  .aa-card-desc { font-size:13px; color:#334155; margin-bottom:6px; line-height:1.5; }
  .aa-card-user { font-size:12px; color:#64748b; }

  .aa-empty { text-align:center; padding:40px; color:#94a3b8; }

  @media (max-width:640px) {
    .aa-wrap { padding:14px; }
    .aa-table-wrap { display:none; }
    .aa-cards { display:flex; }
  }
`;

if (!document.getElementById("aa-style")) {
  const el = document.createElement("style"); el.id = "aa-style"; el.textContent = STYLE;
  document.head.appendChild(el);
}

const TYPES = ["ALL", "ORDER", "PAYMENT", "USER", "COUPON", "ADS", "REPORT"];

const AdminActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterType, setFilterType] = useState("ALL");

  const load = async (type) => {
    setLoading(true);
    try {
      const params = type !== "ALL" ? { type } : {};
      const res = await api.get("/api/admin/activities", { params });
      // รองรับทั้ง { activities: [...] } และ [...] array โดยตรง
      setActivities(Array.isArray(res.data) ? res.data : res.data.activities || []);
    } catch (err) {
      console.error(err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filterType); }, [filterType]);

  const Badge = ({ type }) => {
    const style = TYPE_COLOR[type] || { bg: "#f1f5f9", color: "#475569" };
    return <span className="aa-badge" style={{ background: style.bg, color: style.color }}>{type}</span>;
  };

  return (
    <div className="aa-wrap">
      <div className="aa-head">
        <h2 className="aa-h2">กิจกรรมทั้งหมดของระบบ</h2>
        <div className="aa-filter">
          {TYPES.map(t => (
            <button key={t} className={`aa-fbtn ${filterType === t ? "on" : ""}`}
              onClick={() => setFilterType(t)}>{t}</button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ textAlign: "center", padding: 40 }}>กำลังโหลด...</p> : activities.length === 0 ? (
        <div className="aa-empty">📭 ไม่มีกิจกรรม</div>
      ) : (<>

        {/* Desktop table */}
        <div className="aa-table-wrap">
          <table className="aa-table">
            <thead><tr>
              {["วันที่","ประเภท","action","รายละเอียด","ผู้ใช้"].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {activities.map(act => (
                <tr key={act._id}>
                  <td style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                    {new Date(act.createdAt).toLocaleString("th-TH")}
                  </td>
                  <td><Badge type={act.type} /></td>
                  <td style={{ fontSize: 12, color: "#64748b" }}>{act.action}</td>
                  <td className="aa-desc">{act.description}</td>
                  <td className="aa-user">{act.user?.username || act.user?.email || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="aa-cards">
          {activities.map(act => (
            <div key={act._id} className="aa-card">
              <div className="aa-card-top">
                <Badge type={act.type} />
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{act.action}</span>
              </div>
              <div className="aa-card-desc">{act.description}</div>
              <div className="aa-card-user">👤 {act.user?.username || act.user?.email || "-"}</div>
              <div className="aa-card-date">{new Date(act.createdAt).toLocaleString("th-TH")}</div>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
};

export default AdminActivity;