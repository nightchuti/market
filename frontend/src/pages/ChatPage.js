import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import "./ChatPage.css";

const API_URL = "http://127.0.0.1:5000";

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

  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const myId = String(currentUser._id || currentUser.id || "");

  // ✅ ฟังก์ชันจัดการ URL รูปภาพ (เพิ่มเข้ามาใหม่)
  const getImgUrl = (path) => {
    if (!path) return "https://placehold.co/80x80/f3f4f6/9ca3af?text=N/A";
    if (path.startsWith("http")) return path;
    return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const fetchRoom = useCallback(async () => {
    if (!token || !roomId) return;
    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);
    try {
      const [roomRes, msgRes] = await Promise.all([
        axios.get(`${API_URL}/api/chat/${roomId}`, { headers }),
        axios.get(`${API_URL}/api/chat/${roomId}/messages`, { headers }),
      ]);
      setRoom(roomRes.data);
      setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);
      setError("");
    } catch (err) {
      console.error("FetchRoom Error:", err);
      setError("ไม่สามารถโหลดข้อมูลห้องแชทได้");
    } finally {
      setLoading(false);
    }
  }, [roomId, token]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!token || !roomId || !myId) return;

    socketRef.current = io(API_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on("connect_error", (err) => {
      console.log("❌ Socket error:", err.message);
    });

    socket.on("connect", () => {
      socket.emit("user_online", myId);
      socket.emit("join_room", roomId);
    });

    socket.on("receive_message", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => String(m._id) === String(msg._id))) return prev;
        return [...prev, msg];
      });
    });

    socket.on("user_typing", ({ username }) => setTyping(username));
    socket.on("user_stop_typing", () => setTyping(""));
    socket.on("chat_error", ({ message }) => alert(message));
    socket.on("trade_updated", ({ status }) =>
      setRoom((prev) => prev ? { ...prev, tradeStatus: status } : prev)
    );

    return () => {
      socket.emit("leave_room", roomId);
      socket.disconnect();
    };
  }, [roomId, token, myId]);

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed || isClosed()) return;
    if (!socketRef.current?.connected) {
      alert("ไม่ได้เชื่อมต่อ กรุณารอสักครู่");
      return;
    }
    socketRef.current.emit("send_message", {
      roomId,
      sender: myId,
      text: trimmed,
    });
    socketRef.current.emit("stop_typing", { roomId, userId: myId });
    setText("");
  };

  const handleInput = (e) => {
    setText(e.target.value);
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing", {
        roomId,
        userId: myId,
        username: currentUser.username,
      });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socketRef.current?.emit("stop_typing", { roomId, userId: myId });
      }, 1500);
    }
  };

  const isClosed = () => {
    if (!room) return false;
    if (room.type === "trade" && ["rejected", "cancelled", "completed"].includes(room.tradeStatus)) return true;
    if (room.type === "normal" && room.inquiryStatus === "closed") return true;
    return false;
  };

  const isMe = (msg) => String(msg.sender?._id || msg.sender) === myId;

  const otherUser = room?.participants?.find(
    (p) => String(p._id || p) !== myId
  );

  const fmt = (d) =>
    d ? new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "";

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "";

  const STATUS = {
    pending: { t: "⏳ รอตอบรับ", c: "#f59e0b" },
    negotiating: { t: "💬 กำลังเจรจา", c: "#3b82f6" },
    accepted: { t: "✅ ตกลงแล้ว", c: "#10b981" },
    rejected: { t: "❌ ปฏิเสธแล้ว", c: "#ef4444" },
    cancelled: { t: "🚫 ยกเลิกแล้ว", c: "#6b7280" },
    completed: { t: "🎉 เสร็จสิ้น", c: "#8b5cf6" },
  };

  const tradeAction = async (action) => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.put(`${API_URL}/api/chat/${roomId}/${action}`, {}, { headers });
      socketRef.current?.emit("trade_status_update", {
        roomId,
        status: action === "accept" ? "accepted" : action === "reject" ? "rejected" : "cancelled",
        updatedBy: myId,
      });
      fetchRoom();
    } catch (err) {
      alert(err.response?.data?.error || "เกิดข้อผิดพลาด");
    }
  };

  const isOwner = () =>
    room?.participants?.length > 1 &&
    String(room.participants[1]?._id || room.participants[1]) === myId;

  if (!token) return <div className="cp-notice">กรุณาเข้าสู่ระบบก่อน</div>;
  if (loading) return <div className="cp-loading"><div className="cp-spin" /><p>กำลังโหลด...</p></div>;
  if (error) return (
    <div className="cp-error-page">
      <p>⚠️ {error}</p>
      <button className="cp-retry-btn" onClick={fetchRoom}>ลองใหม่</button>
      <button className="cp-retry-btn back" onClick={() => navigate(-1)}>กลับ</button>
    </div>
  );

  return (
    <div className="cp-wrap">
      <header className="cp-header">
        <button className="cp-back" onClick={() => navigate(-1)}>←</button>
        <img
          className="cp-havatar"
          src={
            otherUser?.profileImage ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.username || "U")}&background=random`
          }
          alt=""
        />
        <div className="cp-htxt">
          <p className="cp-hname">{otherUser?.username || "..."}</p>
          <p className="cp-htype">
            {room?.type === "trade" ? "🔄 เทรดสินค้า" : "💬 สอบถามสินค้า"}
            {room?.productId?.title ? ` · ${room.productId.title}` : ""}
          </p>
        </div>
        {isClosed() && <span className="cp-closed-chip">ปิดแล้ว</span>}
      </header>

      {/* ── TRADE PANEL (แก้ไขรูปภาพ) ── */}
      {room?.type === "trade" && (
        <div className="cp-trade">
          <p className="cp-trade-title">🔒 สินค้าที่ล็อกในการเทรด</p>
          <div className="cp-trade-row">
            <div className="cp-tcard">
              <span className="cp-tchip">ต้องการ</span>
              <img
                src={getImgUrl(room.lockedProductSnapshot?.images?.[0] || room.productId?.images?.[0])}
                alt=""
              />
              <p>{room.lockedProductSnapshot?.title || room.productId?.title}</p>
              <b>฿{(room.lockedProductSnapshot?.price || room.productId?.price || 0).toLocaleString()}</b>
            </div>
            <div className="cp-tswap">⇄</div>
            <div className="cp-tcard">
              <span className="cp-tchip alt">เสนอ</span>
              <img
                src={getImgUrl(room.lockedOfferedProductSnapshot?.images?.[0] || room.offeredProductId?.images?.[0])}
                alt=""
              />
              <p>{room.lockedOfferedProductSnapshot?.title || room.offeredProductId?.title}</p>
              <b>฿{(room.lockedOfferedProductSnapshot?.price || room.offeredProductId?.price || 0).toLocaleString()}</b>
            </div>
          </div>
          {room.tradeStatus && (
            <p className="cp-tstatus" style={{ color: STATUS[room.tradeStatus]?.c }}>
              {STATUS[room.tradeStatus]?.t}
            </p>
          )}
          {["pending", "negotiating"].includes(room?.tradeStatus) && (
            <div className="cp-tbtns">
              {isOwner() && (
                <>
                  <button className="cp-btn accept" onClick={() => tradeAction("accept")}>✅ ยืนยันรับเทรด</button>
                  <button className="cp-btn reject" onClick={() => tradeAction("reject")}>❌ ปฏิเสธ</button>
                </>
              )}
              <button className="cp-btn cancel"
                onClick={() => window.confirm("ยืนยันยกเลิก?") && tradeAction("cancel")}>
                🚫 ยกเลิก
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCT BAR (แก้ไขรูปภาพ + เพิ่มการคลิก) ── */}
      {room?.type === "normal" && room?.productId && (
        <div
          className="cp-pbar"
          onClick={() => navigate(`/products/${room.productId._id || room.productId}`)} // เติม s ตรง /products/
          style={{ cursor: 'pointer' }}
        >
          <img
            src={getImgUrl(room.productId.images?.[0])}
            alt=""
          />
          <div>
            <p>{room.productId.title}</p>
            <span>฿{room.productId.price?.toLocaleString()}</span>
          </div>
          <div style={{ marginLeft: 'auto', color: '#9ca3af' }}>›</div>
        </div>
      )}

      <main className="cp-msgs">
        {messages.length === 0 && (
          <p className="cp-empty">ยังไม่มีข้อความ — เริ่มสนทนาได้เลย 👋</p>
        )}

        {messages.map((msg, i) => {
          const me = isMe(msg);
          const isSys = msg.messageType && msg.messageType !== "text";
          const showDate =
            i === 0 ||
            fmtDate(msg.createdAt) !== fmtDate(messages[i - 1].createdAt);

          return (
            <React.Fragment key={msg._id || i}>
              {showDate && (
                <div className="cp-datesep">
                  <span>{fmtDate(msg.createdAt)}</span>
                </div>
              )}
              {isSys ? (
                <div className="cp-sysmsg"><span>{msg.text}</span></div>
              ) : (
                <div className={`cp-row ${me ? "me" : "other"}`}>
                  {!me && (
                    <img
                      className="cp-mavatar"
                      src={
                        msg.sender?.profileImage ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.username || "U")}&background=random`
                      }
                      alt=""
                    />
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
            <span>{typing} กำลังพิมพ์...</span>
            <div className="cp-dots"><i /><i /><i /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="cp-footer">
        {isClosed() ? (
          <div className="cp-closed-bar">🔒 ห้องแชทนี้ปิดแล้ว</div>
        ) : (
          <>
            <input
              className="cp-input"
              value={text}
              onChange={handleInput}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="พิมพ์ข้อความ..."
            />
            <button className="cp-send" onClick={sendMessage} disabled={!text.trim()}>
              ➤
            </button>
          </>
        )}
      </footer>
    </div>
  );
}