import React, { useEffect, useState } from "react";
import api from "../../api";

const AdminActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const res = await api.get("/api/admin/activities");
      setActivities(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  if (loading) return <p style={{ padding: 30 }}>กำลังโหลด...</p>;

  return (
    <div style={{ padding: 30 }}>
      <h2>กิจกรรมทั้งหมดของระบบ</h2>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>ประเภท</th>
            <th>รายละเอียด</th>
            <th>ผู้ใช้</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((act) => (
            <tr key={act._id}>
              <td>{new Date(act.createdAt).toLocaleString("th-TH")}</td>
              <td>{act.type}</td>
              <td>{act.description}</td>
              <td>{act.user?.username || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const tableStyle = {
  width: "100%",
  background: "#fff",
  borderCollapse: "collapse",
  marginTop: "20px"
};

export default AdminActivity;