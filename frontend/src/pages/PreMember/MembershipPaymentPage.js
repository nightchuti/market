import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import generatePayload from "promptpay-qr";

const API_URL = process.env.REACT_APP_API_URL;

const MembershipPaymentPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const planType = location.state?.type || "PRO";
    const membershipPrice = planType === "SINGLE" ? 20 : 99;

    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [qrValue, setQrValue] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const adminPromptPay = "0930682308";
            const payload = generatePayload(adminPromptPay, {
                amount: membershipPrice
            });
            setQrValue(payload);
        } catch (err) {
            console.error(err);
            alert("เกิดข้อผิดพลาดในการสร้าง QR");
        } finally {
            setLoading(false);
        }
    }, [membershipPrice]);

    const onFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (!selectedFile.type.startsWith("image/")) {
            alert("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น");
            return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (selectedFile.size > maxSize) {
            alert("ขนาดไฟล์ต้องไม่เกิน 5MB");
            return;
        }

        setFile(selectedFile);
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);
    };

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const handleUpload = async () => {
        if (!file) return alert("กรุณาเลือกไฟล์สลิปก่อน");

        const formData = new FormData();
        formData.append("slip", file);
        formData.append("planType", planType);

        try {
            const token = localStorage.getItem("token");

            await axios.post(`${API_URL}/api/memberships`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });

            alert("ส่งคำขอสำเร็จ รอแอดมินตรวจสอบ");
            navigate("/profile");

        } catch (err) {
            alert("อัปโหลดไม่สำเร็จ");
        }
    };

    if (loading) {
        return <div style={styles.loader}>กำลังเตรียมข้อมูล...</div>;
    }

    return (
        <div style={styles.pageBackground}>
            <div style={styles.container}>

                {/* Header */}
                <div style={styles.headerCard}>
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay-logo.png"
                        alt="PromptPay"
                        style={styles.ppLogo}
                    />
                    <div style={styles.statusBadge}>
                        {planType === "PRO" ? "สมัคร PRO" : "ซื้อ Boost"}
                    </div>
                </div>

                {/* QR Section */}
                <div style={styles.qrCard}>
                    <p style={styles.qrInstruction}>
                        สแกน QR เพื่อชำระเงิน
                    </p>

                    <div style={styles.qrWrapper}>
                        <QRCodeCanvas
                            value={qrValue}
                            size={220}
                            level="H"
                            includeMargin={true}
                        />
                    </div>

                    <div style={styles.amountContainer}>
                        <span style={styles.currencySymbol}>฿</span>
                        <span style={styles.amountText}>
                            {membershipPrice.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Upload Section */}
                <div style={styles.uploadCard}>
                    <h4 style={styles.sectionTitle}>อัปโหลดสลิป</h4>
                    <p style={styles.sectionSubTitle}>
                        กรุณาโอนให้ครบจำนวนก่อนแนบหลักฐาน
                    </p>

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
                            <p style={styles.previewLabel}>ตัวอย่างสลิป:</p>
                            <img
                                src={previewUrl}
                                alt="Preview"
                                style={styles.previewImage}
                            />
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        style={{ ...styles.submitBtn, opacity: file ? 1 : 0.6 }}
                        disabled={!file}
                    >
                        ยืนยันการแจ้งโอน
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        style={styles.backBtn}
                    >
                        กลับ
                    </button>
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
        backgroundColor: "#00467f",
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
        fontSize: "18px"
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
        backgroundColor: "#fff"
    },
    amountContainer: { marginTop: "20px", display: "flex", justifyContent: "center", alignItems: "baseline" },
    currencySymbol: { fontSize: "20px", fontWeight: "bold", marginRight: "5px" },
    amountText: { fontSize: "42px", fontWeight: "bold", color: "#ee4d2d" },
    uploadCard: {
        backgroundColor: "#fff",
        padding: "25px 20px",
        borderRadius: "0 0 20px 20px",
        textAlign: "center"
    },
    sectionTitle: { margin: "0 0 5px 0" },
    sectionSubTitle: { fontSize: "13px", color: "#888", marginBottom: "20px" },
    customFileInput: {
        display: "inline-block",
        padding: "12px 30px",
        backgroundColor: "#f0f2f5",
        borderRadius: "10px",
        cursor: "pointer",
        border: "1px dashed #ccc"
    },
    previewContainer: { marginTop: "10px", marginBottom: "20px", textAlign: "left" },
    previewLabel: { fontSize: "12px", color: "#888" },
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
        cursor: "pointer"
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
    loader: {
        textAlign: "center",
        marginTop: "100px",
        color: "#666"
    }
};

export default MembershipPaymentPage;