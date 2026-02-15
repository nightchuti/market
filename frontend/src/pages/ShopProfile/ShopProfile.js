import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./ShopProfile.css";

const API_URL = "http://localhost:5000";

function ShopProfile() {
  const { id } = useParams();
  const [shop, setShop] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/shops/${id}`)
      .then(res => setShop(res.data))
      .catch(() => setShop(null));
  }, [id]);

  if (!shop) return <p>กำลังโหลดร้านค้า...</p>;

  return (
    <div className="shop-profile">

      <img
        className="shop-banner"
        src={shop.bannerImage}
        alt=""
      />

      <h2>{shop.name}</h2>

      <p className="shop-desc">
        {shop.description || "ยังไม่มีคำอธิบายร้าน"}
      </p>

      <div className="owner-box">
        <img
          src={
            shop.ownerId?.profileImage
              ? shop.ownerId.profileImage.startsWith("http")
                ? shop.ownerId.profileImage
                : `${API_URL}${shop.ownerId.profileImage}`
              : "/default-avatar.png"
          }
        />

        <div>
          <b>{shop.ownerId?.username}</b>
          <p>เจ้าของร้าน</p>
        </div>
      </div>

    </div>
  );
}

export default ShopProfile;
