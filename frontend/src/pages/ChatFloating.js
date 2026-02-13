import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import "./ChatFloating.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function ChatFloating() {
  const navigate = useNavigate();
  const [open, setOpen]       = useState(false);
  const [rooms, setRooms]     = useState([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  const token       = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // ── ดึงรายการห้องแชทของฉัน ──────────────────────────────
  const fetchRooms = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setRooms(data);
      // นับห้องที่มีข้อความยังไม่อ่าน
      const u = data.filter((r) =>
        r.unreadBy?.some((uid) => String(uid) === String(currentUser._id))
      ).length;
      setUnread(u);
    } catch (err) {
      console.error("fetchRooms:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [token]); // eslint-disable-line

  // ── socket: รับ notification แล้วรีเฟรชรายการ ─────────────
  useEffect(() => {
    if (!token || !currentUser._id) return;

    socketRef.current = io(API_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current.emit("user_online", currentUser._id);

    socketRef.current.on("new_message_notification", () => {
      fetchRooms(); // รีเฟรชรายการ + unread count
    });

    return () => socketRef.current?.disconnect();
  }, [token, currentUser._id]); // eslint-disable-line

  // ── helpers ────────────────────────────────────────────────
  const getOther = (room) =>
    room.participants?.find((p) => String(p._id || p) !== String(currentUser._id));

  const hasUnread = (room) =>
    room.unreadBy?.some((uid) => String(uid) === String(currentUser._id));

  const fmtTime = (d) => {
    if (!d) return "";
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return "เมื่อกี้";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} นาที`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชม.`;
    return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  };

  const typeLabel = (room) =>
    room.type === "trade" ? "🔄 เทรด" : "💬 สอบถาม";

const openRoom = (room) => {
  setOpen(false);
  const other = getOther(room);
  // แนะนำให้ใช้ ID ห้องที่มีอยู่แล้ว (room._id)
  navigate(`/chat/${room._id}`); 
};

  if (!token) return null; // ไม่ login ไม่แสดง

  return (
    <div className="cf-wrap">

      {/* POPUP */}
      {open && (
        <div className="cf-popup">
          <div className="cf-popup-header">
            <span>💬 การสนทนา</span>
            <button className="cf-refresh" onClick={fetchRooms} title="รีเฟรช">↻</button>
          </div>

          <div className="cf-list">
            {loading && <p className="cf-empty">กำลังโหลด...</p>}
            {!loading && rooms.length === 0 && (
              <p className="cf-empty">ยังไม่มีการสนทนา</p>
            )}
            {!loading && rooms.map((room) => {
              const other = getOther(room);
              const unreadRoom = hasUnread(room);
              return (
                <div
                  key={room._id}
                  className={`cf-item ${unreadRoom ? "unread" : ""}`}
                  onClick={() => openRoom(room._id)}
                >
                  <img
                    className="cf-avatar"
                    src={other?.profileImage ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.username || "U")}&background=random`}
                    alt=""
                  />
                  <div className="cf-item-body">
                    <div className="cf-item-top">
                      <p className="cf-item-name">{other?.username || "..."}</p>
                      <span className="cf-item-time">{fmtTime(room.lastMessageAt)}</span>
                    </div>
                    <div className="cf-item-bottom">
                      <span className="cf-type-chip">{typeLabel(room)}</span>
                      <p className="cf-last-msg">
                        {room.lastMessage || "เริ่มการสนทนา..."}
                      </p>
                    </div>
                  </div>
                  {unreadRoom && <div className="cf-unread-dot" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FAB BUTTON */}
      <button
        className="cf-fab"
        onClick={() => { setOpen(!open); if (!open) fetchRooms(); }}
        aria-label="เปิดแชท"
      >
        {open ? "✕" : "💬"}
        {!open && unread > 0 && (
          <span className="cf-badge">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
    </div>
  );
}