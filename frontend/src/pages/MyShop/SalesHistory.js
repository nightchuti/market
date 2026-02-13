import { useEffect, useState } from "react";
import axios from "axios";

function SalesHistory() {
  const [soldProducts, setSoldProducts] = useState([]);

  useEffect(() => {
    fetchSold();
  }, []);

  const fetchSold = async () => {
    const res = await axios.get(
      "http://localhost:5000/api/products/my",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );

    const sold = res.data.filter(p => p.status === "sold");
    setSoldProducts(sold);
  };

  return (
    <div>
      {soldProducts.length === 0 && <p>ยังไม่มีสินค้าที่ขายแล้ว</p>}

      {soldProducts.map((p) => (
        <div key={p._id} className="inventory-item">
          {p.title} — ขายแล้ว
        </div>
      ))}
    </div>
  );
}

export default SalesHistory;
