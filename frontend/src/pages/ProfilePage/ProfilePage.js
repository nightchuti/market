import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProfilePage.css";

const API_URL = "http://127.0.0.1:5000";

const ORDER_TABS = [
  { key: "all",       label: "ทั้งหมด",      icon: "📋" },
  { key: "Preparing", label: "ที่ต้องจัดส่ง", icon: "📦" },
  { key: "Shipping",  label: "ที่ต้องได้รับ", icon: "🚚" },
  { key: "Completed", label: "สำเร็จแล้ว",   icon: "✅" },
];

const STATUS_MAP = {
  Paid:           { label: "ชำระเงินแล้ว", color: "#059669", bg: "#d1fae5" },
  Preparing:      { label: "กำลังเตรียมของ", color: "#7c3aed", bg: "#ede9fe" },
  ReadyToShip:    { label: "รอขนส่งรับของ", color: "#4f46e5", bg: "#e0e7ff" },
  Shipping:       { label: "กำลังจัดส่ง",  color: "#0284c7", bg: "#e0f2fe" },
  Completed:      { label: "สำเร็จ",      color: "#059669", bg: "#d1fae5" },
  Cancelled:      { label: "ยกเลิก",      color: "#dc2626", bg: "#fee2e2" },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const token = localStorage.getItem("token");

  // --- States ---
  const [tab, setTab] = useState("profile");
  const [orderTab, setOrderTab] = useState("all");
  
  // profile: ใช้สำหรับแสดงผล (Display)
  const [profile, setProfile] = useState({});
  
  // form: ใช้สำหรับแก้ไขข้อมูล (Edit) - ตั้งค่าเริ่มต้นให้เป็น string ว่างกัน error
  const [form, setForm] = useState({ 
    username: "", 
    email: "", 
    phonenumber: "", 
    gender: "", 
    bio: "", 
    birthday: "" 
  });

  const [editing, setEditing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [previewImg, setPreviewImg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);

  // --- Fetch Functions ---
  const fetchProfile = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      
      // 1. อัปเดตข้อมูลสำหรับแสดงผล
      setProfile(data);

      // 2. จัดการ Format วันที่สำหรับ Input (yyyy-mm-dd)
      let formattedBirthday = "";
      if (data.birthday) {
        const dateObj = new Date(data.birthday);
        if (!isNaN(dateObj)) {
            formattedBirthday = dateObj.toISOString().split('T')[0];
        }
      }

      // 3. อัปเดตข้อมูลลงฟอร์มเพื่อให้แก้ไขได้ทันที
      setForm({
        username: data.username || "",
        email: data.email || "",
        phonenumber: data.phonenumber || "", 
        gender: data.gender || "",
        bio: data.bio || "",
        birthday: formattedBirthday,
      });
    } catch (err) { 
      console.error("Profile Error:", err); 
    }
  }, [token]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/order/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.orders || res.data;
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) { setOrders([]); }
    finally { setOrdersLoading(false); }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
    } else {
      fetchProfile();
      fetchOrders();
    }
  }, [token, navigate, fetchProfile, fetchOrders]);

  // --- Logic Functions ---
  const safeTabChange = (targetTab, targetOrderTab = null) => {
    if (editing) {
      alert("⚠️ กรุณาบันทึกหรือยกเลิกการแก้ไขก่อนเปลี่ยนหน้า เพื่อป้องกันข้อมูลหาย");
      return;
    }
    setTab(targetTab);
    if (targetOrderTab) setOrderTab(targetOrderTab);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg("");
    const formData = new FormData();
    
    // Mapping ให้ตรงกับ Backend
    formData.append("username", form.username);
    formData.append("phone", form.phonenumber); // Backend รอรับ field ชื่อ 'phone'
    formData.append("gender", form.gender);
    formData.append("bio", form.bio);
    formData.append("birthday", form.birthday);

    if (form.imageFile instanceof File) {
      formData.append("profileImage", form.imageFile);
    }

    try {
      const res = await axios.put(`${API_URL}/api/auth/profile`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "multipart/form-data" 
        },
      });
      
      const updatedUser = res.data.user || res.data;
      
      // อัปเดตข้อมูลหน้าจอทันทีหลังจากบันทึกเสร็จ
      setProfile(updatedUser);
      
      // อัปเดตฟอร์มด้วยข้อมูลใหม่
      setForm(prev => ({
         ...prev,
         username: updatedUser.username,
         phonenumber: updatedUser.phonenumber,
         gender: updatedUser.gender,
         bio: updatedUser.bio,
         birthday: updatedUser.birthday ? new Date(updatedUser.birthday).toISOString().split('T')[0] : ""
      }));

      setEditing(false);
      setPreviewImg(null);
      setSaveMsg("บันทึกข้อมูลสำเร็จ ✓");
      
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      setSaveMsg(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReceipt = async (orderId) => {
    if (!window.confirm("คุณได้รับสินค้าเรียบร้อยแล้วใช่หรือไม่?")) return;
    try {
      await axios.patch(`${API_URL}/api/order/${orderId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchOrders();
    } catch (err) { alert("เกิดข้อผิดพลาด"); }
  };

  const getFilteredOrders = () => {
    if (orderTab === "all") return orders;
    if (orderTab === "Preparing") return orders.filter(o => ["Paid", "Preparing", "ReadyToShip"].includes(o.status));
    return orders.filter(o => o.status === orderTab);
  };

  return (
    <div className="pp-root">
      {/* ══ HERO ═══════════════════════════════════ */}
      <div className="pp-hero">
        <div className="pp-hero-body">
          <div className={`pp-avatar-wrap ${editing ? "clickable" : ""}`} onClick={() => editing && fileInputRef.current?.click()}>
            {previewImg ? <img className="pp-avatar" src={previewImg} alt="Preview Avatar" /> :
             profile.profileImage ? <img className="pp-avatar" src={`${API_URL}${profile.profileImage}`} alt="User Avatar" /> :
             <div className="pp-avatar-init">{(profile.username || "U")[0].toUpperCase()}</div>}
          </div>
          <div className="pp-hero-text">
            <h1 className="pp-hname">{profile.username || "กำลังโหลด..."}</h1>
            <p className="pp-hemail">{profile.email}</p>
          </div>
        </div>
        <div className="pp-strip">
          {ORDER_TABS.filter(t => t.key !== "all").map(t => (
            <button key={t.key} className="pp-strip-btn" onClick={() => safeTabChange("orders", t.key)} style={{ opacity: editing ? 0.5 : 1 }}>
              <span className="pp-si">{t.icon}</span>
              <span className="pp-sl">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pp-tabs">
        <button className={`pp-tab ${tab === "profile" ? "on" : ""}`} onClick={() => safeTabChange("profile")} style={{ opacity: editing && tab !== "profile" ? 0.5 : 1 }}>👤 โปรไฟล์</button>
        <button className={`pp-tab ${tab === "orders" ? "on" : ""}`} onClick={() => safeTabChange("orders")} style={{ opacity: editing && tab !== "orders" ? 0.5 : 1 }}>🛍️ คำสั่งซื้อ</button>
      </div>

      <div className="pp-body">
        {tab === "profile" ? (
          <div className="pp-fade">
            <div className="pp-card">
              <div className="pp-card-top">
                <h3 className="pp-ct">ข้อมูลส่วนตัว</h3>
                {editing ? (
                  <div className="pp-edit-actions">
                    <button className="pp-btn-save" onClick={handleSaveProfile} disabled={saving}>{saving ? "⌛" : "💾 บันทึก"}</button>
                    <button className="pp-btn-cancel" onClick={() => { setEditing(false); setPreviewImg(null); }}>ยกเลิก</button>
                  </div>
                ) : (
                  <button className="pp-btn-edit" onClick={() => setEditing(true)}>✏️ แก้ไข</button>
                )}
              </div>

              {saveMsg && <div className={`pp-msg ${saveMsg.includes("สำเร็จ") ? "ok" : "err"}`}>{saveMsg}</div>}

              <div className="pp-fields">
                <div className="pp-field full">
                  <label>อีเมล (แก้ไขไม่ได้)</label>
                  <p>{profile.email}</p>
                </div>
                
                <div className="pp-field">
                  <label>ชื่อผู้ใช้</label>
                  {editing ? (
                    <input 
                      className="pp-inp" 
                      value={form.username} 
                      onChange={e => setForm({...form, username: e.target.value})} 
                    />
                  ) : (
                    <p>{profile.username}</p>
                  )}
                </div>

                <div className="pp-field">
                  <label>เบอร์โทรศัพท์</label>
                  {editing ? (
                    <input 
                      className="pp-inp" 
                      value={form.phonenumber} 
                      onChange={e => setForm({...form, phonenumber: e.target.value})} 
                    />
                  ) : (
                    <p>{profile.phonenumber || "-"}</p>
                  )}
                </div>

                <div className="pp-field">
                  <label>เพศ</label>
                  {editing ? (
                    <select className="pp-inp" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                      <option value="">ไม่ระบุ</option>
                      <option value="ชาย">ชาย</option>
                      <option value="หญิง">หญิง</option>
                    </select>
                  ) : <p>{profile.gender || "ไม่ได้ระบุ"}</p>}
                </div>

                <div className="pp-field">
                  <label>วันเกิด</label>
                  {editing ? (
                    <input 
                      className="pp-inp" 
                      type="date" 
                      value={form.birthday} 
                      onChange={e => setForm({...form, birthday: e.target.value})} 
                    />
                  ) : (
                    <p>{profile.birthday ? new Date(profile.birthday).toLocaleDateString('th-TH') : "-"}</p>
                  )}
                </div>

                <div className="pp-field full">
                  <label>แนะนำตัว</label>
                  {editing ? (
                    <textarea 
                      className="pp-inp pp-ta" 
                      value={form.bio} 
                      onChange={e => setForm({...form, bio: e.target.value})} 
                    />
                  ) : (
                    <p>{profile.bio || "ยังไม่มีข้อมูล..."}</p>
                  )}
                </div>
              </div>
            </div>
            {/* เอาส่วน Log ออกตามที่ต้องการแล้ว */}
          </div>
        ) : (
          <div className="pp-fade">
            <div className="pp-order-tabs">
              {ORDER_TABS.map(t => (
                <button key={t.key} className={`pp-otab ${orderTab === t.key ? "on" : ""}`} onClick={() => setOrderTab(t.key)}>{t.icon} {t.label}</button>
              ))}
            </div>

            {ordersLoading ? <div className="pp-loading"><div className="pp-spin" /></div> : 
             getFilteredOrders().length === 0 ? (
               <div className="pp-empty">
                 <span style={{ fontSize: "50px" }}>📦</span>
                 <p>ยังไม่มีสินค้าในคลัง</p>
               </div>
             ) : (
               getFilteredOrders().map(order => (
                <div key={order._id} className="pp-ocard">
                  <div className="pp-ocard-top">
                    <span className="pp-oid">#{order._id.slice(-8).toUpperCase()}</span>
                    <span className="pp-ostatus" style={{ background: STATUS_MAP[order.status]?.bg, color: STATUS_MAP[order.status]?.color }}>{STATUS_MAP[order.status]?.label}</span>
                  </div>
                  <div className="pp-oitems">
                    {order.items?.map((item, i) => (
                      <div key={i} className="pp-oitem">
                        <img className="pp-oimg" src={`${API_URL}${item.product?.image}`} alt={item.product?.name || "Product"} />
                        <div className="pp-ometa"><p className="pp-oname">{item.product?.name}</p><span className="pp-oqty">x{item.quantity}</span></div>
                        <p className="pp-oprice">฿{item.price.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pp-ofoot">
                    <div className="pp-ototrow"><span>ยอดรวม</span><strong>฿{order.totalPrice?.toLocaleString()}</strong></div>
                    {order.status === "Shipping" && <button className="pp-obtn confirm" onClick={() => handleConfirmReceipt(order._id)}>✅ ยืนยันการรับสินค้า</button>}
                  </div>
                </div>
               ))
             )}
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={(e) => {
        const f = e.target.files[0];
        if (f) { setForm({...form, imageFile: f}); setPreviewImg(URL.createObjectURL(f)); }
      }} />
    </div>
  );
}