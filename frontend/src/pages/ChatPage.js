import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import "./ChatPage.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
let socket;

export default function ChatPage() {
  // รองรับทั้ง :roomId และ :sellerId (param เก่า)
  const params   = useParams();
  const roomId   = params.roomId || params.sellerId;
  const navigate = useNavigate();
  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);

  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState("");
  const [room, setRoom]         = useState(null);
  const [typing, setTyping]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const token       = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // ── 1. โหลดห้อง + ประวัติข้อความจาก DB
  const fetchRoom = useCallback(async () => {
    if (!token)  { setError("กรุณาเข้าสู่ระบบก่อน"); setLoading(false); return; }
    if (!roomId) { setError("ไม่พบ roomId"); setLoading(false); return; }

    setLoading(true);
    setError("");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const roomRes = await axios.get(`${API_URL}/api/chat/${roomId}`, { headers });
      setRoom(roomRes.data);
    } catch (err) {
      console.error("fetchRoom (room):", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "โหลดห้องแชทไม่สำเร็จ";
      setError(msg);
      setLoading(false);
      return; // ออกก่อนถ้าโหลดห้องไม่ได้
    }

    try {
      const msgRes = await axios.get(`${API_URL}/api/chat/${roomId}/messages`, { headers });
      setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);
    } catch (err) {
      console.error("fetchRoom (messages):", err);
      setMessages([]); // ยังแสดงหน้าแชทได้ แค่ไม่มีข้อความเก่า
    }

    setLoading(false); // เรียกเสมอ
  }, [roomId, token]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  // ── 2. scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── 3. Socket.io
  useEffect(() => {
    if (!token || !roomId) return;

    socket = io(API_URL, { auth: { token }, transports: ["websocket"] });

    socket.on("connect", () => {
      socket.emit("user_online", currentUser._id);
      socket.emit("join_room", roomId);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect error:", err.message);
    });

    socket.on("receive_message", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => String(m._id) === String(msg._id))) return prev;
        return [...prev, msg];
      });
    });

    socket.on("user_typing",      ({ username }) => setTyping(username));
    socket.on("user_stop_typing", ()             => setTyping(""));
    socket.on("trade_updated",    ({ status })   =>
      setRoom((prev) => prev ? { ...prev, tradeStatus: status } : prev)
    );
    socket.on("chat_error", ({ message: msg }) => alert(msg));

    return () => {
      socket.emit("leave_room", roomId);
      socket.disconnect();
    };
  }, [roomId, token]); // eslint-disable-line

  // ── 4. ส่งข้อความ
  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed || isClosed()) return;
    if (!socket?.connected) { alert("ไม่ได้เชื่อมต่อ socket"); return; }
    socket.emit("send_message", { roomId, sender: currentUser._id, text: trimmed });
    socket.emit("stop_typing",  { roomId, userId: currentUser._id });
    setText("");
  };

  const handleInput = (e) => {
    setText(e.target.value);
    socket?.emit("typing", { roomId, userId: currentUser._id, username: currentUser.username });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket?.emit("stop_typing", { roomId, userId: currentUser._id });
    }, 1500);
  };

  // ── helpers
  const isClosed = () => {
    if (!room) return false;
    if (room.type === "trade" && ["rejected","cancelled","completed"].includes(room.tradeStatus)) return true;
    if (room.type === "normal" && room.inquiryStatus === "closed") return true;
    return false;
  };

  const isMe = (msg) =>
    String(msg.sender?._id || msg.sender) === String(currentUser._id);

  const otherUser = room?.participants?.find(
    (p) => String(p._id || p) !== String(currentUser._id)
  );

  const fmt = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  };

  const fmtDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  };

  const STATUS = {
    pending:     { t: "⏳ รอตอบรับ",    c: "#f59e0b" },
    negotiating: { t: "💬 กำลังเจรจา", c: "#3b82f6" },
    accepted:    { t: "✅ ตกลงแล้ว",    c: "#10b981" },
    rejected:    { t: "❌ ปฏิเสธแล้ว",  c: "#ef4444" },
    cancelled:   { t: "🚫 ยกเลิกแล้ว", c: "#6b7280" },
    completed:   { t: "🎉 เสร็จสิ้น",   c: "#8b5cf6" },
  };

  const tradeAction = async (action) => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.put(`${API_URL}/api/chat/${roomId}/${action}`, {}, { headers });
      socket?.emit("trade_status_update", {
        roomId,
        status: action === "accept" ? "accepted" : action === "reject" ? "rejected" : "cancelled",
        updatedBy: currentUser._id,
      });
      fetchRoom();
    } catch (err) {
      alert(err.response?.data?.error || "เกิดข้อผิดพลาด");
    }
  };

  const isOwner = () =>
    room?.participants?.length > 0 &&
    String(room.participants[1]?._id || room.participants[1]) === String(currentUser._id);

  // ── render
  if (!token)  return <div className="cp-notice">กรุณาเข้าสู่ระบบก่อน</div>;

  if (loading) return (
    <div className="cp-loading">
      <div className="cp-spin"/>
      <p>กำลังโหลดห้องแชท...</p>
    </div>
  );

  // ✅ แสดง error แทน spinner ค้าง
  if (error) return (
    <div className="cp-error-page">
      <p className="cp-error-icon">⚠️</p>
      <p className="cp-error-msg">{error}</p>
      <div style={{ display:"flex", gap:"10px" }}>
        <button className="cp-retry-btn" onClick={fetchRoom}>ลองใหม่</button>
        <button className="cp-retry-btn back" onClick={() => navigate(-1)}>กลับ</button>
      </div>
    </div>
  );

  return (
    <div className="cp-wrap">

      {/* HEADER */}
      <header className="cp-header">
        <button className="cp-back" onClick={() => navigate(-1)}>←</button>
        <img className="cp-havatar"
          src={otherUser?.profileImage ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.username || "U")}&background=random`}
          alt="" />
        <div className="cp-htxt">
          <p className="cp-hname">{otherUser?.username || "..."}</p>
          <p className="cp-htype">{room?.type === "trade" ? "🔄 เทรดสินค้า" : "💬 สอบถามสินค้า"}</p>
        </div>
        {isClosed() && <span className="cp-closed-chip">ปิดแล้ว</span>}
      </header>

      {/* TRADE PANEL */}
      {room?.type === "trade" && (
        <div className="cp-trade">
          <p className="cp-trade-title">🔒 สินค้าที่ล็อกในการเทรด</p>
          <div className="cp-trade-row">
            <div className="cp-tcard">
              <span className="cp-tchip">ต้องการ</span>
              <img src={room.lockedProductSnapshot?.images?.[0] || room.productId?.images?.[0] || "https://placehold.co/80x80/f3f4f6/9ca3af?text=N/A"} alt=""/>
              <p>{room.lockedProductSnapshot?.title || room.productId?.title}</p>
              <b>฿{(room.lockedProductSnapshot?.price || room.productId?.price || 0).toLocaleString()}</b>
            </div>
            <div className="cp-tswap">⇄</div>
            <div className="cp-tcard">
              <span className="cp-tchip alt">เสนอ</span>
              <img src={room.lockedOfferedProductSnapshot?.images?.[0] || room.offeredProductId?.images?.[0] || "https://placehold.co/80x80/f3f4f6/9ca3af?text=N/A"} alt=""/>
              <p>{room.lockedOfferedProductSnapshot?.title || room.offeredProductId?.title}</p>
              <b>฿{(room.lockedOfferedProductSnapshot?.price || room.offeredProductId?.price || 0).toLocaleString()}</b>
            </div>
          </div>
          {room.tradeStatus && (
            <p className="cp-tstatus" style={{ color: STATUS[room.tradeStatus]?.c }}>
              {STATUS[room.tradeStatus]?.t}
            </p>
          )}
          {["pending","negotiating"].includes(room?.tradeStatus) && (
            <div className="cp-tbtns">
              {isOwner() && (
                <>
                  <button className="cp-btn accept" onClick={() => tradeAction("accept")}>✅ ยืนยันรับเทรด</button>
                  <button className="cp-btn reject" onClick={() => tradeAction("reject")}>❌ ปฏิเสธ</button>
                </>
              )}
              <button className="cp-btn cancel"
                onClick={() => window.confirm("ยืนยันยกเลิกการเทรด?") && tradeAction("cancel")}>
                🚫 ยกเลิก
              </button>
            </div>
          )}
        </div>
      )}

      {/* PRODUCT BAR (normal) */}
      {room?.type === "normal" && room?.productId && (
        <div className="cp-pbar">
          <img src={room.productId.images?.[0] || "https://placehold.co/44x44/f3f4f6/9ca3af?text=N/A"} alt=""/>
          <div>
            <p>{room.productId.title}</p>
            <span>฿{room.productId.price?.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* MESSAGES */}
      <main className="cp-msgs">
        {messages.length === 0 && (
          <p className="cp-empty">ยังไม่มีข้อความ — เริ่มสนทนาได้เลย 👋</p>
        )}

        {messages.map((msg, i) => {
          const me    = isMe(msg);
          const isSys = msg.messageType && msg.messageType !== "text";
          const showDate = i === 0 ||
            fmtDate(msg.createdAt) !== fmtDate(messages[i - 1].createdAt);

          return (
            <React.Fragment key={msg._id || i}>
              {showDate && (
                <div className="cp-datesep"><span>{fmtDate(msg.createdAt)}</span></div>
              )}
              {isSys ? (
                <div className="cp-sysmsg"><span>{msg.text}</span></div>
              ) : (
                <div className={`cp-row ${me ? "me" : "other"}`}>
                  {!me && (
                    <img className="cp-mavatar"
                      src={msg.sender?.profileImage ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.username || "U")}&background=random`}
                      alt="" />
                  )}
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
            <span>{typing} กำลังพิมพ์</span>
            <div className="cp-dots"><i/><i/><i/></div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* INPUT / CLOSED BAR */}
      {isClosed() ? (
        <div className="cp-closed-bar">
          🔒 ห้องแชทนี้ปิดแล้ว
          {room?.type === "trade" && ` — ${STATUS[room.tradeStatus]?.t}`}
        </div>
      ) : (
        <footer className="cp-footer">
          <input
            className="cp-input"
            value={text}
            onChange={handleInput}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="พิมพ์ข้อความ..."
          />
          <button className="cp-send" onClick={sendMessage} disabled={!text.trim()}>
            ส่ง
          </button>
        </footer>
      )}
    </div>
  );
}