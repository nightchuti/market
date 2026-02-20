import React, { useState, useEffect } from "react";
import api from "../api";

const API_URL = process.env.REACT_APP_API_URL;

const AdminDashboardPay = () => {
    console.log("API_URL =", API_URL);
    console.log(order.paymentSlip);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState("waiting");
    const [loading, setLoading] = useState(true);
    const [confirmId, setConfirmId] = useState(null); // เก็บ ID ออเดอร์ที่กำลังจะกดยืนยัน
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/orders/admin/all-payments");
            setOrders(res.data);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, []);

    const handleConfirmFinal = async (orderId) => {
        setIsUpdating(true);
        try {
            await api.patch(`/api/orders/${orderId}/admin-confirm`);
            setConfirmId(null);
            fetchOrders();
        } catch (err) {
            console.error(err);
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredOrders = orders.filter(order =>
        activeTab === "waiting" ? order.status === "WaitingConfirm" : order.status === "Paid"
    );

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>ระบบจัดการบัญชีกลาง</h2>

            <div style={styles.tabContainer}>
                <button
                    onClick={() => { setActiveTab("waiting"); setConfirmId(null); }}
                    style={{ ...styles.tabBtn, color: activeTab === "waiting" ? "#00467f" : "#888", borderBottom: activeTab === "waiting" ? "3px solid #00467f" : "none" }}
                >
                    รอตรวจสอบ ({orders.filter(o => o.status === "WaitingConfirm").length})
                </button>
                <button
                    onClick={() => { setActiveTab("approved"); setConfirmId(null); }}
                    style={{ ...styles.tabBtn, color: activeTab === "approved" ? "#00467f" : "#888", borderBottom: activeTab === "approved" ? "3px solid #00467f" : "none" }}
                >
                    อนุมัติแล้ว
                </button>
            </div>

            {loading ? <p style={{ textAlign: 'center' }}>กำลังโหลดข้อมูล...</p> : (
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.thRow}>
                                <th style={styles.th}>รหัส/ร้านค้า</th>
                                <th style={styles.th}>รายการสินค้า</th>
                                <th style={styles.th}>ยอดเงิน</th>
                                <th style={styles.th}>สลิป</th>
                                <th style={styles.th}>วันที่สั่ง</th>
                                <th style={styles.th}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order._id} style={styles.tr}>
                                    {/* ข้อมูลออเดอร์และร้านค้า */}
                                    <td style={styles.td}>
                                        <div style={{ fontWeight: 'bold', color: '#333' }}>
                                            #{order._id.slice(-6).toUpperCase()}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#00467f' }}>
                                            {/* 🆕 แก้ไข: ดึงชื่อร้านจาก product.shop.name */}
                                            {order.items[0]?.product?.user?.username || "ร้านค้าทั่วไป"}
                                        </div>
                                    </td>

                                    {/* รายการสินค้าที่ซื้อ */}
                                    <td style={styles.td}>
                                        {order.items.map((item, index) => (
                                            <div key={index} style={{ fontSize: '13px', color: '#555' }}>
                                                {/* 🆕 แก้ไข: เปลี่ยนจาก .name เป็น .title ตาม Model Product */}
                                                {item.product?.title || "ไม่พบชื่อสินค้า"} (x{item.quantity})
                                            </div>
                                        ))}
                                    </td>

                                    <td style={styles.td}>
                                        <strong style={{ fontSize: '16px', color: '#ee4d2d' }}>
                                            ฿{order.totalPrice.toLocaleString()}
                                        </strong>
                                    </td>

                                    <td style={styles.td}>
                                        <img
                                            src={`${API_URL}${order.paymentSlip}`}
                                            style={styles.thumbnail}
                                            onClick={() => window.open(`${API_URL}${order.paymentSlip}`)}
                                            alt="slip"
                                        />
                                    </td>

                                    <td style={styles.td}>
                                        {new Date(order.createdAt).toLocaleString("th-TH")}
                                    </td>

                                    <td style={styles.td}>
                                        {/* ส่วนปุ่มกดยืนยัน (เหมือนเดิม) */}
                                        {activeTab === "waiting" ? (
                                            confirmId === order._id ? (
                                                <div style={styles.confirmGroup}>
                                                    <button disabled={isUpdating} onClick={() => handleConfirmFinal(order._id)} style={styles.yesBtn}>ใช่</button>
                                                    <button disabled={isUpdating} onClick={() => setConfirmId(null)} style={styles.noBtn}>ไม่</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setConfirmId(order._id)} style={styles.initBtn}>อนุมัติ</button>
                                            )
                                        ) : (
                                            <span style={styles.statusPaid}>✔️ จ่ายแล้ว</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
    statusPaid: { color: "#28a745", fontWeight: "600", fontSize: "14px" }
};

export default AdminDashboardPay;