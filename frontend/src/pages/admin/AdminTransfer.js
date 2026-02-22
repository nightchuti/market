import React, { useEffect, useState } from "react";
import api from "../../api";

const AdminTransfer = () => {
    const [activeTab, setActiveTab] = useState("pending");
    const [pendingOrders, setPendingOrders] = useState([]);
    const [transferredOrders, setTransferredOrders] = useState([]);

    const fetchPending = async () => {
        const res = await api.get("/api/orders/admin/pending-transfer");
        setPendingOrders(res.data);
    };

    const fetchTransferred = async () => {
        const res = await api.get("/api/orders/admin/transferred");
        setTransferredOrders(res.data);
    };

    const transferMoney = async (id) => {
        if (!window.confirm("ยืนยันว่าโอนเงินแล้ว?")) return;

        await api.patch(`/api/orders/${id}/admin-transfer-seller`);
        fetchPending();
        fetchTransferred();
    };

    useEffect(() => {
        fetchPending();
        fetchTransferred();
    }, []);

    const renderOrders = (orders, isTransferred = false) => (
        orders.length === 0
            ? <div style={emptyStyle}>ไม่มีรายการ</div>
            : orders.map(order => {
                const seller = order.items[0]?.product?.user;
                const bank = seller?.bankAccount;

                return (
                    <div key={order._id} style={cardStyle}>
                        <div style={topRow}>
                            <div>
                                <p style={label}>Order ID</p>
                                <p style={value}>{order._id}</p>
                            </div>
                            <div style={priceBox}>฿{order.totalPrice}</div>
                        </div>

                        <p><strong>ร้านค้า:</strong> {seller?.username}</p>

                        {bank && (
                            <div style={bankBox}>
                                <p>ธนาคาร: {bank.bankName || "-"}</p>
                                <p>ชื่อบัญชี: {bank.accountName || "-"}</p>
                                <p>เลขบัญชี: {bank.accountNumber || "-"}</p>
                                <p>PromptPay: {bank.promptPayNumber || "-"}</p>
                            </div>
                        )}

                        {isTransferred ? (
                            <div style={successBadge}>
                                โอนแล้วเมื่อ {new Date(order.sellerTransferredAt).toLocaleString()}
                            </div>
                        ) : (
                            <button
                                style={btnStyle}
                                onClick={() => transferMoney(order._id)}
                            >
                                โอนเงินให้ร้าน
                            </button>
                        )}
                    </div>
                );
            })
    );

    return (
        <div style={containerStyle}>
            <h2>จัดการโอนเงินร้านค้า</h2>

            <div style={tabContainer}>
                <button
                    style={activeTab === "pending" ? activeTabStyle : tabStyle}
                    onClick={() => setActiveTab("pending")}
                >
                    รอโอนเงิน
                </button>
                <button
                    style={activeTab === "transferred" ? activeTabStyle : tabStyle}
                    onClick={() => setActiveTab("transferred")}
                >
                    โอนแล้ว
                </button>
            </div>

            {activeTab === "pending"
                ? renderOrders(pendingOrders)
                : renderOrders(transferredOrders, true)}
        </div>
    );
};

/* ================= STYLE ================= */

const containerStyle = {
    padding: "20px 80px",
    background: "#f4f6f9",
    minHeight: "100vh"
};

const tabContainer = {
    display: "flex",
    gap: 10,
    marginBottom: 25
};

const tabStyle = {
    padding: "10px 18px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer"
};

const activeTabStyle = {
    ...tabStyle,
    background: "#264653",
    color: "#fff",
    border: "none"
};

const cardStyle = {
    background: "#fff",
    padding: 25,
    marginBottom: 20,
    borderRadius: 14,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
};

const topRow = {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10
};

const label = { fontSize: 12, color: "#888" };
const value = { fontWeight: 600 };

const priceBox = {
    background: "#2a9d8f",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: 8
};

const bankBox = {
    background: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15
};

const btnStyle = {
    display: "block",
    margin: "20px auto 0 auto",   // 👈 ทำให้อยู่กลาง
    width: "60%",
    maxWidth: "300px",
    background: "linear-gradient(135deg, #2a9d8f, #21867a)",
    border: "none",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "30px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
};

const successBadge = {
    background: "#d4edda",
    color: "#155724",
    padding: 10,
    borderRadius: 8,
    textAlign: "center",
    fontWeight: 600
};

const emptyStyle = {
    padding: 20,
    background: "#fff",
    borderRadius: 10,
    textAlign: "center",
    color: "#777"
};

export default AdminTransfer;