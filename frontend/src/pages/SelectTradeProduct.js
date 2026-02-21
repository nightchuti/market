import { useEffect, useState } from "react";
import api from "../api";
import "./SelectTradeProduct.css";

function SelectTradeProduct({ token, onConfirm, onCancel }) {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get("/api/products/my-trade-products", {
          headers: { Authorization: `Bearer ${token}` }
        });

        setProducts(res.data);
      } catch (err) {
        console.error("โหลดสินค้าสำหรับเทรดไม่สำเร็จ", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [token]);

  return (
    <div className="trade-modal-overlay">
      <div className="trade-modal">

        <h3>เลือกสินค้าที่จะใช้แลก</h3>

        {loading && <p>กำลังโหลด...</p>}

        {!loading && products.length === 0 && (
          <p>คุณยังไม่มีสินค้าที่สามารถใช้แลกได้</p>
        )}

        <div className="trade-product-list">
          {products.map((p) => (
            <div
              key={p._id}
              className={`trade-item ${selected?._id === p._id ? "active" : ""}`}
              onClick={() => setSelected(p)}
            >
              <img
                src={
                  p.images?.[0]
                    ? `${api.defaults.baseURL}${p.images[0]}`
                    : "/images/noimage.png"
                }
                alt=""
              />
              <div>
                <b>{p.title}</b>
              </div>
            </div>
          ))}
        </div>

        <div className="trade-btn-row">
          <button onClick={onCancel}>ยกเลิก</button>

          <button
            disabled={!selected}
            onClick={() => {
              onConfirm(selected._id);
            }}
          >
            ยืนยันเลือก
          </button>
        </div>

      </div>
    </div>
  );
}

export default SelectTradeProduct;