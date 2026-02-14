import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProfilePage.css";

const API_URL = "http://127.0.0.1:5000";

const ORDER_TABS = [
  { key: "all",      label: "ทั้งหมด",      icon: "📋" },
  { key: "pending",  label: "รอจัดส่ง",     icon: "📦" },
  { key: "shipping", label: "กำลังจัดส่ง",  icon: "🚚" },
  { key: "received", label: "รอรับสินค้า",  icon: "📬" },
  { key: "success",  label: "สำเร็จ",        icon: "✅" },
];

const STATUS_MAP = {
  pending:   { label: "รอจัดส่ง",    color: "#f59e0b", bg: "#fffbeb" },
  shipping:  { label: "กำลังจัดส่ง", color: "#3b82f6", bg: "#eff6ff" },
  received:  { label: "รอรับสินค้า", color: "#8b5cf6", bg: "#f5f3ff" },
  success:   { label: "สำเร็จ",       color: "#10b981", bg: "#ecfdf5" },
  cancelled: { label: "ยกเลิก",       color: "#ef4444", bg: "#fef2f2" },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const token       = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const myId        = currentUser._id || currentUser.id;

  const [tab, setTab]         = useState("profile"); // "profile" | "orders"
  const [orderTab, setOrderTab] = useState("all");
  const [orders, setOrders]   = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [profile, setProfile] = useState({
    username:    currentUser.username || "",
    email:       currentUser.email || "",
    phone:       currentUser.phone || "",
    bio:         currentUser.bio || "",
    profileImage: currentUser.profileImage || "",
  });
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({ ...profile });
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState("");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchOrders();
  }, []); // eslint-disable-line

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/order/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("fetchOrders:", err);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const filteredOrders = orderTab === "all"
    ? orders
    : orders.filter((o) => o.status === orderTab);

  const countByStatus = (key) =>
    key === "all" ? orders.length : orders.filter((o) => o.status === key).length;

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await axios.put(
        `${API_URL}/api/auth/profile`,
        { username: form.username, phone: form.phone, bio: form.bio },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = res.data.user || res.data;
      const newUser = { ...currentUser, ...updated };
      localStorage.setItem("user", JSON.stringify(newUser));
      setProfile({ ...profile, username: form.username, phone: form.phone, bio: form.bio });
      setEditing(false);
      setSaveMsg("บันทึกสำเร็จ ✓");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      setSaveMsg(err.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString("th-TH", {
      day: "numeric", month: "short", year: "numeric",
    }) : "";

  const initials = (name) =>
    (name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (!token) return null;

  return (
    <div className="pp-wrap">

      {/* ── PROFILE HERO ── */}
      <div className="pp-hero">
        <div className="pp-hero-bg" />
        <div className="pp-hero-content">
          <div className="pp-avatar-ring">
            {profile.profileImage ? (
              <img className="pp-avatar" src={
                profile.profileImage.startsWith("http")
                  ? profile.profileImage
                  : `${API_URL}${profile.profileImage}`
              } alt="" />
            ) : (
              <div className="pp-avatar-init">{initials(profile.username)}</div>
            )}
          </div>
          <div className="pp-hero-info">
            <h2 className="pp-username">{profile.username}</h2>
            <p className="pp-email">{profile.email}</p>
            {profile.bio && <p className="pp-bio">{profile.bio}</p>}
          </div>
        </div>

        {/* ── ORDER SUMMARY STRIP ── */}
        <div className="pp-strip">
          {ORDER_TABS.filter((t) => t.key !== "all").map((t) => (
            <button
              key={t.key}
              className="pp-strip-item"
              onClick={() => { setTab("orders"); setOrderTab(t.key); }}
            >
              <span className="pp-strip-icon">{t.icon}</span>
              <span className="pp-strip-count">{countByStatus(t.key)}</span>
              <span className="pp-strip-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="pp-tabs">
        <button
          className={`pp-tab ${tab === "profile" ? "active" : ""}`}
          onClick={() => setTab("profile")}
        >👤 ข้อมูลโปรไฟล์</button>
        <button
          className={`pp-tab ${tab === "orders" ? "active" : ""}`}
          onClick={() => setTab("orders")}
        >🛍️ ประวัติคำสั่งซื้อ</button>
      </div>

      {/* ══════════════════════════════════════════
          TAB: PROFILE
      ══════════════════════════════════════════ */}
      {tab === "profile" && (
        <div className="pp-section">
          <div className="pp-card">
            <div className="pp-card-header">
              <h3>ข้อมูลส่วนตัว</h3>
              {!editing && (
                <button className="pp-edit-btn" onClick={() => { setForm({ ...profile }); setEditing(true); }}>
                  ✏️ แก้ไข
                </button>
              )}
            </div>

            {!editing ? (
              <div className="pp-info-grid">
                <div className="pp-info-row">
                  <span className="pp-info-label">ชื่อผู้ใช้</span>
                  <span className="pp-info-val">{profile.username || "—"}</span>
                </div>
                <div className="pp-info-row">
                  <span className="pp-info-label">อีเมล</span>
                  <span className="pp-info-val">{profile.email || "—"}</span>
                </div>
                <div className="pp-info-row">
                  <span className="pp-info-label">เบอร์โทร</span>
                  <span className="pp-info-val">{profile.phone || "—"}</span>
                </div>
                <div className="pp-info-row">
                  <span className="pp-info-label">คำแนะนำตัว</span>
                  <span className="pp-info-val">{profile.bio || "—"}</span>
                </div>
              </div>
            ) : (
              <div className="pp-form">
                <label className="pp-label">ชื่อผู้ใช้
                  <input className="pp-input" value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </label>
                <label className="pp-label">อีเมล
                  <input className="pp-input" value={form.email} disabled style={{ opacity: .5 }} />
                  <span className="pp-hint">ไม่สามารถเปลี่ยนอีเมลได้</span>
                </label>
                <label className="pp-label">เบอร์โทร
                  <input className="pp-input" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0812345678" />
                </label>
                <label className="pp-label">คำแนะนำตัว
                  <textarea className="pp-input pp-textarea" value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="แนะนำตัวสั้นๆ..." rows={3} />
                </label>
                {saveMsg && <p className={`pp-msg ${saveMsg.includes("สำเร็จ") ? "ok" : "err"}`}>{saveMsg}</p>}
                <div className="pp-form-btns">
                  <button className="pp-save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
                  </button>
                  <button className="pp-cancel-btn" onClick={() => setEditing(false)}>ยกเลิก</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: ORDERS
      ══════════════════════════════════════════ */}
      {tab === "orders" && (
        <div className="pp-section">

          {/* Order sub-tabs */}
          <div className="pp-order-tabs">
            {ORDER_TABS.map((t) => (
              <button
                key={t.key}
                className={`pp-order-tab ${orderTab === t.key ? "active" : ""}`}
                onClick={() => setOrderTab(t.key)}
              >
                {t.icon} {t.label}
                {countByStatus(t.key) > 0 && (
                  <span className="pp-otab-badge">{countByStatus(t.key)}</span>
                )}
              </button>
            ))}
          </div>

          {ordersLoading && (
            <div className="pp-loading"><div className="pp-spin" /><p>กำลังโหลด...</p></div>
          )}

          {!ordersLoading && filteredOrders.length === 0 && (
            <div className="pp-empty">
              <p className="pp-empty-icon">🛒</p>
              <p>ไม่มีคำสั่งซื้อในหมวดนี้</p>
            </div>
          )}

          {!ordersLoading && filteredOrders.map((order) => {
            const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
            return (
              <div key={order._id} className="pp-order-card">
                <div className="pp-order-header">
                  <span className="pp-order-id">#{String(order._id).slice(-8).toUpperCase()}</span>
                  <span className="pp-order-date">{fmt(order.createdAt)}</span>
                  <span className="pp-order-status" style={{ color: st.color, background: st.bg }}>
                    {st.label}
                  </span>
                </div>

                {/* รายการสินค้า */}
                <div className="pp-order-items">
                  {(order.items || order.products || []).map((item, i) => {
                    const p = item.product || item;
                    const img = p.images?.[0];
                    return (
                      <div key={i} className="pp-order-item">
                        <img
                          className="pp-item-img"
                          src={
                            img
                              ? (img.startsWith("http") ? img : `${API_URL}${img}`)
                              : "https://placehold.co/56x56/f3f4f6/9ca3af?text=N/A"
                          }
                          alt=""
                        />
                        <div className="pp-item-info">
                          <p className="pp-item-name">{p.title || p.name || "สินค้า"}</p>
                          <p className="pp-item-qty">x{item.quantity || 1}</p>
                        </div>
                        <p className="pp-item-price">
                          ฿{((p.price || 0) * (item.quantity || 1)).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="pp-order-footer">
                  <span className="pp-order-total-label">ยอดรวม</span>
                  <span className="pp-order-total">
                    ฿{(order.totalPrice || order.total || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}