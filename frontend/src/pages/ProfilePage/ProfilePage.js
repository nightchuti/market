import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProfilePage.css";

const API_URL = process.env.REACT_APP_API_URL;

const DEFAULT_AVATAR = "/images/default-avatar.png";

const getImageUrl = (img) => {
  if (!img) return "/images/default-product.png";

  // ถ้าเป็น full URL แล้ว
  if (img.startsWith("http")) return img;

  if (!API_URL) return img;

  return `${API_URL.replace(/\/$/, "")}/${img.replace(/^\//, "")}`;
};

const ORDER_TABS = [
  { key: "all", label: "ทั้งหมด", icon: "📋" },

  { key: "PendingPayment", label: "รอชำระเงิน", icon: "💳" },
  { key: "WaitingConfirm", label: "รอตรวจสอบสลิป", icon: "🧾" },

  // กลุ่มรวมหลายสถานะ
  { key: "ToShip", label: "ที่ต้องจัดส่ง", icon: "📦" },      // Paid + Preparing
  { key: "ToReceive", label: "ที่ต้องได้รับ", icon: "🚚" },   // Shipping

  { key: "WaitingMeetup", label: "รอนัดรับสินค้า", icon: "🤝" },
  { key: "Completed", label: "สำเร็จแล้ว", icon: "✅" },
  { key: "Cancelled", label: "ยกเลิก", icon: "❌" },
];

const STATUS_MAP = {
  PendingPayment: {
    label: "รอชำระเงิน",
    color: "#ea580c",
    bg: "#ffedd5"
  },
  WaitingConfirm: {
    label: "รอตรวจสอบสลิป",
    color: "#ca8a04",
    bg: "#fef9c3"
  },
  Paid: {
    label: "ร้านเตรียมสินค้า",
    color: "#2563eb",
    bg: "#dbeafe"
  },
  Preparing: {
    label: "กำลังเตรียมของ",
    color: "#7c3aed",
    bg: "#ede9fe"
  },
  Shipping: {
    label: "กำลังจัดส่ง",
    color: "#0284c7",
    bg: "#e0f2fe"
  },
  WaitingMeetup: {
    label: "รอนัดรับสินค้า",
    color: "#9333ea",
    bg: "#f3e8ff"
  },
  Completed: {
    label: "สำเร็จแล้ว",
    color: "#059669",
    bg: "#d1fae5"
  },
  Cancelled: {
    label: "ยกเลิก",
    color: "#dc2626",
    bg: "#fee2e2"
  }
};


