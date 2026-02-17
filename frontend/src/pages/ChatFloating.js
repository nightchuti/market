import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "./ChatFloating.css";

import { api } from "../api";

const API_URL = process.env.REACT_APP_API_URL;

export default function ChatFloating() {
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  // ✅ รองรับทั้ง _id และ id
  const myId = String(currentUser._id || currentUser.id || "");

  const fetchRooms = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get("/api/chat");
      const data = Array.isArray(res.data) ? res.data : [];
      setRooms(data);
      const u = data.filter((r) =>
        r.unreadBy?.some((uid) => String(uid) === myId)
      ).length;
      setUnread(u);
    } catch (err) {
      console.error("fetchRooms:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, [token]); // eslint-disable-line

  useEffect(() => {
    if (!token || !myId) return;
    socketRef.current = io(API_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
    });
    socketRef.current.emit("user_online", myId);
    socketRef.current.on("new_message_notification", () => fetchRooms());
    socketRef.current.on("receive_message", () => fetchRooms());
    return () => socketRef.current?.disconnect();
  }, [token, myId]); // eslint-disable-line

  // ── helpers ────────────────────────────────────────────────
  const getOther = (room) =>
    room.participants?.find((p) => String(p._id || p) !== myId);

  const hasUnread = (room) =>
    room.unreadBy?.some((uid) => String(uid) === myId);

  const fmtTime = (d) => {
    if (!d) return "";
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return "เมื่อกี้";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} นาที`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชม.`;
    return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  };

  const openRoom = (roomId) => {
    setOpen(false);
    if (roomId) navigate(`/chat/${roomId}`);
  };

  if (!token) return null;

  return (
    <div className="cf-wrap">

      {open && (
        <div className="cf-popup">
          <div className="cf-popup-header">
            <span>💬 การสนทนา</span>
            <button className="cf-refresh" onClick={fetchRooms}>↻</button>
          </div>

          <div className="cf-list">
            {loading && <p className="cf-empty">กำลังโหลด...</p>}
            {!loading && rooms.length === 0 && (
              <p className="cf-empty">ยังไม่มีการสนทนา</p>
            )}

            {!loading && rooms.map((room) => {
              const other = getOther(room);
              const unreadRoom = hasUnread(room);
              // ✅ ดึงข้อมูลสินค้า
              const product = room.productId;
              const productImg = product?.images?.[0];
              const isTradeRoom = room.type === "trade";

              return (
                <div
                  key={room._id}
                  className={`cf-item ${unreadRoom ? "unread" : ""}`}
                  onClick={() => openRoom(room._id)}
                >
                  {/* ── รูปสินค้า (ถ้ามี) หรือรูป avatar คู่สนทนา ── */}
                  <div className="cf-avatar-wrap">
                    <img
                      className="cf-avatar"
                      src={
                        other?.avatarUrl || // ✅ ใช้ตัวแปรใหม่จาก Backend
                        (other?.profileImage?.startsWith("http")
                          ? other.profileImage
                          : `${API_URL}${other?.profileImage}`) ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.username || "U")}`
                      }
                      alt="avatar"
                    />
                    {/* รูปสินค้าเล็กๆ มุมขวาล่างของ avatar */}
                    {productImg && (
                      <img
                        className="cf-product-thumb"
                        src={
                          productImg.startsWith("http")
                            ? productImg
                            : `${API_URL}${productImg}`
                        }
                        alt=""
                      />
                    )}
                  </div>

                  <div className="cf-item-body">
                    <div className="cf-item-top">
                      <p className="cf-item-name">{other?.username || "..."}</p>
                      <span className="cf-item-time">{fmtTime(room.lastMessageAt)}</span>
                    </div>

                    {/* ✅ แสดงชื่อสินค้า */}
                    {product?.title && (
                      <p className="cf-product-name">
                        {isTradeRoom ? "🔄" : "🛍️"} {product.title}
                      </p>
                    )}

                    <p className="cf-last-msg">
                      {room.lastMessage || "เริ่มการสนทนา..."}
                    </p>
                  </div>

                  {unreadRoom && <div className="cf-unread-dot" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        className="cf-fab"
        onClick={() => { setOpen(!open); if (!open) fetchRooms(); }}
      >
        {open ? "✕" : "💬"}
        {!open && unread > 0 && (
          <span className="cf-badge">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
    </div>
  );
}