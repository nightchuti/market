
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const AdminDashboardPay = () => {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("waiting");
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_URL}/api/orders/admin/all-payments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleConfirmFinal = async (id) => {
    try {
      setIsUpdating(true);
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/api/orders/${id}/admin-confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConfirmId(null);
      fetchOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredOrders = orders.filter((o) =>
    activeTab === "waiting"
      ? o.status === "WaitingConfirm"
      : o.status === "Paid"
  );

  if (loading) return <p>กำลังโหลด...</p>;

  return (
    <div>
      <h2>ระบบจัดการบัญชีกลาง</h2>

      <button onClick={() => setActiveTab("waiting")}>
        รอตรวจสอบ
      </button>
      <button onClick={() => setActiveTab("approved")}>
        อนุมัติแล้ว
      </button>

      <table>
        <thead>
          <tr>
            <th>ร้านค้า</th>
            <th>ยอดเงิน</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((o) => (
            <tr key={o._id}>
              <td>{o.shopName}</td>
              <td>{o.totalPrice}</td>
              <td>
                {o.status === "WaitingConfirm" ? (
                  confirmId === o._id ? (
                    <>
                      <button
                        disabled={isUpdating}
                        onClick={() => handleConfirmFinal(o._id)}
                      >
                        ใช่
                      </button>
                      <button onClick={() => setConfirmId(null)}>
                        ไม่
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmId(o._id)}>
                      อนุมัติ
                    </button>
                  )
                ) : (
                  "จ่ายแล้ว"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// const styles = {
//     container: { padding: "30px", maxWidth: "1000px", margin: "0 auto", fontFamily: "'Prompt', sans-serif" },
//     title: { color: "#00467f", marginBottom: "20px" },
//     tabContainer: { display: "flex", gap: "20px", marginBottom: "20px", borderBottom: "1px solid #ddd" },
//     tabBtn: { padding: "10px 15px", cursor: "pointer", background: "none", border: "none", fontSize: "16px", fontWeight: "600" },
//     tableWrapper: { backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", overflow: "hidden" },
//     table: { width: "100%", borderCollapse: "collapse" },
//     thRow: { backgroundColor: "#f9fafb" },
//     th: { padding: "15px", textAlign: "left", fontSize: "14px", color: "#666" },
//     tr: { borderBottom: "1px solid #f1f1f1" },
//     td: { padding: "15px", fontSize: "15px" },
//     thumbnail: { width: "50px", height: "70px", objectFit: "cover", borderRadius: "6px", cursor: "pointer", border: "1px solid #eee" },

//     // ปุ่มเริ่มต้น
//     initBtn: {
//         backgroundColor: "#00467f", color: "#fff", border: "none",
//         padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px"
//     },
//     // กลุ่มปุ่มยืนยัน
//     confirmGroup: { display: "flex", gap: "5px" },
//     yesBtn: {
//         backgroundColor: "#28a745", color: "#fff", border: "none",
//         padding: "8px 12px", borderRadius: "6px", cursor: "pointer", width: "50px"
//     },
//     noBtn: {
//         backgroundColor: "#6c757d", color: "#fff", border: "none",
//         padding: "8px 12px", borderRadius: "6px", cursor: "pointer"
//     },
//     statusPaid: { color: "#28a745", fontWeight: "600", fontSize: "14px" }
// };

export default AdminDashboardPay;