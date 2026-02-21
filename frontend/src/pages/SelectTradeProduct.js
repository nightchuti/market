import { useEffect, useState } from "react";
import api from "../api";
import "./SelectTradeProduct.css";

function SelectTradeProduct({ token, targetProductId, onConfirm, onCancel }) {
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyProducts = async () => {
      try {
        const res = await api.get("/api/products/my-trade-products", {
          headers: { Authorization: `Bearer ${token}` }
        });

        // ❗ ตัดสินค้าตัวเดียวกับที่กำลังดูออก
        const filtered = res.data.filter(
          (p) => p._id !== targetProductId
        );

        setMyProducts(filtered);
      } catch (err) {
        alert("โหลดสินค้าของคุณไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };

    fetchMyProducts();
  }, [token, targetProductId]);

  if (loading) return <div className="trade-overlay">กำลังโหลด...</div>;

  return (
    <div className="trade-overlay">
      <div className="trade-modal">
        <h2>เลือกสินค้าที่จะใช้แลก</h2>

        {myProducts.length === 0 ? (
          <p>คุณยังไม่มีสินค้าที่เปิดรับแลก</p>
        ) : (
          <div className="trade-grid">
            {myProducts.map((product) => (
              <div
                key={product._id}
                className="trade-card"
                onClick={() => onConfirm(product._id)}
              >
                <img
                  src={
                    product.images?.[0]
                      ? `${api.defaults.baseURL}${product.images[0]}`
                      : "/images/noimage.png"
                  }
                  alt={product.title}
                />
                <h4>{product.title}</h4>
                <p>฿{product.price}</p>
              </div>
            ))}
          </div>
        )}

        <button className="btn-cancel" onClick={onCancel}>
          ปิด
        </button>
      </div>
    </div>
  );
}

export default SelectTradeProduct;