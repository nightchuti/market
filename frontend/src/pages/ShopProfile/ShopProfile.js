import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./ShopProfile.css";

const API_URL = "http://localhost:5000";

function ShopProfile() {
  const { id } = useParams();   // ✅ ต้องชื่อ id

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;   // 🔥 ป้องกัน undefined

    axios
      .get(`${API_URL}/api/shops/${id}`)
      .then((res) => {
        setShop(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.log("โหลดร้านไม่สำเร็จ", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p>กำลังโหลด...</p>;
  if (!shop) return <p>ไม่พบร้านค้า</p>;

  return (
    <div className="shop-profile">

      <div className="shop-header">
        <img
          className="shop-banner"
          src={
            shop.bannerImage
              ? shop.bannerImage.startsWith("http")
                ? shop.bannerImage
                : `${API_URL}${shop.bannerImage}`
              : "/noimage.png"
          }
          alt=""
        />

        <h2>{shop.name}</h2>
        <p>{shop.description}</p>
      </div>

      <div className="shop-owner">
        <img
          src={
            shop.ownerId?.profileImage
              ? shop.ownerId.profileImage.startsWith("http")
                ? shop.ownerId.profileImage
                : `${API_URL}${shop.ownerId.profileImage}`
              : "/default-avatar.png"
          }
          alt=""
        />

        <div>
          <p><b>เจ้าของร้าน:</b> {shop.ownerId?.username}</p>
          <p><b>Email:</b> {shop.ownerId?.email}</p>
        </div>
      </div>

      <div className="shop-info">
        <p><b>ที่อยู่:</b> {shop.address || "-"}</p>
        <p><b>ลิงก์ร้าน:</b> {shop.shopUrl || "-"}</p>
      </div>

    </div>
  );
}

export default ShopProfile;
