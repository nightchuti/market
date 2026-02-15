import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminDashboard = () => {
    const [orders, setOrders] = useState([]);
    const API_URL = "http://127.0.0.1:5000";

    useEffect(() => {
        const fetchWaitingOrders = async () => {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API_URL}/api/orders/admin/waiting-confirm`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data);
        };
        fetchWaitingOrders();
    }, []);

    const handleConfirm = async (orderId) => {
        if (!window.confirm("ยืนยันว่าเงินเข้าบัญชีกลางแล้วจริง?")) return;
        try {
            const token = localStorage.getItem("token");
            await axios.patch(`${API_URL}/api/orders/${orderId}/admin-confirm`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(orders.filter(o => o._id !== orderId)); // เอาออกจากรายการที่ต้องตรวจ
            alert("ยืนยันเรียบร้อย ร้านค้าจะเห็นสถานะว่าชำระแล้ว");
        } catch (err) {
            alert("Error");
        }
    };

    return (
        <div style={{ padding: "20px" }}>
            <h1>Admin: ตรวจสอบสลิปบัญชีกลาง</h1>
            <table border="1" width="100%" style={{ borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th>ออเดอร์</th>
                        <th>ยอดเงิน</th>
                        <th>รูปสลิป</th>
                        <th>จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(order => (
                        <tr key={order._id}>
                            <td>{order._id.slice(-6)}</td>
                            <td>฿{order.totalPrice}</td>
                            <td>
                                <a href={`${API_URL}/${order.paymentSlip}`} target="_blank">ดูรูปสลิป</a>
                            </td>
                            <td>
                                <button onClick={() => handleConfirm(order._id)} style={{ background: "green", color: "#fff" }}>
                                    เงินเข้าแล้ว (อนุมัติ)
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminDashboard;