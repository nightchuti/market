import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const PaymentPage = () => {
    const { orderId } = useParams();
    const [file, setFile] = useState(null);
    const navigate = useNavigate();

    const handleUpload = async () => {
        if (!file) return alert("กรุณาเลือกไฟล์สลิป");
        const formData = new FormData();
        formData.append("slip", file);

        try {
            const token = localStorage.getItem("token");
            await axios.patch(`http://127.0.0.1:5000/api/orders/${orderId}/upload-slip`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });
            alert("อัปโหลดสลิปสำเร็จ! รอการตรวจสอบ");
            navigate("/profile");
        } catch (err) {
            alert("เกิดข้อผิดพลาดในการอัปโหลด");
        }
    };

    return (
        <div className="payment-container">
            <h2>ชำระเงิน</h2>
            <div className="qr-section">
                {/* แสดง QR Code หรือเลขบัญชีที่นี่ */}
                <p>ยอดที่ต้องชำระ: ... </p>
            </div>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
            <button onClick={handleUpload}>ยืนยันการโอนเงิน</button>
        </div>
    );
};

export default PaymentPage;