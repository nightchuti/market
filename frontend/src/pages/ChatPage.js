import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./ChatPage.css";

function ChatPage() {
  const { sellerId } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [seller, setSeller] = useState(null);

  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!token) return;

    fetchMessages();
    fetchSeller();
  }, [sellerId]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/chat/${sellerId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchSeller = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/auth/user/${sellerId}`
      );
      setSeller(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      const res = await axios.post(
        "http://localhost:5000/api/chat",
        {
          receiverId: sellerId,
          message: text,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessages([...messages, res.data]);
      setText("");
    } catch (err) {
      console.log(err);
    }
  };

  if (!token) return <p>กรุณาเข้าสู่ระบบก่อน</p>;

  return (
    <div className="chat-page">
      <div className="chat-container">
        <h2>แชทกับ {seller?.username}</h2>

        <div className="chat-box">
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={
                msg.sender === currentUser._id
                  ? "chat-message me"
                  : "chat-message other"
              }
            >
              {msg.message}
            </div>
          ))}
        </div>

        <div className="chat-input">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="พิมพ์ข้อความ..."
          />
          <button onClick={sendMessage}>ส่ง</button>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
