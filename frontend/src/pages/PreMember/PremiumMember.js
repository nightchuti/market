import React from "react";
import "./PremiumMember.css";
import { useNavigate } from "react-router-dom";

function PremiumMember() {
  const navigate = useNavigate();

  return (
    <div className="premium-container">
      {/* ส่วนหัวดึงดูดสายตา */}
      <header className="premium-hero">
        <span className="hero-badge">KU MARKETPLACE EXCLUSIVE</span>
        <h1>ขายดีกว่าเดิมด้วย <span>Premium Features</span></h1>
        <p>เครื่องมือที่จะช่วยให้ร้านค้าของคุณโดดเด่น และเข้าถึงนิสิต มก. ได้ตรงกลุ่มเป้าหมายที่สุด</p>
      </header>

      {/* ส่วนตารางเปรียบเทียบราคา */}
      <div className="pricing-layout">
        
        {/* Card 1: สำหรับนิสิตใหม่ */}
        <div className="plan-card">
          <div className="plan-header">
            <div className="plan-icon">🐣</div>
            <h3>New User Trial</h3>
            <p className="plan-price">FREE <span>/ ครั้งแรก</span></p>
          </div>
          <div className="plan-body">
            <ul>
              <li><i className="check-icon">✓</i> สิทธิ์ Boost สินค้าฟรี 1 ครั้ง</li>
              <li><i className="check-icon">✓</i> สินค้าแสดงในหน้าแรกสั้นๆ</li>
              <li><i className="check-icon">✓</i> ระบบแชทซื้อขายปกติ</li>
              <li className="disabled">✕ ไม่มีป้ายยืนยันตัวตน</li>
              <li className="disabled">✕ ลงโฆษณาร้านอาหารไม่ได้</li>
            </ul>
          </div>
          <button className="plan-btn" onClick={() => navigate("/my-shop")}>
            เริ่มใช้งานฟรี
          </button>
        </div>

        {/* Card 2: สำหรับคนขายด่วน (Pay-per-Boost) */}
        <div className="plan-card highlight-border">
          <div className="plan-header">
            <div className="plan-icon">🚀</div>
            <h3>Single Boost</h3>
            <p className="plan-price">฿20 <span>/ ต่อครั้ง</span></p>
          </div>
          <div className="plan-body">
            <ul>
              <li><i className="check-icon">✓</i> <b>ดันสินค้าขึ้นอันดับต้นๆ ทันที</b></li>
              <li><i className="check-icon">✓</i> สถานะแนะนำ ✨ (นาน 3 วัน)</li>
              <li><i className="check-icon">✓</i> อัตราการเห็นเพิ่มขึ้น 3 เท่า</li>
              <li><i className="check-icon">✓</i> เหมาะสำหรับขายสินค้าชิ้นเดียว</li>
              <li className="disabled">✕ ไม่มีป้าย Verified</li>
            </ul>
          </div>
          <button className="plan-btn btn-dark" onClick={() => navigate("/payment?type=single")}>
            ซื้อสิทธิ์รายครั้ง
          </button>
        </div>

        {/* Card 3: Pro Seller (จุดเด่นเรื่อง Ads ร้านอาหาร) */}
        <div className="plan-card featured-pro">
          <div className="popular-tag">คุ้มค่าที่สุด</div>
          <div className="plan-header">
            <div className="plan-icon">👑</div>
            <h3>Pro Seller</h3>
            <p className="plan-price">฿99 <span>/ เดือน</span></p>
          </div>
          <div className="plan-body">
            <ul>
              <li><i className="check-icon">✓</i> <b>Boost ฟรี 5 สิทธิ์ทุกเดือน</b></li>
              <li><i className="check-icon">✓</i> ป้าย <b>Verified Member</b> สีทอง</li>
              <li><i className="check-icon">✓</i> สินค้าแสดงแทรกทุก 3 รายการ</li>
              <li><i className="check-icon">✓</i> บริการซัพพอร์ตระดับพรีเมียม</li>
            </ul>
          </div>
          <button className="plan-btn btn-gold" onClick={() => navigate("/payment?type=premium")}>
            สมัครสมาชิก PRO
          </button>
        </div>

      </div>

      {/* ส่วนอธิบายเรื่อง Ads ร้านอาหาร (ให้ผู้ใช้เข้าใจว่า Ads อยู่ตรงไหน) */}
      <section className="ads-explanation">
        <div className="ads-info-content">
          <h3>โฆษณา(Native Ads) คืออะไร?</h3>
          <p>
            สำหรับสมาชิก <b>Pro Seller</b> คุณสามารถสร้างการ์ดแนะนำร้านอาหารหรือบริการของคุณ 
            ที่จะไปปรากฏ "แทรก" อยู่ท่ามกลางสินค้าทั่วไปในหน้า All Products 
            ช่วยให้คนหิวที่กำลังเลือกซื้อของ เห็นร้านของคุณได้ง่ายขึ้น!
          </p>
          <div className="ad-preview-box">
             <span>ตัวอย่างการแสดงผลโฆษณาแทรกในรายการสินค้า (ทุกๆ 6 ชิ้น)</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PremiumMember;