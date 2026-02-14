import React from 'react';
import './AdCard.css';

const AdCard = ({ ad }) => (
  <div className="ad-card-native">
    <div className="ad-badge">Sponsored</div>
    <img src={ad.imageUrl} alt={ad.name} className="ad-img" />
    <div className="ad-content">
      <h4 className="ad-title">{ad.name}</h4>
      <p className="ad-loc">📍 {ad.location}</p>
      <div className="ad-footer">
        <span className="ad-price">{ad.price}</span>
        <button className="btn-visit">สั่งอาหาร</button>
      </div>
    </div>
  </div>
);

export default AdCard;