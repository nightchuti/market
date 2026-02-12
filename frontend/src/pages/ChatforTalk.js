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

  // 1. ดึงข้อมูลห้องและข้อความ
  const fetchData = useCallback(async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [roomRes, msgRes] = await Promise.all([
        axios.get(`${API}/api/chat/${roomId}`, config),
        axios.get(`${API}/api/chat/${roomId}/messages`, config)
      ]);
      setRoom(roomRes.data);
      setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);
    } catch (err) {
      setError(err.response?.data?.error || "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [roomId, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 2. จัดการ Socket Connection
  useEffect(() => {
    if (!token) return;

    socket = io(API, { 
      auth: { token },
      transports: ["websocket"] // ป้องกันปัญหา CORS ในบางกรณี
    });

    socket.emit("user_online", currentUser._id);
    socket.emit("join_room", roomId);

    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("user_typing", ({ username }) => {
      if (username !== currentUser.username) setTyping(username);
    });

    socket.on("user_stop_typing", () => setTyping(null));

    socket.on("trade_updated", ({ status }) => {
      setRoom((prev) => (prev ? { ...prev, tradeStatus: status } : prev));
    });

    return () => {
      socket.off("receive_message");
      socket.off("user_typing");
      socket.off("user_stop_typing");
      socket.off("trade_updated");
      socket.disconnect();
    };
  }, [roomId, token, currentUser._id, currentUser.username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. ฟังก์ชันการส่งข้อความและการเทรด
  const sendMessage = () => {
    if (!text.trim() || isRoomClosed()) return;
    socket.emit("send_message", { roomId, sender: currentUser._id, text: text.trim() });
    socket.emit("stop_typing", { roomId });
    setText("");
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    socket.emit("typing", { roomId, username: currentUser.username });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { roomId });
    }, 2000);
  };

  const handleTradeAction = async (action) => {
    setActionLoading(true);
    try {
      const statusMap = { accept: "accepted", reject: "rejected", cancel: "cancelled" };
      await axios.put(`${API}/api/chat/${roomId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      socket.emit("trade_status_update", { roomId, status: statusMap[action] });
      fetchData(); // Refresh ข้อมูลหลัง action
    } catch (err) {
      alert(err.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(false);
    }
  };

  // Helper Functions
  const isRoomClosed = () => {
    if (!room) return true;
    const closedStatuses = ["rejected", "cancelled", "completed"];
    return room.type === "trade" && closedStatuses.includes(room.tradeStatus);
  };

  const isProductOwner = () => {
    if (!room || !room.productId) return false;
    return String(room.productId.owner) === String(currentUser._id);
  };

  if (loading) return <div className="chat-loading">กำลังโหลด...</div>;
  if (error) return <div className="chat-error">⚠️ {error}</div>;

  return (
    <div className="chat-page">
      {/* Header และ Trade Panel ใช้ JSX เดิมของคุณได้เลยครับ */}
      {/* ... ส่วน UI ... */}
      
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg._id} className={`message-row ${String(msg.sender?._id || msg.sender) === currentUser._id ? "me" : "other"}`}>
            <div className="message-bubble">
              <p className="msg-text">{msg.text}</p>
            </div>
          </div>
        ))}
        {typing && <div className="typing-status">{typing} กำลังพิมพ์...</div>}
        <div ref={messagesEndRef} />
      </div>

      {!isRoomClosed() ? (
        <div className="chat-input-bar">
          <input value={text} onChange={handleTyping} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="พิมพ์ข้อความ..." />
          <button onClick={sendMessage} disabled={!text.trim()}>ส่ง</button>
        </div>
      ) : (
        <div className="chat-closed-notice">การสนทนานี้สิ้นสุดแล้ว</div>
      )}
    </div>
  );
}