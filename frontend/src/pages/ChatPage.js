import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import "./ChatPage.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
let socket;

export default function ChatPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  // ===== FETCH ROOM & MESSAGES =====
  const fetchRoom = useCallback(async () => {
    try {
      const [roomRes, msgRes] = await Promise.all([
        axios.get(`${API}/api/chat/${roomId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/api/chat/${roomId}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setRoom(roomRes.data);
      setMessages(msgRes.data);
    } catch (err) {
      setError(err.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [roomId, token]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  // ===== SCROLL TO BOTTOM =====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ===== SOCKET CONNECTION =====
  useEffect(() => {
    socket = io(API, { auth: { token } });

    socket.emit("user_online", currentUser._id);
    socket.emit("join_room", roomId);

    socket.on("receive_message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on("user_typing", ({ username }) => {
      setTyping(username);
    });

    socket.on("user_stop_typing", () => {
      setTyping(null);
    });

    socket.on("trade_updated", ({ status }) => {
      setRoom(prev => prev ? { ...prev, tradeStatus: status } : prev);
    });

    socket.on("error", ({ message }) => {
      alert(message);
    });

    return () => {
      socket.emit("leave_room", roomId);
      socket.disconnect();
    };
  }, [roomId, token, currentUser._id]);

  // ===== SEND MESSAGE =====
  const sendMessage = () => {
    if (!text.trim()) return;
    if (isRoomClosed()) return;

    socket.emit("send_message", {
      roomId,
      sender: currentUser._id,
      text: text.trim()
    });

    socket.emit("stop_typing", { roomId, userId: currentUser._id });
    setText("");
  };

  // ===== TYPING =====
  const handleTyping = (e) => {
    setText(e.target.value);
    socket.emit("typing", { roomId, userId: currentUser._id, username: currentUser.username });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { roomId, userId: currentUser._id });
    }, 1500);
  };

  // ===== TRADE ACTIONS =====
  const handleTradeAction = async (action) => {
    setActionLoading(true);
    try {
      await axios.put(`${API}/api/chat/${roomId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // แจ้ง socket ให้ update real-time
      socket.emit("trade_status_update", {
        roomId,
        status: action === "accept" ? "accepted" : action === "reject" ? "rejected" : "cancelled",
        updatedBy: currentUser._id
      });
      fetchRoom();
    } catch (err) {
      alert(err.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(false);
    }
  };

  // ===== HELPERS =====
  const isRoomClosed = () => {
    if (!room) return true;
    if (room.type === "trade" && ["rejected", "cancelled", "completed"].includes(room.tradeStatus)) return true;
    if (room.type === "normal" && room.inquiryStatus === "closed") return true;
    return false;
  };

  const getOtherParticipant = () => {
    if (!room) return null;
    return room.participants.find(p => String(p._id) !== String(currentUser._id));
  };

  const isProductOwner = () => {
    if (!room) return false;
    return String(room.productId?.owner) === String(currentUser._id) ||
      (room.participants.length > 0 && String(room.participants[1]?._id) === String(currentUser._id));
  };

  const getTradeStatusLabel = (status) => {
    const labels = {
      pending: { text: "รอการตอบรับ", color: "#f59e0b" },
      negotiating: { text: "กำลังเจรจา", color: "#3b82f6" },
      accepted: { text: "ยืนยันแล้ว ✅", color: "#10b981" },
      rejected: { text: "ปฏิเสธแล้ว ❌", color: "#ef4444" },
      cancelled: { text: "ยกเลิกแล้ว 🚫", color: "#6b7280" },
      completed: { text: "เสร็จสิ้น 🎉", color: "#8b5cf6" }
    };
    return labels[status] || { text: status, color: "#6b7280" };
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString("th-TH", {
      hour: "2-digit", minute: "2-digit"
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("th-TH", {
      day: "numeric", month: "short"
    });
  };

  if (loading) return (
    <div className="chat-loading">
      <div className="chat-spinner" />
      <p>กำลังโหลด...</p>
    </div>
  );

  if (error) return (
    <div className="chat-error">
      <p>⚠️ {error}</p>
      <button onClick={() => navigate(-1)}>← กลับ</button>
    </div>
  );

  const otherUser = getOtherParticipant();
  const roomClosed = isRoomClosed();

  return (
    <div className="chat-page">

      {/* ===== HEADER ===== */}
      <div className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate(-1)}>←</button>

        <div className="chat-header-info">
          <img
            src={otherUser?.profileImage || "/default-avatar.png"}
            alt={otherUser?.username}
            className="chat-avatar"
          />
          <div>
            <h3>{otherUser?.username || "Unknown"}</h3>
            <span className="chat-type-badge">
              {room?.type === "trade" ? "🔄 การเทรด" : "💬 สอบถามสินค้า"}
            </span>
          </div>
        </div>
      </div>

      {/* ===== TRADE PANEL ===== */}
      {room?.type === "trade" && (
        <div className="trade-panel">
          <div className="trade-panel-title">
            🔒 สินค้าที่ Lock ไว้ในการเทรด
          </div>

          <div className="trade-products">
            {/* สินค้าที่ต้องการ */}
            <div className="trade-product-card">
              <div className="trade-product-label">สินค้าที่ต้องการ</div>
              <img
                src={room.lockedProductSnapshot?.images?.[0] || room.productId?.images?.[0] || "/no-image.png"}
                alt={room.lockedProductSnapshot?.title}
              />
              <p className="trade-product-name">{room.lockedProductSnapshot?.title || room.productId?.title}</p>
              <p className="trade-product-price">
                ฿{(room.lockedProductSnapshot?.price || room.productId?.price || 0).toLocaleString()}
              </p>
              {room.lockedProductSnapshot?.lockedAt && (
                <p className="trade-lock-time">
                  🔒 Lock เมื่อ {formatDate(room.lockedProductSnapshot.lockedAt)}
                </p>
              )}
            </div>

            <div className="trade-arrow">↔</div>

            {/* สินค้าที่เสนอ */}
            <div className="trade-product-card">
              <div className="trade-product-label">สินค้าที่เสนอ</div>
              <img
                src={room.lockedOfferedProductSnapshot?.images?.[0] || room.offeredProductId?.images?.[0] || "/no-image.png"}
                alt={room.lockedOfferedProductSnapshot?.title}
              />
              <p className="trade-product-name">{room.lockedOfferedProductSnapshot?.title || room.offeredProductId?.title}</p>
              <p className="trade-product-price">
                ฿{(room.lockedOfferedProductSnapshot?.price || room.offeredProductId?.price || 0).toLocaleString()}
              </p>
              {room.lockedOfferedProductSnapshot?.lockedAt && (
                <p className="trade-lock-time">
                  🔒 Lock เมื่อ {formatDate(room.lockedOfferedProductSnapshot.lockedAt)}
                </p>
              )}
            </div>
          </div>

          {/* สถานะเทรด */}
          <div className="trade-status-bar">
            <span
              className="trade-status-badge"
              style={{ color: getTradeStatusLabel(room.tradeStatus).color }}
            >
              {getTradeStatusLabel(room.tradeStatus).text}
            </span>
          </div>

          {/* ปุ่มการกระทำ */}
          {["pending", "negotiating"].includes(room?.tradeStatus) && (
            <div className="trade-actions">
              {/* เจ้าของสินค้าเป้าหมาย กด Accept/Reject */}
              {isProductOwner() && (
                <>
                  <button
                    className="btn-accept"
                    onClick={() => handleTradeAction("accept")}
                    disabled={actionLoading}
                  >
                    ✅ ยืนยันรับเทรด
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleTradeAction("reject")}
                    disabled={actionLoading}
                  >
                    ❌ ปฏิเสธ
                  </button>
                </>
              )}
              {/* ทั้งสองฝ่ายกด Cancel ได้ */}
              <button
                className="btn-cancel"
                onClick={() => {
                  if (window.confirm("ยืนยันยกเลิกการเทรด?")) handleTradeAction("cancel");
                }}
                disabled={actionLoading}
              >
                🚫 ยกเลิก
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== NORMAL PRODUCT INFO ===== */}
      {room?.type === "normal" && room?.productId && (
        <div className="normal-product-bar">
          <img
            src={room.productId.images?.[0] || "/no-image.png"}
            alt={room.productId.title}
          />
          <div>
            <p className="normal-product-name">{room.productId.title}</p>
            <p className="normal-product-price">฿{room.productId.price?.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* ===== MESSAGES ===== */}
      <div className="chat-messages">
        {messages.map((msg, index) => {
          const isMe = String(msg.sender?._id || msg.sender) === String(currentUser._id);
          const isSystem = msg.messageType !== "text";
          const showDate = index === 0 ||
            new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();

          return (
            <React.Fragment key={msg._id}>
              {showDate && (
                <div className="chat-date-divider">
                  <span>{formatDate(msg.createdAt)}</span>
                </div>
              )}

              {isSystem ? (
                <div className="system-message">
                  <span>{msg.text}</span>
                </div>
              ) : (
                <div className={`message-row ${isMe ? "me" : "other"}`}>
                  {!isMe && (
                    <img
                      src={msg.sender?.profileImage || "/default-avatar.png"}
                      alt={msg.sender?.username}
                      className="msg-avatar"
                    />
                  )}
                  <div className="message-bubble">
                    {!isMe && <p className="msg-username">{msg.sender?.username}</p>}
                    <p className="msg-text">{msg.text}</p>
                    <span className="msg-time">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {typing && (
          <div className="typing-indicator">
            <span>{typing} กำลังพิมพ์</span>
            <div className="typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ===== INPUT ===== */}
      {roomClosed ? (
        <div className="chat-closed-bar">
          <p>
            {room?.type === "trade"
              ? `🔒 การเทรดนี้${getTradeStatusLabel(room?.tradeStatus).text}แล้ว`
              : "ห้องแชทนี้ปิดแล้ว"}
          </p>
        </div>
      ) : (
        <div className="chat-input-bar">
          <input
            type="text"
            value={text}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="พิมพ์ข้อความ..."
            className="chat-input"
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="chat-send-btn"
          >
            ส่ง
          </button>
        </div>
      )}
    </div>
  );
}