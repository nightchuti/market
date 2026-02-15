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
    const [previewUrl, setPreviewUrl] = useState(null);
    const [qrValue, setQrValue] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${API_URL}/api/orders/${orderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setOrder(res.data);

                // ❗ เปลี่ยนเป็นเบอร์ PromptPay กลางของคุณ
                const adminPromptPay = "0930682308";
                setQrValue(generatePayload(adminPromptPay, { amount: res.data.totalPrice }));
            } catch (err) {
                console.error(err);
                alert("ไม่สามารถโหลดข้อมูลได้");
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    const onFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleUpload = async () => {
        if (!file) return alert("กรุณาเลือกไฟล์สลิปก่อนยืนยัน");
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
            alert("ส่งหลักฐานสำเร็จ ระบบจะตรวจสอบยอดเงินโดยเร็วที่สุด");
            navigate("/profile");
        } catch (err) {
            alert("อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
        }
    };

    // PaymentPage.js

    // 1. ดักตอนกำลังโหลด
    if (loading) {
        return <div style={{ textAlign: "center", padding: "50px" }}>กำลังดึงข้อมูลคำสั่งซื้อ...</div>;
    }

    // 2. ดักถ้าโหลดเสร็จแล้วแต่ไม่มีข้อมูล order (ป้องกันเลข 0)
    if (!order || !order.totalPrice) {
        return (
            <div style={{ textAlign: "center", padding: "50px" }}>
                <h3>ไม่พบยอดชำระเงิน</h3>
                <p>กรุณาตรวจสอบรายการสั่งซื้ออีกครั้ง</p>
                <button onClick={() => navigate(-1)}>กลับไปหน้าก่อนหน้า</button>
            </div>
        );
    }

    return (
        <div style={styles.pageBackground}>
            <div style={styles.container}>
                {/* Header Section */}
                <div style={styles.headerCard}>
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay-logo.png"
                        alt="PromptPay"
                        style={styles.ppLogo}
                    />
                    <div style={styles.statusBadge}>รอการชำระเงิน</div>
                </div>

                {/* QR Section */}
                <div style={styles.qrCard}>
                    <p style={styles.qrInstruction}>สแกน QR Code เพื่อโอนเงินเข้าบัญชีกลาง</p>
                    <div style={styles.qrWrapper}>
                        <QRCodeCanvas value={qrValue} size={220} level="H" includeMargin={true} />
                    </div>
                    <div style={styles.amountContainer}>
                        <span style={styles.currencySymbol}>฿</span>
                        <span style={styles.amountText}>{order?.totalPrice?.toLocaleString() || "0"}</span>
                    </div>
                    <p style={styles.orderIdText}>ออเดอร์: {orderId.slice(-8).toUpperCase()}</p>
                </div>

                {/* Upload Section */}
                <div style={styles.uploadCard}>
                    <h4 style={styles.sectionTitle}>อัปโหลดสลิปการโอนเงิน</h4>
                    <p style={styles.sectionSubTitle}>กรุณาตรวจสอบชื่อบัญชีและยอดเงินให้ถูกต้องก่อนส่ง</p>

                    <div style={styles.fileInputWrapper}>
                        <label htmlFor="slip-upload" style={styles.customFileInput}>
                            {file ? "เปลี่ยนรูปภาพ" : "เลือกรูปภาพจากคลัง"}
                        </label>
                        <input
                            id="slip-upload"
                            type="file"
                            accept="image/*"
                            onChange={onFileChange}
                            style={{ display: "none" }}
                        />
                    </div>

                    {previewUrl && (
                        <div style={styles.previewContainer}>
                            <p style={styles.previewLabel}>ตัวอย่างสลิปของคุณ:</p>
                            <img src={previewUrl} alt="Preview" style={styles.previewImage} />
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        style={{ ...styles.submitBtn, opacity: file ? 1 : 0.6 }}
                        disabled={!file}
                    >
                        ยืนยันการแจ้งโอนเงิน
                    </button>

                    <button onClick={() => navigate(-1)} style={styles.backBtn}>กลับไปหน้าออเดอร์</button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    pageBackground: {
        backgroundColor: "#f5f7fa",
        minHeight: "100vh",
        padding: "40px 20px",
        fontFamily: "'Prompt', sans-serif"
    },
    container: {
        maxWidth: "450px",
        margin: "0 auto",
    },
    headerCard: {
        backgroundColor: "#00467f", // สีน้ำเงิน PromptPay
        padding: "20px",
        borderRadius: "20px 20px 0 0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: "white"
    },
    ppLogo: { width: "100px" },
    statusBadge: {
        backgroundColor: "rgba(255,255,255,0.2)",
        padding: "5px 12px",
        borderRadius: "20px",
        fontSize: "12px"
    },
    qrCard: {
        backgroundColor: "#fff",
        padding: "30px 20px",
        textAlign: "center",
        borderBottom: "1px dashed #ddd"
    },
    qrInstruction: { color: "#666", fontSize: "14px", marginBottom: "15px" },
    qrWrapper: {
        display: "inline-block",
        padding: "10px",
        border: "1px solid #eee",
        borderRadius: "15px",
        backgroundColor: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
    },
    amountContainer: { marginTop: "20px", display: "flex", justifyContent: "center", alignItems: "baseline" },
    currencySymbol: { fontSize: "20px", fontWeight: "bold", color: "#333", marginRight: "5px" },
    amountText: { fontSize: "42px", fontWeight: "bold", color: "#ee4d2d" }, // สีส้ม Shopee
    orderIdText: { fontSize: "12px", color: "#aaa", marginTop: "10px" },
    uploadCard: {
        backgroundColor: "#fff",
        padding: "25px 20px",
        borderRadius: "0 0 20px 20px",
        textAlign: "center"
    },
    sectionTitle: { margin: "0 0 5px 0", color: "#333" },
    sectionSubTitle: { fontSize: "13px", color: "#888", marginBottom: "20px" },
    customFileInput: {
        display: "inline-block",
        padding: "12px 30px",
        backgroundColor: "#f0f2f5",
        color: "#555",
        borderRadius: "10px",
        cursor: "pointer",
        fontWeight: "500",
        marginBottom: "15px",
        border: "1px dashed #ccc"
    },
    previewContainer: { marginTop: "10px", marginBottom: "20px", textAlign: "left" },
    previewLabel: { fontSize: "12px", color: "#888", marginBottom: "5px" },
    previewImage: { width: "100%", borderRadius: "10px", border: "1px solid #eee" },
    submitBtn: {
        width: "100%",
        padding: "15px",
        backgroundColor: "#ee4d2d",
        color: "#fff",
        border: "none",
        borderRadius: "12px",
        fontSize: "16px",
        fontWeight: "bold",
        cursor: "pointer",
        transition: "0.3s"
    },
    backBtn: {
        width: "100%",
        marginTop: "12px",
        padding: "10px",
        backgroundColor: "transparent",
        color: "#aaa",
        border: "none",
        cursor: "pointer",
        fontSize: "14px"
    },
    loader: { textAlign: "center", marginTop: "100px", color: "#666", fontFamily: "Prompt" }
};

export default PaymentPage;