import React from 'react';
import './AdCard.css';

const AdCard = ({ ad }) => {
  // ตรวจสอบว่ารูปภาพเป็น URL เต็มหรือเป็น Path
const BASE_URL = process.env.REACT_APP_API_URL;

const imageUrl = ad.imageUrl?.startsWith("http")
  ? ad.imageUrl
  : `${BASE_URL}${ad.imageUrl}`;
  return (
    <a href={ad.link} target="_blank" rel="noopener noreferrer" className="ad-card-link">
      <div className="ad-card-native">
        <div className="ad-badge-tag">โฆษณาแนะนำ</div> 
        
        <div className="ad-img-container">
          <img src={imageUrl} alt={ad.shopName} className="ad-img" />
        </div>
        
        <div className="ad-body">
          <h4 className="ad-title">{ad.shopName || ad.name}</h4>
          <p className="ad-desc">{ad.description}</p>
          <p className="ad-loc">📍 {ad.location}</p>
          
          <div className="ad-flex">
            <span className="ad-price">{ad.priceRange || ad.price}</span>
            <button className="btn-visit">ไปที่ร้านค้า</button>
          </div>
        </div>
      </div>
    </a>
  );
};

export default AdCard;