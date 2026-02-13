import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Inventory() {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await axios.get(
      "http://localhost:5000/api/products/my",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );
    setProducts(res.data);
  };

  const handleDelete = async (id) => {
    await axios.delete(
      `http://localhost:5000/api/products/${id}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );

    fetchProducts();
  };

  return (
    <div>
      {products.map((p) => (
        <div key={p._id} className="inventory-item">
          <span>{p.title}</span>

          <span>
            {p.status === "available"
              ? "🟢 พร้อมขาย"
              : "🔴 ขายแล้ว"}
          </span>

          <div>
            <button onClick={() => navigate(`/edit-product/${p._id}`)}>
              แก้ไข
            </button>

            <button onClick={() => handleDelete(p._id)}>
              ลบ
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Inventory;
