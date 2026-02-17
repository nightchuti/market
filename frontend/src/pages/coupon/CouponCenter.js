import React, { useEffect, useState } from 'react';
import { api } from "../api";
import './CouponCenter.css';

const CouponCenter = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [animateId, setAnimateId] = useState(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/api/coupons");
      setCoupons(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleClaim = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await api.post(`/api/coupons/claim/${id}`);

      setAnimateId(id);

      setCoupons(prev =>
        prev.map(c =>
          c._id === id ? { ...c, isClaimed: true } : c
        )
      );

      setTimeout(() => setAnimateId(null), 400);
    } catch (err) {
      alert("ไม่สามารถเก็บคูปองได้");
    }
  };

  if (loading) return <div className="loading">กำลังโหลดคูปอง...</div>;

  return (
    <div className="coupon-wrapper">

      <h2 className="page-title">🎟 คูปองส่วนลด</h2>

      <div className="coupon-grid">
        {coupons.map(coupon => (
          <div
            key={coupon._id}
            className={`coupon-card ${animateId === coupon._id ? 'pop' : ''}`}
          >

            <div className="coupon-price">
              <span className="big">
                {coupon.discountType === "PERCENT"
                  ? `${coupon.discountValue}%`
                  : `฿${coupon.discountValue}`}
              </span>
              <small>ขั้นต่ำ ฿{coupon.minSpend}</small>
            </div>

            <div className="coupon-info">
              <div className="row">
                <span className="code">{coupon.code}</span>
                {coupon.requiredTier === "PRO" && (
                  <span className="pro-badge">PRO</span>
                )}
              </div>

              <p>ใช้ได้ถึง {new Date(coupon.expireAt).toLocaleDateString("th-TH")}</p>

              <button
                className={`btn 
                ${coupon.isClaimed ? "claimed" : ""}
                ${coupon.isAlreadyUsed ? "used" : ""}`}
                onClick={() => handleClaim(coupon._id)}
                disabled={coupon.isClaimed || coupon.isAlreadyUsed || coupon.isFull}
              >
                {coupon.isAlreadyUsed
                  ? "ใช้แล้ว"
                  : coupon.isClaimed
                  ? "เก็บแล้ว"
                  : coupon.isFull
                  ? "หมด"
                  : "เก็บคูปอง"}
              </button>

            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default CouponCenter;
