import React, { useState, useEffect } from "react";
import api from "../../api";

const API_URL = process.env.REACT_APP_API_URL;

const getImageUrl = (img) => {
    if (!img) return "/images/no-slip.png";
    if (img.startsWith("http")) return img;
    if (!API_URL) return img;
    return `${API_URL.replace(/\/$/, "")}/${img.replace(/^\//, "")}`;
};

const AdminDashboardSubPay = () => {
    const [memberships, setMemberships] = useState([]);
    const [activeTab, setActiveTab] = useState("waiting");
    const [loading, setLoading] = useState(true);
    const [confirmId, setConfirmId] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/memberships/admin/memberships");
            setMemberships(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleConfirmFinal = async (id) => {
        setIsUpdating(true);
        try {
            await api.post(`/api/memberships/approve/${id}`);
            setConfirmId(null);
            fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredData = memberships.filter(item =>
        activeTab === "waiting"
            ? item.status === "pending"
            : item.status === "approved"
    );

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>จัดการการสมัครสมาชิก</h2>

            {/* Tabs */}
            <div style={styles.tabContainer}>
                <button
                    onClick={() => { setActiveTab("waiting"); setConfirmId(null); }}
                    style={{
                        ...styles.tabBtn,
                        color: activeTab === "waiting" ? "#00467f" : "#888",
                        borderBottom: activeTab === "waiting" ? "3px solid #00467f" : "none"
                    }}
                >
                    รอตรวจสอบ ({memberships.filter(m => m.status === "pending").length})
                </button>

                <button
                    onClick={() => { setActiveTab("approved"); setConfirmId(null); }}
                    style={{
                        ...styles.tabBtn,
                        color: activeTab === "approved" ? "#00467f" : "#888",
                        borderBottom: activeTab === "approved" ? "3px solid #00467f" : "none"
                    }}
                >
                    อนุมัติแล้ว
                </button>
            </div>

            {loading ? (
                <p style={{ textAlign: "center" }}>กำลังโหลดข้อมูล...</p>
            ) : (
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.thRow}>
                                <th style={styles.th}>ผู้ใช้</th>
                                <th style={styles.th}>แพ็กเกจ</th>
                                <th style={styles.th}>ราคา</th>
                                <th style={styles.th}>หลักฐานการชำระเงิน</th>
                                <th style={styles.th}>วันที่สมัคร</th>
                                <th style={styles.th}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(item => (
                                <tr key={item._id} style={styles.tr}>
                                    <td style={styles.td}>
                                        {item.user?.email || "ไม่พบผู้ใช้"}
                                    </td>

                                    <td style={styles.td}>
                                        {item.plan}
                                    </td>

                                    <td style={styles.td}>
                                        <strong style={{ color: "#ee4d2d" }}>
                                            ฿{item.price?.toLocaleString()}
                                        </strong>
                                    </td>

                                    <td style={styles.td}>
                                        <img
                                            src={getImageUrl(item.slip)}
                                            style={styles.thumbnail}
                                            onClick={() => setSelectedImage(getImageUrl(item.slip))}
                                            alt="slip"
                                        />
                                    </td>

                                    <td style={styles.td}>
                                        {new Date(item.createdAt).toLocaleString("th-TH")}
                                    </td>

                                    <td style={styles.td}>
                                        {activeTab === "waiting" ? (
                                            confirmId === item._id ? (
                                                <div style={styles.confirmGroup}>
                                                    <button
                                                        disabled={isUpdating}
                                                        onClick={() => handleConfirmFinal(item._id)}
                                                        style={styles.yesBtn}
                                                    >
                                                        ใช่
                                                    </button>
                                                    <button
                                                        disabled={isUpdating}
                                                        onClick={() => setConfirmId(null)}
                                                        style={styles.noBtn}
                                                    >
                                                        ไม่
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmId(item._id)}
                                                    style={styles.initBtn}
                                                >
                                                    อนุมัติ
                                                </button>
                                            )
                                        ) : (
                                            <span style={styles.statusPaid}>✔️ อนุมัติแล้ว</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal ดูรูปใหญ่ */}
            {selectedImage && (
                <div style={styles.modalOverlay} onClick={() => setSelectedImage(null)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <img
                            src={selectedImage}
                            style={styles.modalImage}
                            alt="slip large"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: "30px", maxWidth: "1000px", margin: "0 auto", fontFamily: "'Prompt', sans-serif" },
    title: { color: "#00467f", marginBottom: "20px" },
    tabContainer: { display: "flex", gap: "20px", marginBottom: "20px", borderBottom: "1px solid #ddd" },
    tabBtn: { padding: "10px 15px", cursor: "pointer", background: "none", border: "none", fontSize: "16px", fontWeight: "600" },
    tableWrapper: { backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse" },
    thRow: { backgroundColor: "#f9fafb" },
    th: { padding: "15px", textAlign: "left", fontSize: "14px", color: "#666" },
    tr: { borderBottom: "1px solid #f1f1f1" },
    td: { padding: "15px", fontSize: "15px" },
    thumbnail: { width: "50px", height: "70px", objectFit: "cover", borderRadius: "6px", cursor: "pointer", border: "1px solid #eee" },

    // ปุ่มเริ่มต้น
    initBtn: {
        backgroundColor: "#00467f", color: "#fff", border: "none",
        padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px"
    },
    // กลุ่มปุ่มยืนยัน
    confirmGroup: { display: "flex", gap: "5px" },
    yesBtn: {
        backgroundColor: "#28a745", color: "#fff", border: "none",
        padding: "8px 12px", borderRadius: "6px", cursor: "pointer", width: "50px"
    },
    noBtn: {
        backgroundColor: "#6c757d", color: "#fff", border: "none",
        padding: "8px 12px", borderRadius: "6px", cursor: "pointer"
    },
    statusPaid: {
        color: "#28a745", fontWeight: "600", fontSize: "14px"
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        padding: "20px"
    },

    modalContent: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },

    modalImage: {
        maxWidth: "80vw",
        maxHeight: "80vh",
        width: "auto",
        height: "auto",
        objectFit: "contain",
        borderRadius: "10px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
    }
};

export default AdminDashboardSubPay;