import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import "./ChatPage.css";

const API_URL = "http://localhost:5000";
let socket;

function ChatPage() {
  const { sellerId } = useParams(); 
  const roomId = sellerId; // แนะนำ: ในอนาคตควรเปลี่ยนชื่อใน App.js เป็น /chat/:roomId

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [seller, setSeller] = useState(null);
  const [room, setRoom] = useState(null);

  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // เช็คสถานะห้อง (ปิด/เสร็จสิ้น)
  const isRoomClosed = () => {
    if (!room) return false;
    return room.status === "closed" || 
           ["completed", "cancelled", "rejected"].includes(room.tradeStatus);
  };

  useEffect(() => {
    if (!token || !roomId) return;

    // 1. เชื่อมต่อ Socket
    socket = io(API_URL, { auth: { token } });

    socket.on("connect", () => {
      console.log("✅ Connected to Socket");
      socket.emit("join_room", roomId);
    });

    socket.on("receive_message", (msg) => {
      console.log("📩 New message received:", msg);
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("error", (err) => {
      alert(err.message);
    });

    // 2. ฟังก์ชันดึงข้อมูลต่างๆ
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // ดึงรายละเอียดห้อง (เอาไว้เช็ค status)
        const roomRes = await axios.get(`${API_URL}/api/chat/${roomId}`, { headers });
        setRoom(roomRes.data);

        // ดึงประวัติข้อความ (เติม /messages)
        const msgRes = await axios.get(`${API_URL}/api/chat/${roomId}/messages`, { headers });
        setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);

        // ดึงข้อมูลคู่สนทนา (ดึงจากผู้ใช้คนอื่นในห้อง)
        if (roomRes.data.participants) {
          const otherId = roomRes.data.participants.find(p => 
            (p._id || p) !== currentUser._id
          );
          if (otherId) {
            const userRes = await axios.get(`${API_URL}/api/auth/user/${otherId._id || otherId}`);
            setSeller(userRes.data);
          }
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };

    fetchData();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [roomId, token, currentUser._id]);

  const sendMessage = () => {
    if (!text.trim() || isRoomClosed()) return;

    const messageData = {
      roomId: roomId,
      sender: currentUser._id,
      text: text.trim(),
    };

    socket.emit("send_message", messageData);
    setText("");
  };

  if (!token) return <p className="chat-notice">กรุณาเข้าสู่ระบบก่อน</p>;

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-header">
           <h2>แชทกับ {seller?.username || "กำลังโหลด..."}</h2>
           {isRoomClosed() && <span className="closed-badge">การซื้อขายสิ้นสุดแล้ว</span>}
        </div>

        <div className="chat-box">
          {messages.map((msg, index) => {
            const isMe = (msg.sender?._id || msg.sender) === currentUser?._id;
            return (
              <div key={msg._id || index} className={`chat-message ${isMe ? "me" : "other"}`}>
                <div className="bubble">{msg.text}</div>
              </div>
            );
          })}
        </div>

        <div className="chat-input">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={isRoomClosed() ? "แชทถูกปิดแล้ว" : "พิมพ์ข้อความ..."}
            disabled={isRoomClosed()}
          />
          <button onClick={sendMessage} disabled={!text.trim() || isRoomClosed()}>
            ส่ง
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;