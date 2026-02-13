import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import "./ChatPage.css";

const API_URL = "http://127.0.0.1:5000"

export default function ChatPage() {
  const params = useParams();
  const roomId = params.roomId || params.sellerId;
  const navigate = useNavigate();

  // ✅ 1. ใช้ useRef เพื่อเก็บ Socket instance ให้คงที่
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

  // ── โหลดห้อง + ประวัติข้อความ ──
const fetchRoom = useCallback(async () => {
  if (!token || !roomId) return;
  const headers = { Authorization: `Bearer ${token}` };
  setLoading(true);
  try {
    // API นี้ต้องคืนค่าประวัติแชทเฉพาะ roomId นี้เท่านั้น (ซึ่งเก็บ participants แค่ 2 คน)
    const roomRes = await axios.get(`${API_URL}/api/chat/${roomId}`, { headers });
    setRoom(roomRes.data);
    
    const msgRes = await axios.get(`${API_URL}/api/chat/${roomId}/messages`, { headers });
    setMessages(msgRes.data);
  } catch (err) {
    setError("ไม่สามารถโหลดแชทรายบุคคลได้");
  } finally {
    setLoading(false);
  }
}, [roomId, token]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  // ── Auto Scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── ✅ 2. จัดการ Socket.io (ฉบับแก้ไข Error WebSocket Closed) ──
  useEffect(() => {
    if (!token || !roomId || !currentUser._id) return;

    // สร้างการเชื่อมต่อและเก็บไว้ใน socketRef
    socketRef.current = io(API_URL, {
      auth: { token },
      transports: ["polling", "websocket"], // ✅ ให้ลอง polling ก่อนแล้วค่อยอัปเกรดเป็น websocket
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current.on("connect_error", (err) => {
      console.log("❌ สาเหตุที่เชื่อมต่อไม่ได้:", err.message);
      // ถ้าขึ้นว่า 'xhr poll error' -> เช็ค URL ของ Server (API_URL)
      // ถ้าขึ้นว่า 'CORS error' -> เช็คการตั้งค่า origin ใน server.js
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("🟢 Socket Connected:", socket.id);
      socket.emit("user_online", currentUser._id);
      socket.emit("join_room", roomId);
    });

    socket.on("receive_message", (msg) => {
      setMessages((prev) => {
        // ป้องกันข้อความเด้งซ้ำถ้าเราเป็นคนส่งเอง
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

    // Cleanup: ตัดการเชื่อมต่อเมื่อออกจากหน้า
    return () => {
      if (socket) {
        socket.emit("leave_room", roomId);
        socket.disconnect();
      }
    };
  }, [roomId, token, currentUser._id]);

  // ── ส่งข้อความ ──
  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || isClosed()) return;

    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. บันทึกข้อความลง Database ผ่าน API ก่อน
      const res = await axios.post(
        `${API_URL}/api/chat/${roomId}/messages`,
        { text: trimmed },
        { headers }
      );

      const savedMsg = res.data;

      // 2. เมื่อบันทึกสำเร็จ ค่อยส่งกระจายให้คนอื่นผ่าน Socket
      if (socketRef.current?.connected) {
        socketRef.current.emit("send_message", {
          roomId: roomId,
          ...savedMsg // ส่ง Object ข้อความที่ได้จาก DB ไปเลย (จะมีพวก _id, createdAt)
        });

        socketRef.current.emit("stop_typing", { roomId, userId: currentUser._id });
      }

      // 3. อัปเดตหน้าจอตัวเองทันที
      setMessages((prev) => [...prev, savedMsg]);
      setText("");
    } catch (err) {
      console.error("Send Error:", err);
      alert("ส่งข้อความไม่สำเร็จ");
    }
  };

  const handleInput = (e) => {
    setText(e.target.value);
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing", { roomId, userId: currentUser._id, username: currentUser.username });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socketRef.current?.emit("stop_typing", { roomId, userId: currentUser._id });
      }, 1500);
    }
  };

  // ── Helpers & Rendering (คงเดิมจากที่คุณเขียน) ──
  const isClosed = () => {
    if (!room) return false;
    if (room.type === "trade" && ["rejected", "cancelled", "completed"].includes(room.tradeStatus)) return true;
    if (room.type === "normal" && room.inquiryStatus === "closed") return true;
    return false;
  };

  const isMe = (msg) => String(msg.sender?._id || msg.sender) === String(currentUser._id);
  const otherUser = room?.participants?.find(p => String(p._id || p) !== String(currentUser._id));
  const fmt = (d) => d ? new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "";
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "";

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
        updatedBy: currentUser._id,
      });
      fetchRoom();
    } catch (err) {
      alert(err.response?.data?.error || "เกิดข้อผิดพลาด");
    }
  };

  const isOwner = () =>
    room?.participants?.length > 1 &&
    String(room.participants[1]?._id || room.participants[1]) === String(currentUser._id);

  if (!token) return <div className="cp-notice">กรุณาเข้าสู่ระบบก่อน</div>;
  if (loading) return <div className="cp-loading"><div className="cp-spin" /><p>กำลังโหลด...</p></div>;
  if (error) return (
    <div className="cp-error-page">
      <p>{error}</p>
      <button onClick={fetchRoom}>ลองใหม่</button>
    </div>
  );

  return (
    <div className="cp-wrap">
      {/* HEADER */}
      <header className="cp-header">
        <button className="cp-back" onClick={() => navigate(-1)}>←</button>
        <img className="cp-havatar" src={otherUser?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.username || "U")}`} alt="" />
        <div className="cp-htxt">
          <p className="cp-hname">{otherUser?.username || "..."}</p>
          <p className="cp-htype">{room?.type === "trade" ? "🔄 เทรดสินค้า" : "💬 สอบถามสินค้า"}</p>
        </div>
        {isClosed() && <span className="cp-closed-chip">ปิดแล้ว</span>}
      </header>

      {/* TRADE PANEL & PRODUCT BAR (เหมือนเดิม) */}
      {/* ... ส่วนที่เหลือของ JSX ในไฟล์เดิมของคุณ ... */}

      {/* MESSAGES */}
<main className="cp-msgs">
  {messages.map((msg, i) => {
    const me = isMe(msg);
    const isSys = msg.messageType && msg.messageType !== "text";
    const showDate = i === 0 || fmtDate(msg.createdAt) !== fmtDate(messages[i - 1].createdAt);

    return (
      <React.Fragment key={msg._id || i}>
        {/* ── วันที่อยู่ตรงกลาง ── */}
        {showDate && (
          <div className="cp-datesep">
            <span>{fmtDate(msg.createdAt)}</span>
          </div>
        )}

        {/* ── ข้อความระบบ ── */}
        {isSys ? (
          <div className="cp-sysmsg">
            <span>{msg.text}</span>
          </div>
        ) : (
          /* ── แถวข้อความ: แบ่งฝั่ง me (ขวา) / other (ซ้าย) ── */
          <div className={`cp-row ${me ? "me" : "other"}`}>
            
            {/* รูป Avatar แสดงเฉพาะฝั่งคนอื่น (ฝั่งซ้าย) */}
            {!me && (
              <img 
                className="cp-mavatar" 
                src={msg.sender?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.username || "U")}`} 
                alt="avatar" 
              />
            )}
            
            <div className="cp-bwrap">
              {/* ชื่อผู้ส่ง (แสดงเฉพาะฝั่งคนอื่น) */}
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
  
  {/* ตัวบ่งชี้การพิมพ์ */}
  {typing && (
    <div className="cp-typing">
      <span>{typing} กำลังพิมพ์...</span>
    </div>
  )}
  <div ref={bottomRef} />
</main>


      <footer className="cp-footer">
        {isClosed() ? (
          <div className="cp-closed-bar">🔒 ห้องแชทนี้ปิดแล้ว</div>
        ) : (
          <>
            <input className="cp-input" value={text} onChange={handleInput} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="พิมพ์ข้อความ..." />
            <button className="cp-send" onClick={sendMessage} disabled={!text.trim()}>ส่ง</button>
          </>
        )}
      </footer>
    </div>
  );
}