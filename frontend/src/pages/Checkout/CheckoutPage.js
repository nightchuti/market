import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./CheckoutPage.css";

export default function CheckoutPage() {

  const location = useLocation();
  const navigate = useNavigate();

  const products = location.state?.items || [];

  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("cod");

  if (!products.length) {
    navigate("/cart");
    return null;
  }

  const total = products.reduce(
    (sum, p) => sum + p.price * p.qty,
    0
  );

  const handleOrder = async () => {

    if (!address.trim()) {
      alert("กรุณากรอกที่อยู่จัดส่ง");
      return;
    }

    for (let p of products) {
      if (p.qty > p.quantity) {
        alert(`สินค้า ${p.title} มีไม่พอในสต็อก`);
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: products.map(p => ({
            productId: p._id,
            qty: p.qty
          })),
          address,
          payment
        })
      });

      if (!res.ok) throw new Error("Order failed");

      alert("สั่งซื้อสำเร็จ 🎉");
      navigate("/orders");

    } catch (err) {
      alert("เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="co-root">

      <h2 className="co-title">สั่งซื้อสินค้า</h2>

      <div className="co-card">
        <h3>รายการสินค้า</h3>

        {products.map(p => (
          <div key={p._id} className="co-item">
            <img
              src={
                p.images?.[0]
                  ? `http://localhost:5000${p.images[0]}`
                  : "https://via.placeholder.com/80"
              }
              alt={p.title}
            />

            <div className="co-item-info">
              <p className="co-item-name">{p.title}</p>
              <p>฿{p.price.toLocaleString()} × {p.qty}</p>
            </div>

            <strong>
              ฿{(p.price * p.qty).toLocaleString()}
            </strong>
          </div>
        ))}
      </div>

      <div className="co-card">
        <h3>ที่อยู่จัดส่ง</h3>
        <textarea
          className="co-input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="co-card">
        <h3>วิธีชำระเงิน</h3>

        <label className="co-radio">
          <input
            type="radio"
            checked={payment === "cod"}
            onChange={() => setPayment("cod")}
          />
          เก็บเงินปลายทาง
        </label>

        <label className="co-radio">
          <input
            type="radio"
            checked={payment === "transfer"}
            onChange={() => setPayment("transfer")}
          />
          โอนผ่านธนาคาร
        </label>
      </div>

      <div className="co-summary">
        <div>
          <span>รวมทั้งหมด</span>
          <strong>฿{total.toLocaleString()}</strong>
        </div>

        <button className="co-btn" onClick={handleOrder}>
          ยืนยันคำสั่งซื้อ
        </button>
      </div>

    </div>
  );
}
