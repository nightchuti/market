import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProfilePage.css";

const API_URL = "http://127.0.0.1:5000";

const ORDER_TABS = [
  { key: "all",         label: "ทั้งหมด",      icon: "📋" },
  { key: "PendingPayment", label: "ที่ต้องชำระ",   icon: "💳" },
  { key: "Preparing",      label: "ที่ต้องจัดส่ง",  icon: "📦" }, 
  { key: "Shipping",       label: "ที่ต้องได้รับ",  icon: "🚚" }, 
  { key: "Completed",      label: "สำเร็จ",      icon: "✨" }, 
];

const STATUS_MAP = {
  PendingPayment: { label: "รอชำระเงิน",   color: "#fbbf24", bg: "rgba(251, 191, 36, 0.1)" },
  WaitingConfirm: { label: "รอยืนยันสลิป", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.1)" },
  Paid:           { label: "ชำระแล้ว",      color: "#34d399", bg: "rgba(52, 211, 153, 0.1)" },
  Preparing:      { label: "เตรียมสินค้า", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)" },
  ReadyToShip:    { label: "พร้อมส่ง",      color: "#818cf8", bg: "rgba(129, 140, 248, 0.1)" },
  Shipping:       { label: "กำลังจัดส่ง",  color: "#38bdf8", bg: "rgba(56, 189, 248, 0.1)" },
  Completed:      { label: "สำเร็จแล้ว",    color: "#34d399", bg: "rgba(52, 211, 153, 0.1)" },
  Cancelled:      { label: "ยกเลิก",        color: "#f87171", bg: "rgba(248, 113, 113, 0.1)" },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [tab, setTab] = useState("profile");
  const [orderTab, setOrderTab] = useState("all");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  const [profile, setProfile] = useState({
    username: currentUser.username || "",
    email: currentUser.email || "",
    phone: currentUser.phone || "",
    gender: currentUser.gender || "",
    bio: currentUser.bio || "",
    profileImage: currentUser.profileImage || "",
    lastProfileUpdate: currentUser.lastProfileUpdate || null,
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...profile });
  const [previewImg, setPreviewImg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchOrders();
  }, [token, navigate]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/order/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.orders || res.data;
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) { setOrders([]); }
    finally { setOrdersLoading(false); }
  };

  const getFilteredOrders = () => {
    if (orderTab === "all") return orders;
    if (orderTab === "Preparing") return orders.filter(o => ["WaitingConfirm", "Paid", "Preparing", "ReadyToShip"].includes(o.status));
    return orders.filter((o) => o.status === orderTab);
  };

  const handleConfirmOrder = async (orderId) => {
    if (!window.confirm("คุณได้รับสินค้าเรียบร้อยแล้วใช่หรือไม่?")) return;
    try {
      await axios.patch(`${API_URL}/api/order/${orderId}/complete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchOrders();
      setOrderTab("Completed");
    } catch (err) { alert(err.response?.data?.message || "เกิดข้อผิดพลาด"); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("username", form.username);
      formData.append("phone", form.phone);
      formData.append("gender", form.gender);
      formData.append("bio", form.bio);
      if (form.imageFile) formData.append("profileImage", form.imageFile);

      const res = await axios.put(`${API_URL}/api/auth/profile`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });

      localStorage.setItem("user", JSON.stringify(res.data.user));
      setProfile(res.data.user);
      setEditing(false);
      setPreviewImg(null);
    } catch (err) { alert(err.response?.data?.message || "เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  };

  return (
    <div className="modern-profile-container">
      {/* ── HEADER HERO ── */}
      <div className="modern-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className={`avatar-box ${editing ? "editing-mode" : ""}`} onClick={() => editing && fileInputRef.current.click()}>
            {previewImg ? <img src={previewImg} alt="avatar" /> : 
             profile.profileImage ? <img src={`${API_URL}${profile.profileImage}`} alt="avatar" /> :
             <div className="avatar-placeholder">{profile.username.charAt(0)}</div>}
            {editing && <div className="cam-icon">📸</div>}
          </div>
          <input type="file" ref={fileInputRef} hidden onChange={(e) => {
            const file = e.target.files[0];
            if(file) { setForm({...form, imageFile: file}); setPreviewImg(URL.createObjectURL(file)); }
          }} />
          <div className="hero-text">
            <h1>{profile.username}</h1>
            <p>{profile.email}</p>
          </div>
        </div>

        {/* ── QUICK STATS ── */}
        <div className="modern-stats-bar">
          {ORDER_TABS.slice(1).map(t => (
            <div key={t.key} className="stat-item" onClick={() => { setTab("orders"); setOrderTab(t.key); }}>
              <span className="stat-icon">{t.icon}</span>
              <span className="stat-label">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN TABS ── */}
      <div className="modern-tabs">
        <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>MY PROFILE</button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>MY ORDERS</button>
      </div>

      <div className="modern-content-area">
        {tab === "profile" ? (
          <div className="modern-card profile-card animate-fade-in">
            <div className="card-header">
              <h2>Account Settings</h2>
              {!editing ? (
                <button className="btn-edit" onClick={() => setEditing(true)}>Edit Profile</button>
              ) : (
                <div className="edit-actions">
                  <button className="btn-save" onClick={handleSaveProfile} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                  <button className="btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              )}
            </div>

            <div className="modern-form">
              <div className="input-group">
                <label>Username</label>
                {editing ? <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} /> : <p>{profile.username}</p>}
              </div>
              <div className="input-group">
                <label>Gender</label>
                {editing ? (
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                    <option value="">Not Specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                ) : <p>{profile.gender || "—"}</p>}
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                {editing ? <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /> : <p>{profile.phone || "—"}</p>}
              </div>
              <div className="input-group full-width">
                <label>Bio</label>
                {editing ? <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} /> : <p>{profile.bio || "No bio yet..."}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="order-section animate-fade-in">
            <div className="order-filters">
              {ORDER_TABS.map(t => (
                <button key={t.key} className={orderTab === t.key ? "active" : ""} onClick={() => setOrderTab(t.key)}>{t.label}</button>
              ))}
            </div>

            {getFilteredOrders().map(order => (
              <div key={order._id} className="modern-order-card">
                <div className="order-top">
                  <span className="order-no">ID: {order._id.slice(-8).toUpperCase()}</span>
                  <span className="order-status-tag" style={{ color: STATUS_MAP[order.status]?.color, backgroundColor: STATUS_MAP[order.status]?.bg }}>
                    {STATUS_MAP[order.status]?.label}
                  </span>
                </div>
                <div className="order-items-list">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="mini-item">
                      <img src={`${API_URL}${item.product?.image}`} alt="prod" />
                      <div className="item-meta">
                        <h4>{item.product?.name}</h4>
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <div className="item-price">฿{item.price.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div className="order-bottom">
                  <div className="total-amount">Total: <span>฿{order.totalPrice.toLocaleString()}</span></div>
                  <div className="order-buttons">
                    {order.status === "Shipping" && <button className="btn-action primary" onClick={() => handleConfirmOrder(order._id)}>Confirm Receipt</button>}
                    {order.status === "Completed" && <button className="btn-action outline" onClick={() => navigate(`/review/${order._id}`)}>Review Item</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}