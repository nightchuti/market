import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import "./ChatPage.css";

const API_URL = process.env.REACT_APP_API_URL;

const DEFAULT_AVATAR = "/images/default-avatar.png";

const getAvatar = (user) => {
  if (!user) return DEFAULT_AVATAR;
  if (user.profileImage) {
    return user.profileImage.startsWith("http")
      ? user.profileImage
      : `${API_URL}${user.profileImage}`;
  }
  return DEFAULT_AVATAR;
};

const getImgUrl = (path) => {
  if (!path) return "/images/placeholder.png";
  return path.startsWith("http") ? path : `${API_URL}${path}`;
};

// ── Trade Status Config ──────────────────────────────────
const STATUS = {
  pending: { t: "⏳ รอตอบรับ", c: "#f59e0b" },
  negotiating: { t: "💬 กำลังเจรจา", c: "#3b82f6" },
  accepted: { t: "✅ ตกลงแล้ว", c: "#10b981" },
  rejected: { t: "❌ ปฏิเสธแล้ว", c: "#ef4444" },
  cancelled: { t: "🚫 ยกเลิกแล้ว", c: "#6b7280" },
  completed: { t: "🎉 เทรดสำเร็จ!", c: "#8b5cf6" },
};

// ── Trade Product Bar ─────────────────────────────────────
// แสดงสินค้าสองฝั่งตลอดเวลา ไม่ว่า tradeStatus จะเป็นอะไร
function TradeProductBar({ room, getImgUrl, navigate }) {
  // ดึงข้อมูลสินค้าจาก snapshot (ถ้ามี) หรือ populate object
  const wantImg = room.lockedProductSnapshot?.images?.[0] || room.productId?.images?.[0];
  const wantTitle = room.lockedProductSnapshot?.title || room.productId?.title || "สินค้าที่ต้องการ";
  const wantPrice = room.lockedProductSnapshot?.price ?? room.productId?.price;

  const offerImg = room.lockedOfferedProductSnapshot?.images?.[0] || room.offeredProductId?.images?.[0];
  const offerTitle = room.lockedOfferedProductSnapshot?.title || room.offeredProductId?.title || "สินค้าที่เสนอ";
  const offerPrice = room.lockedOfferedProductSnapshot?.price ?? room.offeredProductId?.price;

  const wantId = room.productId?._id || room.productId;
  const offerId = room.offeredProductId?._id || room.offeredProductId;

  return (
    <div className="cp-trade-pbar">
      {/* สินค้าที่ต้องการ (ของ B) */}
      <div
        className="cp-trade-pbar-item"
        onClick={() => wantId && navigate(`/products/${wantId}`)}
        style={{ cursor: wantId ? "pointer" : "default" }}
      >
        <img src={getImgUrl(wantImg)} alt={wantTitle} />
        <div className="cp-trade-pbar-info">
          <span className="cp-trade-pbar-label">ต้องการ</span>
          <p className="cp-trade-pbar-title">{wantTitle}</p>
          {wantPrice != null && (
            <span className="cp-trade-pbar-price">฿{Number(wantPrice).toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* ลูกศรกลาง */}
      <div className="cp-trade-pbar-arrow">⇄</div>

      {/* สินค้าที่เสนอ (ของ A) */}
      <div
        className="cp-trade-pbar-item"
        onClick={() => offerId && navigate(`/products/${offerId}`)}
        style={{ cursor: offerId ? "pointer" : "default" }}
      >
        <img src={getImgUrl(offerImg)} alt={offerTitle} />
        <div className="cp-trade-pbar-info">
          <span className="cp-trade-pbar-label alt">เสนอ</span>
          <p className="cp-trade-pbar-title">{offerTitle}</p>
          {offerPrice != null && (
            <span className="cp-trade-pbar-price">฿{Number(offerPrice).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Trade Message Card (แสดงใน messages list) ───────────
function TradeMessageCard({ msg, myId, getImgUrl }) {
  const meta = msg.metadata || {};

  const typeLabel = {
    trade_request: { icon: "🔄", label: "ขอเทรดสินค้า", bg: "#eff6ff", border: "#bfdbfe" },
    trade_accept: { icon: "✅", label: "ยืนยันรับเทรด", bg: "#f0fdf4", border: "#bbf7d0" },
    trade_reject: { icon: "❌", label: "ปฏิเสธการเทรด", bg: "#fef2f2", border: "#fecaca" },
    trade_cancel: { icon: "🚫", label: "ยกเลิกการเทรด", bg: "#f9fafb", border: "#e5e7eb" },
    trade_confirm: { icon: "🎉", label: "ยืนยันส่งสินค้าแล้ว", bg: "#faf5ff", border: "#e9d5ff" },
  };
  const cfg = typeLabel[msg.messageType] || { icon: "📌", label: msg.messageType, bg: "#f9fafb", border: "#e5e7eb" };

  return (
    <div className="cp-trade-msgcard" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className="cp-trade-msgcard-header">
        <span>{cfg.icon} {cfg.label}</span>
        <span className="cp-trade-msgcard-time">
          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : ""}
        </span>
      </div>
      {/* แสดงสินค้าเทรดถ้ามี metadata */}
      {msg.messageType === "trade_request" && (meta.offeredProduct || meta.targetProduct) && (
        <div className="cp-trade-msgcard-items">
          <div className="cp-trade-msgcard-item">
            <img src={getImgUrl(meta.offeredProduct?.images?.[0])} alt="" />
            <span>{meta.offeredProduct?.title}</span>
          </div>
          <span className="cp-trade-msgcard-swap">⇄</span>
          <div className="cp-trade-msgcard-item">
            <img src={getImgUrl(meta.targetProduct?.images?.[0])} alt="" />
            <span>{meta.targetProduct?.title}</span>
          </div>
        </div>
      )}
      {/* ข้อความ fallback */}
      {msg.text && msg.messageType !== "trade_request" && (
        <p className="cp-trade-msgcard-text">{msg.text}</p>
      )}
      {msg.text && msg.messageType === "trade_request" && !meta.offeredProduct && (
        <p className="cp-trade-msgcard-text">{msg.text}</p>
      )}
    </div>
  );
}

// ── Confirm Swap Modal ────────────────────────────────────
function ConfirmSwapModal({ room, onConfirm, onClose, getImgUrl, navigate }) {
  const [step, setStep] = useState("choose"); // choose | meetup | payment
  const [confirming, setConfirming] = useState(false);

  if (step === "choose") {
    return (
      <div className="cp-modal-overlay">
        <div className="cp-modal">
          <h3>🎉 ยืนยันการเทรด</h3>
          <p>เลือกวิธีการรับสินค้า</p>
          <div className="cp-modal-btns">
            <button className="cp-btn accept" onClick={() => setStep("meetup")}>
              📍 นัดรับสินค้า
            </button>
            <button
              className="cp-btn accept"
              onClick={() => {

                const product = room?.productId;
                const productId =
                  typeof product === "object" ? product._id : product;

                if (!productId) {
                  return alert("ไม่พบข้อมูลสินค้า");
                }

                navigate("/checkout", {
                  state: {
                    items: [
                      {
                        _id: productId,
                        product: productId,
                        title: product?.title || "สินค้า",
                        price: product?.price || 0,
                        images: product?.images || [],
                        qty: 1,
                        deliveryType: product?.deliveryType || "both"
                      }
                    ]
                  }
                });

              }}
            >
              💳 ชำระผ่านระบบ
            </button>
          </div>
          <button className="cp-btn cancel" onClick={onClose}>ยกเลิก</button>
        </div>
      </div>
    );
  }

  if (step === "meetup") {
    return (
      <div className="cp-modal-overlay">
        <div className="cp-modal">
          <h3>📍 นัดรับสินค้า</h3>
          <p>กดยืนยันเมื่อ<strong>ได้รับสินค้าทั้งสองฝ่ายแล้ว</strong></p>
          <p className="cp-modal-note">ทั้งสองฝ่ายต้องกดยืนยัน จึงจะถือว่าเทรดสำเร็จ</p>
          <div className="cp-modal-btns">
            <button className="cp-btn cancel" onClick={() => setStep("choose")}>กลับ</button>
            <button
              className="cp-btn accept"
              disabled={confirming}
              onClick={async () => {
                setConfirming(true);
                await onConfirm("meetup");
                setConfirming(false);
              }}
            >
              {confirming ? "กำลังยืนยัน..." : "✅ ได้รับสินค้าแล้ว"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-modal-overlay">
      <div className="cp-modal">
        <h3>💳 ชำระผ่านระบบ</h3>
        <p>ระบบการชำระเงินจะเปิดให้เร็วๆ นี้</p>
        <button className="cp-btn cancel" onClick={onClose}>ปิด</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ChatPage Main
// ═══════════════════════════════════════════════════════════
export default function ChatPage() {
  const params = useParams();
  const roomId = params.roomId || params.sellerId;
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [room, setRoom] = useState(null);
  const [typing, setTyping] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSwapModal, setShowSwapModal] = useState(false);

  const token = localStorage.getItem("token");

  const [currentUser, setCurrentUser] = useState(
    () => JSON.parse(localStorage.getItem("user") || "{}")
  );
  const myId = String(currentUser._id || currentUser.id || "");

  // ── โหลดห้อง + ข้อความ ────────────────────────────────
  const fetchRoom = useCallback(async () => {
    if (!token || !roomId) return;
    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);
    try {
      const fresh = JSON.parse(localStorage.getItem("user") || "{}");
      setCurrentUser(fresh);

      const [roomRes, msgRes] = await Promise.all([
        axios.get(`${API_URL}/api/chat/${roomId}`, { headers }),
        axios.get(`${API_URL}/api/chat/${roomId}/messages`, { headers }),
      ]);
      setRoom(roomRes.data);
      setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);
      setError("");
    } catch (err) {
      console.error("fetchRoom:", err);
      setError("ไม่สามารถโหลดข้อมูลห้องแชทได้");
    } finally {
      setLoading(false);
    }
  }, [roomId, token]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  // auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Socket ─────────────────────────────────────────────
  useEffect(() => {
    if (!token || !roomId || !myId) return;

    const socket = io(API_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect_error", err => console.error("❌ Socket:", err.message));

    socket.on("connect", () => {
      socket.emit("user_online", myId);
      socket.emit("join_room", roomId);
      socket.emit("mark_read", { roomId, userId: myId });
    });

    // ── ข้อความปกติ ─────────────────────────────────────
    socket.on("receive_message", (msg) => {
      setMessages(prev => {
        if (prev.find(m => String(m._id) === String(msg._id))) return prev;
        return [...prev, msg];
      });
      socket.emit("mark_read", { roomId, userId: myId });
    });

    // ── ✅ Trade Messages (trade_request, trade_accept, etc.) ──
    socket.on("receive_trade_message", (msg) => {
      setMessages(prev => {
        if (prev.find(m => String(m._id) === String(msg._id))) return prev;
        return [...prev, msg];
      });
      // อัปเดต tradeStatus ใน room state จาก messageType
      const statusMap = {
        trade_accept: "accepted",
        trade_reject: "rejected",
        trade_cancel: "cancelled",
        trade_confirm: "completed",
      };
      if (statusMap[msg.messageType]) {
        setRoom(prev => prev ? { ...prev, tradeStatus: statusMap[msg.messageType] } : prev);
      }
    });

    // ── Trade status update จากฝ่ายตรงข้าม (ผ่าน REST + socket) ──
    socket.on("trade_updated", ({ status }) => {
      setRoom(prev => prev ? { ...prev, tradeStatus: status } : prev);
      // ดึงข้อมูล system message ใหม่
      fetchRoom();
    });

    socket.on("user_typing", ({ username }) => setTyping(username));
    socket.on("user_stop_typing", () => setTyping(""));
    socket.on("chat_error", ({ message }) => alert(message));

    return () => {
      socket.emit("leave_room", roomId);
      socket.disconnect();
    };
  }, [roomId, token, myId, fetchRoom]);

  // ── ส่งข้อความ ─────────────────────────────────────────
  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed || isClosed()) return;
    if (!socketRef.current?.connected) return alert("ไม่ได้เชื่อมต่อ กรุณารอสักครู่");
    socketRef.current.emit("send_message", { roomId, sender: myId, text: trimmed });
    socketRef.current.emit("stop_typing", { roomId, userId: myId });
    setText("");
  };

  const handleInput = (e) => {
    setText(e.target.value);
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing", { roomId, userId: myId, username: currentUser.username });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() =>
        socketRef.current?.emit("stop_typing", { roomId, userId: myId }), 1500);
    }
  };

  // ── Helpers ────────────────────────────────────────────
  const isClosed = () => {
    if (!room) return false;
    if (room.type === "trade" && ["rejected", "cancelled", "completed"].includes(room.tradeStatus)) return true;
    if (room.type === "normal" && room.inquiryStatus === "closed") return true;
    return false;
  };

  // ✅ isOwner = เจ้าของ productId (ของที่คนอื่นอยากได้)
  const isOwner = () => {
    if (!room?.productId) return false;
    const ownerId = String(room.productId?.user?._id || room.productId?.user || "");
    return ownerId === myId;
  };

  // ── Trade Actions (REST + socket notify) ───────────────
  const tradeAction = async (action) => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.put(`${API_URL}/api/chat/${roomId}/${action}`, {}, { headers });

      const newStatus = action === "accept" ? "accepted"
        : action === "reject" ? "rejected"
          : "cancelled";

      // แจ้งอีกฝ่ายผ่าน socket
      socketRef.current?.emit("trade_status_update", { roomId, status: newStatus, updatedBy: myId });

      // ส่ง trade message ผ่าน socket ด้วย (แสดงใน chat)
      socketRef.current?.emit("send_trade_message", {
        roomId,
        sender: myId,
        messageType: `trade_${action}`,  // trade_accept | trade_reject | trade_cancel
        metadata: {},
      });

      fetchRoom();
    } catch (err) {
      alert(err.response?.data?.error || "เกิดข้อผิดพลาด");
    }
  };

  // ── Confirm Swap ────────────────────────────────────────
  const handleConfirmSwap = async (method) => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      // เรียก confirmSwap API (ถ้ามี) หรือ cancelTrade → ใช้ tradeController.confirmSwap
      await axios.put(`${API_URL}/api/trades/${room.tradeId || roomId}/confirm`, {}, { headers });

      socketRef.current?.emit("send_trade_message", {
        roomId,
        sender: myId,
        messageType: "trade_confirm",
        metadata: { method },
      });
      socketRef.current?.emit("trade_status_update", { roomId, status: "completed", updatedBy: myId });

      setShowSwapModal(false);
      fetchRoom();
    } catch (err) {
      // fallback — อัปเดต status ผ่าน chat cancel route
      alert(err.response?.data?.error || "เกิดข้อผิดพลาด");
      setShowSwapModal(false);
    }
  };

  // ── Render Helpers ─────────────────────────────────────
  const otherUser = room?.participants?.find(p => String(p._id || p) !== myId);
  const fmt = d => d ? new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "";
  const fmtDate = d => d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "";

  // ── Early Returns ──────────────────────────────────────
  if (!token) return <div className="cp-notice">กรุณาเข้าสู่ระบบก่อน</div>;
  if (loading) return <div className="cp-loading"><div className="cp-spin" /><p>กำลังโหลด...</p></div>;
  if (error) return (
    <div className="cp-error-page">
      <p>⚠️ {error}</p>
      <button className="cp-retry-btn" onClick={fetchRoom}>ลองใหม่</button>
      <button className="cp-retry-btn back" onClick={() => navigate(-1)}>กลับ</button>
    </div>
  );

  // ═════════════════════════════════════════════════════
  return (
    <div className="cp-wrap">

      {/* ── Header ── */}
      <header className="cp-header">
        <button className="cp-back" onClick={() => navigate(-1)}>←</button>
        <img
          className="cp-havatar"
          src={getAvatar(otherUser)}
          alt=""
          onClick={() => navigate(`/profile/${otherUser?._id}`)}
          style={{ cursor: "pointer" }}
        />
        <div className="cp-htxt" onClick={() => navigate(`/profile/${otherUser?._id}`)} style={{ cursor: "pointer" }}>
          <p className="cp-hname">{otherUser?.username || "..."}</p>
          <p className="cp-htype">
            {room?.type === "trade" ? "🔄 เทรดสินค้า" : "💬 สอบถามสินค้า"}
            {room?.productId?.title ? ` · ${room.productId.title}` : ""}
          </p>
        </div>
        {isClosed() && <span className="cp-closed-chip">ปิดแล้ว</span>}
      </header>

      {/* ── Trade Product Bar — แสดงตลอดเวลาใน trade chat ── */}
      {room?.type === "trade" && (
        <>
          <TradeProductBar room={room} getImgUrl={getImgUrl} navigate={navigate} />
          {/* สถานะสุดท้ายเมื่อห้องปิดแล้ว */}
          {isClosed() && room.tradeStatus && (
            <div className="cp-trade-closed-status" style={{ borderColor: STATUS[room.tradeStatus]?.c }}>
              <span style={{ color: STATUS[room.tradeStatus]?.c }}>
                {STATUS[room.tradeStatus]?.t}
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Trade Panel (action buttons — ซ่อนเมื่อปิดแล้ว) ── */}
      {room?.type === "trade" && !isClosed() && (
        <div className="cp-trade">
          {/* Status */}
          {room.tradeStatus && (
            <p className="cp-tstatus" style={{ color: STATUS[room.tradeStatus]?.c }}>
              {STATUS[room.tradeStatus]?.t}
            </p>
          )}

          {/* ── Action Buttons ── */}
          {["pending", "negotiating"].includes(room?.tradeStatus) && (
            <div className="cp-tbtns">
              {isOwner() ? (
                <>
                  <button className="cp-btn accept" onClick={() => tradeAction("accept")}>
                    ✅ ยืนยันรับเทรด
                  </button>
                  <button className="cp-btn reject" onClick={() => tradeAction("reject")}>
                    ❌ ปฏิเสธ
                  </button>
                </>
              ) : (
                /* ผู้ขอเทรด รอ B ตอบรับ */
                <div className="cp-pending-bar">
                  ⏳ รอเจ้าของสินค้าตอบรับคำขอเทรด...
                </div>
              )}
              <button className="cp-btn cancel"
                onClick={() => window.confirm("ยืนยันยกเลิก?") && tradeAction("cancel")}>
                🚫 ยกเลิก
              </button>
            </div>
          )}

          {/* ── ยืนยันส่งสินค้า (accepted เท่านั้น) ── */}
          {room?.tradeStatus === "accepted" && (
            <div className="cp-tbtns">
              <button className="cp-btn accept" onClick={() => setShowSwapModal(true)}>
                🎉 ยืนยันส่ง / รับสินค้าแล้ว
              </button>
              <button className="cp-btn cancel"
                onClick={() => window.confirm("ยืนยันยกเลิก?") && tradeAction("cancel")}>
                🚫 ยกเลิก
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Product Bar (normal chat) ── */}
      {room?.type === "normal" && room?.productId && (
        <div className="cp-pbar"
          onClick={() => navigate(`/products/${room.productId._id || room.productId}`)}
          style={{ cursor: "pointer" }}>
          <img src={getImgUrl(room.productId.images?.[0])} alt="" />
          <div>
            <p>{room.productId.title}</p>
            <span>฿{room.productId.price?.toLocaleString()}</span>
          </div>
          <div style={{ marginLeft: "auto", color: "#9ca3af" }}>›</div>
        </div>
      )}

      {/* ── Messages ── */}
      <main className="cp-msgs">
        {messages.length === 0 && (
          <p className="cp-empty">ยังไม่มีข้อความ — เริ่มสนทนาได้เลย 👋</p>
        )}

        {messages.map((msg, i) => {
          const me = String(msg.sender?._id || msg.sender) === myId;
          const isSys = msg.messageType && msg.messageType !== "text";
          const showDate = i === 0 || fmtDate(msg.createdAt) !== fmtDate(messages[i - 1].createdAt);
          const isTradeCard = isSys && msg.messageType?.startsWith("trade_");

          return (
            <React.Fragment key={msg._id || i}>
              {showDate && (
                <div className="cp-datesep"><span>{fmtDate(msg.createdAt)}</span></div>
              )}

              {/* ── Trade Message Card ── */}
              {isTradeCard ? (
                <TradeMessageCard msg={msg} myId={myId} getImgUrl={getImgUrl} />
              ) : isSys ? (
                /* System message เช่น "เริ่มแชท" */
                <div className="cp-sysmsg"><span>{msg.text}</span></div>
              ) : (
                /* ข้อความปกติ */
                <div className={`cp-row ${me ? "me" : "other"}`}>
                  {!me && <img className="cp-mavatar" src={getAvatar(msg.sender)} alt="" />}
                  <div className="cp-bwrap">
                    {!me && <p className="cp-mname">{msg.sender?.username}</p>}
                    <div className="cp-bubble">
                      <p>{msg.text}</p>
                      <span className="cp-mtime">{fmt(msg.createdAt)}</span>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {typing && (
          <div className="cp-typing">
            <span>{typing} กำลังพิมพ์...</span>
            <div className="cp-dots"><i /><i /><i /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* ── Footer ── */}
      <footer className="cp-footer">
        {isClosed() ? (
          <div className="cp-closed-bar">🔒 ห้องแชทนี้ปิดแล้ว</div>
        ) : room?.type === "trade" && room?.tradeStatus === "pending" && !isOwner() ? (
          /* ผู้ขอเทรด: รอ B ตอบรับก่อน แต่ยังพิมพ์ได้ */
          <>
            <input className="cp-input" value={text} onChange={handleInput}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="พิมพ์ข้อความ..." />
            <button className="cp-send" onClick={sendMessage} disabled={!text.trim()}>➤</button>
          </>
        ) : (
          <>
            <input className="cp-input" value={text} onChange={handleInput}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="พิมพ์ข้อความ..." />
            <button className="cp-send" onClick={sendMessage} disabled={!text.trim()}>➤</button>
          </>
        )}
      </footer>

      {/* ── Confirm Swap Modal ── */}
      {showSwapModal && (
        <ConfirmSwapModal
          room={room}
          onConfirm={handleConfirmSwap}
          onClose={() => setShowSwapModal(false)}
          getImgUrl={getImgUrl}
          navigate={navigate}   // 👈 เพิ่มบรรทัดนี้
        />
      )}
    </div>
  );
}