export default function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const token = localStorage.getItem("token");

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [removeImage, setRemoveImage] = useState(false);

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
    birthday: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    promptPayNumber: ""
  });

  const [editing, setEditing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [previewImg, setPreviewImg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);

  const isEditingAvatar = previewImg || removeImage;

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

        bankName: data.bankAccount?.bankName || "",
        accountName: data.bankAccount?.accountName || "",
        accountNumber: data.bankAccount?.accountNumber || "",
        promptPayNumber: data.bankAccount?.promptPayNumber || ""
      });
    } catch (err) {
      console.error("Profile Error:", err);
    }
  }, [token]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/orders/my`, {
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

    formData.append("username", form.username);
    formData.append("phone", form.phonenumber);
    formData.append("gender", form.gender);
    formData.append("bio", form.bio);
    formData.append("birthday", form.birthday);
    formData.append("bankName", form.bankName);
    formData.append("accountName", form.accountName);
    formData.append("accountNumber", form.accountNumber);
    formData.append("promptPayNumber", form.promptPayNumber);

    if (form.imageFile instanceof File) {
      formData.append("profileImage", form.imageFile);
    }

    if (removeImage) {
      formData.append("removeProfileImage", "true");
    }

    try {
      const res = await axios.put(
        `${API_URL}/api/auth/profile`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          },
        }
      );

      const updatedUser = res.data.user || res.data;

      // ✅ ถ้าลบรูป ให้บังคับ null
      if (removeImage) {
        updatedUser.profileImage = null;
      }

      setProfile(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setForm(prev => ({
        ...prev,
        username: updatedUser.username,
        phonenumber: updatedUser.phonenumber,
        gender: updatedUser.gender,
        bio: updatedUser.bio,
        birthday: updatedUser.birthday
          ? new Date(updatedUser.birthday).toISOString().split('T')[0]
          : "",
        bankName: updatedUser.bankAccount?.bankName || "",
        accountName: updatedUser.bankAccount?.accountName || "",
        accountNumber: updatedUser.bankAccount?.accountNumber || "",
        promptPayNumber: updatedUser.bankAccount?.promptPayNumber || ""
      }));

      setEditing(false);
      setPreviewImg(null);
      setRemoveImage(false);
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
      await axios.post(
        `${API_URL}/api/orders/${orderId}/confirm-delivery`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("ยืนยันรับสินค้าแล้ว");
      fetchOrders();

    } catch (err) {
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleGoToPayment = (orderId) => {
    navigate(`/payment/${orderId}`);
  };

  const getFilteredOrders = () => {
    if (orderTab === "all") return orders;

    if (orderTab === "ToShip") {
      return orders.filter(o =>
        ["Paid", "Preparing"].includes(o.status)
      );
    }

    if (orderTab === "ToReceive") {
      return orders.filter(o => o.status === "Shipping");
    }

    return orders.filter(o => o.status === orderTab);
  };

  const currentAvatar = previewImg
    ? previewImg
    : removeImage
      ? DEFAULT_AVATAR
      : getImageUrl(profile.profileImage) || DEFAULT_AVATAR;


  return (
    <div className="pp-root">

      {showAvatarModal && (
        <div className="pp-avatar-modal">
          <div className="pp-avatar-modal-content">

            <button
              className="pp-avatar-close"
              onClick={() => {
                setShowAvatarModal(false);
                setPreviewImg(null);
                setRemoveImage(false);
              }}
            >
              ✕
            </button>

            <img
              className="pp-avatar-large"
              src={currentAvatar}
              alt="Large Avatar"
            />

            <div className="pp-avatar-actions">

              {!isEditingAvatar ? (
                <>
                  <button
                    className="pp-btn-edit"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📷 เปลี่ยนรูป
                  </button>

                  {profile.profileImage && (
                    <button
                      className="pp-btn-delete"
                      onClick={() => {
                        setPreviewImg(null);
                        setRemoveImage(true);
                      }}
                    >
                      🗑 ลบรูป
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    className="pp-btn-save"
                    onClick={async () => {
                      await handleSaveProfile();
                      setShowAvatarModal(false);
                      setRemoveImage(false);
                    }}
                  >
                    บันทึก
                  </button>

                  <button
                    className="pp-btn-cancel"
                    onClick={() => {
                      setPreviewImg(null);
                      setRemoveImage(false);
                    }}
                  >
                    ❌ ยกเลิก
                  </button>
                </>
              )}

            </div>

          </div>
        </div>
      )}


      {/* ══ HERO ═══════════════════════════════════ */}
      <div className="pp-hero">
        <div className="pp-hero-body">
          <div
            className="pp-avatar-wrap"
            onClick={() => setShowAvatarModal(true)}
          >
            <img
              className="pp-avatar"
              src={currentAvatar}
              alt="User Avatar"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />

          </div>

          <div className="pp-hero-text">
            <h1 className="pp-hname">{profile.username || "กำลังโหลด..."}</h1>
            <p className="pp-hemail">{profile.email}</p>
          </div>
        </div>

      </div>

      <div className="pp-tabs">
        <button className={`pp-tab ${tab === "profile" ? "on" : ""}`} onClick={() => safeTabChange("profile")} style={{ opacity: editing && tab !== "profile" ? 0.5 : 1 }}>👤 โปรไฟล์</button>
        <button className={`pp-tab ${tab === "orders" ? "on" : ""}`} onClick={() => safeTabChange("orders")} style={{ opacity: editing && tab !== "orders" ? 0.5 : 1 }}>🛍️ คำสั่งซื้อของฉัน</button>
      </div>

      <div className="pp-body">
        {tab === "profile" ? (
          <div className="pp-fade">
            <div className="pp-card">
              <div className="pp-card-top">
                <h3 className="pp-ct">ข้อมูลส่วนตัว</h3>
                {editing ? (
                  <div className="pp-edit-actions">
                    <button className="pp-btn-save" onClick={handleSaveProfile} disabled={saving}>{saving ? "⌛" : "บันทึก"}</button>
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
                      onChange={e => setForm({ ...form, username: e.target.value })}
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
                      onChange={e => setForm({ ...form, phonenumber: e.target.value })}
                    />
                  ) : (
                    <p>{profile.phonenumber || "-"}</p>
                  )}
                </div>

                <div className="pp-field">
                  <label>เพศ</label>
                  {editing ? (
                    <select className="pp-inp" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
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
                      onChange={e => setForm({ ...form, birthday: e.target.value })}
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
                      onChange={e => setForm({ ...form, bio: e.target.value })}
                    />
                  ) : (
                    <p>{profile.bio || "ยังไม่มีข้อมูล..."}</p>
                  )}
                </div>
              </div>

              <div className="pp-card" style={{ marginTop: 20 }}>
                <div className="pp-card-top">
                  <h3 className="pp-ct">ข้อมูลบัญชีรับเงิน</h3>
                </div>

                <div className="pp-fields">

                  <div className="pp-field">
                    <label>ธนาคาร</label>
                    {editing ? (
                      <input
                        className="pp-inp"
                        value={form.bankName}
                        onChange={e => setForm({ ...form, bankName: e.target.value })}
                      />
                    ) : (
                      <p>{profile.bankAccount?.bankName || "-"}</p>
                    )}
                  </div>

                  <div className="pp-field">
                    <label>ชื่อบัญชี</label>
                    {editing ? (
                      <input
                        className="pp-inp"
                        value={form.accountName}
                        onChange={e => setForm({ ...form, accountName: e.target.value })}
                      />
                    ) : (
                      <p>{profile.bankAccount?.accountName || "-"}</p>
                    )}
                  </div>

                  <div className="pp-field">
                    <label>เลขบัญชี</label>
                    {editing ? (
                      <input
                        className="pp-inp"
                        value={form.accountNumber}
                        onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                      />
                    ) : (
                      <p>{profile.bankAccount?.accountNumber || "-"}</p>
                    )}
                  </div>

                  <div className="pp-field">
                    <label>PromptPay</label>
                    {editing ? (
                      <input
                        className="pp-inp"
                        value={form.promptPayNumber}
                        onChange={e => setForm({ ...form, promptPayNumber: e.target.value })}
                      />
                    ) : (
                      <p>{profile.bankAccount?.promptPayNumber || "-"}</p>
                    )}
                  </div>

                </div>
              </div>


            </div>
            {/* เอาส่วน Log ออกตามที่ต้องการแล้ว */}
          </div>
        ) : (
          <div className="pp-fade">
            <div className="pp-order-tabs">
              {ORDER_TABS.map(t => (
                <button key={t.key} className={`pp-otab ${orderTab === t.key ? "on" : ""}`} onClick={() => setOrderTab(t.key)}>{t.label}</button>
              ))}
            </div>

            {ordersLoading ? <div className="pp-loading"><div className="pp-spin" /></div> :
              getFilteredOrders().length === 0 ? (
                <div className="pp-empty">
                  <span style={{ fontSize: "50px" }}>📦</span>
                  <p>ยังไม่มีสินค้าในคลัง</p>
                </div>
              ) : (
                getFilteredOrders().map(order => {

                  const statusInfo = STATUS_MAP[order.status] || {
                    label: order.status,
                    color: "#374151",
                    bg: "#f3f4f6"
                  };

                  return (
                    <div key={order._id} className="pp-ocard">

                      {/* 🔹 Header ร้าน + สถานะ */}
                      <div className="pp-shop-header">
                        <div className="pp-shop-left">
                          {/* ลองใช้ username หรือถ้าคุณมีระบบ Shop แยก ให้ดึงจาก product.user */}
                          {order.items?.[0]?.product?.user?.username || "ไม่ทราบชื่อร้าน"}
                        </div>

                        <div
                          className="pp-ostatus"
                          style={{
                            background: statusInfo.bg,
                            color: statusInfo.color
                          }}
                        >
                          {statusInfo.label}
                        </div>
                      </div>

                      {/* 🔹 รายการสินค้า */}
                      <div className="pp-oitems">
                        {order.items?.map((item, i) => (
                          <div key={i} className="pp-oitem">
                            <img
                              className="pp-oimg"
                              src={getImageUrl(item.product?.images?.[0])}
                              alt={item.product?.title}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/images/default-product.png";
                              }}
                            />
                            <div className="pp-ometa">
                              <div className="pp-oname">
                                {item.product?.title || "ไม่พบชื่อสินค้า"}
                              </div>
                              <p className="pp-odesc">
                                {item.product?.description || "ไม่มีรายละเอียด"}
                              </p>
                              <span className="pp-oqty">x{item.quantity}</span>
                            </div>

                            <div className="pp-oprice">
                              ฿{item.price.toLocaleString()}
                            </div>

                          </div>
                        ))}
                      </div>

                      {/* 🔹 Footer ยอดรวม */}
                      <div className="pp-ofooter">

                        <div className="pp-total">
                          รวมทั้งหมด:
                          <span>฿{order.totalPrice?.toLocaleString()}</span>
                        </div>

                        <div className="pp-action-right">

                          {order.status === "Shipping" && order.deliveryDetails && (
                            <div className="pp-delivery-info">
                              🚚 ไรเดอร์: {order.deliveryDetails.riderName}
                              <br />
                              📞 {order.deliveryDetails.riderPhone}
                            </div>
                          )}

                          {order.status === "Shipping" && (
                            <button
                              className="pp-obtn confirm"
                              onClick={() => handleConfirmReceipt(order._id)}
                            >
                              ยืนยันการรับสินค้า
                            </button>
                          )}

                        </div>

                        {/* ปุ่มไปชำระเงิน */}
                        {order.status === "PendingPayment" && (
                          <button
                            className="pp-obtn pay"
                            onClick={() => handleGoToPayment(order._id)}
                          >
                            ไปชำระเงิน
                          </button>
                        )}

                        {/* ในส่วนการแสดงผล Order Card */}
                        {order.deliveryMode === "PICKUP" && order.status === "WaitingMeetup" && (
                          <div className="meetup-otp-box">
                            <p>รหัสสำหรับยืนยันการรับสินค้า:</p>
                            <div className="otp-code">{order.meetupOTP}</div>
                            <small>*บอกรหัสนี้กับผู้ขายเมื่อตรวจสอบสินค้าเรียบร้อยแล้ว</small>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={(e) => {
        const f = e.target.files[0];
        if (f) { setForm({ ...form, imageFile: f }); setPreviewImg(URL.createObjectURL(f)); }
      }} />
    </div>
  );
}