import { useEffect, useState } from "react";
import api from "../../api";
import { useNavigate, useLocation } from "react-router-dom";
import "./AddressPage.css";

const AddressPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    dormName: "",
    note: ""
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  // ================= FETCH ADDRESS =================
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const res = await api.get("/api/address");

        setAddresses(res.data);

        const defaultAddr = res.data.find(a => a.isDefault);
        if (defaultAddr) setSelectedId(defaultAddr._id);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAddress();
  }, []);

  // ================= CONFIRM =================
  const handleConfirm = () => {
    if (!selectedId) {
      alert("กรุณาเลือกที่อยู่ก่อน");
      return;
    }

    navigate("/checkout", {
      state: {
        items: location.state?.items,
        selectedAddressId: selectedId,
        deliveryMode: location.state?.deliveryMode
      },
      replace: true
    });
  };

  // ================= VALIDATE =================
  const validateForm = () => {
    if (!formData.dormName.trim()) {
      setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
      return false;
    }

    setErrorMessage("");
    return true;
  };

  // ================= ADD / EDIT =================
  const handleAddAddress = async () => {
    if (!validateForm()) return;

    try {
      const cleanData = {
        dormName: formData.dormName.trim(),
        note: formData.note.trim()
      };

      let res;

      if (editingId) {
        res = await api.put(`/api/address/${editingId}`, cleanData);

        setAddresses(prev =>
          prev.map(a => (a._id === editingId ? res.data : a))
        );
      } else {
        res = await api.post("/api/address", cleanData);
        setAddresses(prev => [...prev, res.data]);
      }

      setSelectedId(res.data._id);
      setShowModal(false);
      setFormData({ dormName: "", note: "" });
      setEditingId(null);
      setErrorMessage("");

    } catch (err) {
      console.error(err);
      alert("บันทึกไม่สำเร็จ");
    }
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("ต้องการลบที่อยู่นี้หรือไม่?")) return;

    try {
      await api.delete(`/api/address/${id}`);

      setAddresses(prev => prev.filter(a => a._id !== id));

      if (selectedId === id) setSelectedId(null);

    } catch (err) {
      console.error(err);
      alert("ลบที่อยู่ไม่สำเร็จ");
    }
  };

  // ================= UI =================
  return (
    <div className="address-container">

      <div className="sh-header">
        <button className="back-btn" onClick={() => navigate(-1)}>❮</button>
        <h2>เลือกที่อยู่จัดส่ง</h2>
      </div>

      <div className="address-list">
        {addresses.map(addr => (
          <div
            key={addr._id}
            className={`address-card ${selectedId === addr._id ? "active" : ""}`}
            onClick={() => setSelectedId(addr._id)}
          >
            <div className="addr-main">

              <div className="addr-info">
                <div className="addr-header">
                  <span className="addr-dorm">{addr.dormName}</span>
                  {addr.isDefault && (
                    <span className="default-badge">ค่าเริ่มต้น</span>
                  )}
                </div>

                <div className="addr-note">
                  {addr.note || "ไม่มีหมายเหตุ"}
                </div>
              </div>

              <div className="addr-actions">

                <button
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(addr._id);
                    setFormData({
                      dormName: addr.dormName,
                      note: addr.note || ""
                    });
                    setShowModal(true);
                  }}
                >
                  แก้ไข
                </button>

                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(addr._id);
                  }}
                >
                  ลบ
                </button>

              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="add-address-btn" onClick={() => setShowModal(true)}>
        + เพิ่มที่อยู่ใหม่
      </button>

      <button className="confirm-btn" onClick={handleConfirm}>
        ยืนยันที่อยู่
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            <h3>{editingId ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่ใหม่"}</h3>

            <input
              type="text"
              placeholder="ชื่อหอพัก"
              value={formData.dormName}
              onChange={(e) =>
                setFormData({ ...formData, dormName: e.target.value })
              }
            />

            <textarea
              placeholder="หมายเหตุ (ถ้ามี)"
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
            />

            {errorMessage && (
              <div className="form-error">{errorMessage}</div>
            )}

            <div className="modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowModal(false)}
              >
                ยกเลิก
              </button>

              <button
                className="save-btn"
                onClick={handleAddAddress}
              >
                บันทึก
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AddressPage;
