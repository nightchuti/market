import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AddressPage.css";

const API_URL = "http://127.0.0.1:5000";

const AddressPage = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const fetchAddress = async () => {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/address`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAddresses(res.data);
      const defaultAddr = res.data.find(a => a.isDefault);
      if (defaultAddr) setSelectedId(defaultAddr._id);
    };

    fetchAddress();
  }, []);

  const handleConfirm = () => {
    const selected = addresses.find(a => a._id === selectedId);
    navigate("/checkout", { state: { selectedAddress: selected } });
  };

  return (
    <div className="address-container">
      <h2>เลือกที่อยู่จัดส่ง</h2>

      <div className="address-list">
        {addresses.map(addr => (
          <div
            key={addr._id}
            className={`address-card ${selectedId === addr._id ? "active" : ""}`}
            onClick={() => setSelectedId(addr._id)}
          >
            <div className="addr-header">
              <span className="addr-dorm">{addr.dormName}</span>
              {addr.isDefault && <span className="default-badge">ค่าเริ่มต้น</span>}
            </div>

            <div className="addr-room">ห้อง {addr.room}</div>
            <div className="addr-note">{addr.note || "ไม่มีหมายเหตุ"}</div>
          </div>
        ))}
      </div>

      <button className="add-address-btn" onClick={() => navigate("/add-address")}>
        + เพิ่มที่อยู่ใหม่
      </button>

      <button className="confirm-btn" onClick={handleConfirm}>
        ยืนยันที่อยู่
      </button>
    </div>
  );
};

export default AddressPage;
