import React from "react";
import "./PremiumMember.css";
import { useNavigate } from "react-router-dom";

function PremiumMember() {
  const navigate = useNavigate();

  return (
    <div className="premium-page">
      <div className="premium-header">
        <div className="badge-exclusive">EXCLUSIVE ACCESS</div>
        <h1>ยกระดับร้านค้าของคุณให้เป็น <span>Premium</span></h1>
        <p>เพิ่มโอกาสในการขายและเข้าถึงลูกค้าได้มากกว่าเดิมในรั้ว มก.</p>
      </div>

      <div className="pricing-container">
        {/* แผนเริ่มต้น - ฟรี */}
        <div className="price-card">
          <h3>Normal User</h3>
          <div className="price">฿0 <span>/ ตลอดชีพ</span></div>
          <ul>
            <li>✓ ลงขายสินค้าไม่จำกัด</li>
            <li>✓ แชทคุยกับผู้ซื้อได้โดยตรง</li>
            <li>✕ ไม่มีสิทธิ์ Boost สินค้า</li>
            <li>✕ ไม่มีป้ายยืนยันตัวตน</li>
          </ul>
          <button className="btn-secondary" onClick={() => navigate("/all-products")}>
            ใช้งานแบบปกติ
          </button>
        </div>

        {/* แผนโปรโมชัน - ตัวท็อปที่อยากให้คนสมัคร */}
        <div className="price-card featured">
          <div className="hot-tag">RECOMMENDED</div>
          <h3>Pro Seller</h3>
          <div className="price">฿99 <span>/ เดือน</span></div>
          <ul>
            <li>✓ ทุกอย่างในแผน Normal</li>
            <li>✓ <b>Boost สินค้าได้ 3 ครั้ง/เดือน</b></li>
            <li>✓ ป้าย <b>Verified Member</b> สีทอง</li>
            <li>✓ สินค้าถูกแสดงในหน้าแรก (Featured)</li>
            <li>✓ สถิติการเข้าชมสินค้า</li>
          </ul>
          <button className="btn-premium-gold">
            สมัครรับโปรโมชันเลย
          </button>
        </div>
      </div>

      <div className="promo-footer">
        <p>สมัครสมาชิกภายในเดือนนี้ รับสิทธิ์ใช้ฟรี 7 วันแรก!</p>
      </div>
    </div>
  );
}

export default PremiumMember;