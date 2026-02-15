import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import generatePayload from "promptpay-qr";

const API_URL = "http://127.0.0.1:5000";

const PaymentPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [file, setFile] = useState(null);
    const [qrValue, setQrValue] = useState("");

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${API_URL}/api/orders/${orderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setOrder(res.data);
                
                // ❗ เปลี่ยนเป็นเบอร์ PromptPay กลางของเจ้าของแอป (Admin)
                const adminPromptPay = "0812345678"; 
                setQrValue(generatePayload(adminPromptPay, { amount: res.data.totalPrice }));
            } catch (err) {
                alert("โหลดข้อมูลไม่สำเร็จ");
            }
        };
        fetchOrder();
    }, [orderId]);

    const handleUpload = async () => {
        if (!file) return alert("กรุณาเลือกไฟล์สลิป");
        const formData = new FormData();
        formData.append("slip", file);

        try {
            const token = localStorage.getItem("token");
            await axios.patch(`${API_URL}/api/orders/${orderId}/upload-slip`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data" 
                }
            });
            alert("ส่งสลิปเรียบร้อย! กรุณารอระบบตรวจสอบยอดเงิน");
            navigate("/profile");
        } catch (err) {
            alert("อัปโหลดไม่สำเร็จ");
        }
    };

    if (!order) return <p>กำลังโหลด...</p>;

    return (
        <div style={{ maxWidth: "400px", margin: "auto", textAlign: "center", padding: "20px", fontFamily: "Prompt" }}>
            <div style={{ background: "#fff", padding: "20px", borderRadius: "15px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay-logo.png" width="100" alt="PP" />
                <p>บัญชีกลาง (Admin)</p>
                <QRCodeCanvas value={qrValue} size={200} includeMargin={true} />
                <h2 style={{ color: "#ee4d2d" }}>฿{order.totalPrice.toLocaleString()}</h2>
                
                <div style={{ textAlign: "left", marginTop: "20px" }}>
                    <label>แนบสลิปยืนยันเงินเข้า:</label>
                    <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                </div>
                <button onClick={handleUpload} style={{ width: "100%", padding: "10px", marginTop: "20px", background: "#ee4d2d", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
                    แจ้งโอนเงิน
                </button>
            </div>
        </div>
    );
};

export default PaymentPage;