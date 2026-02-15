// components/CouponCard.js
import React from 'react';

const CouponCard = ({ coupon, onClaim }) => {
  // ตรวจสอบสถานะเพื่อกำหนดสไตล์
  const isDisabled = coupon.isClaimed || coupon.isFull || coupon.isAlreadyUsed;
  
  return (
    <div className={`coupon-card ${coupon.requiredTier === 'PRO' ? 'pro-tier' : ''}`}>
      <div className="coupon-left">
        <div className="discount-value">
          {coupon.discountType === 'PERCENT' ? `${coupon.discountValue}%` : `฿${coupon.discountValue}`}
        </div>
        <div className="min-spend">ขั้นต่ำ ฿{coupon.minSpend}</div>
      </div>
      
      <div className="coupon-right">
        <div className="coupon-header">
          <span className="badge">{coupon.requiredTier}</span>
          <h4 className="code">{coupon.code}</h4>
        </div>
        <p className="expiry">หมดเขต: {new Date(coupon.expireAt).toLocaleDateString('th-TH')}</p>
        
        <button 
          onClick={() => onClaim(coupon._id)}
          disabled={isDisabled}
          className={`claim-btn ${coupon.isClaimed ? 'claimed' : ''}`}
        >
          {coupon.isAlreadyUsed ? 'ใช้แล้ว' : coupon.isClaimed ? 'เก็บแล้ว' : coupon.isFull ? 'โค้ดเต็ม' : 'เก็บคูปอง'}
        </button>
      </div>
    </div>
  );
};

export default CouponCard;