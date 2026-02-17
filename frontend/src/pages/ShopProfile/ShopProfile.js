import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ShopProfile.css";

import {api} from "../../api";

const DEFAULT_AVATAR = "/images/default-avatar.png";
const NO_IMAGE = "/images/noimage.png";

export default function ShopProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [seller, setSeller] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // ✅ ฟังก์ชันจัดการ URL รูปภาพให้ถูกต้อง (ป้องกันเครื่องหมาย / ซ้ำหรือหาย)
    const getFullUrl = (path, isAvatar = false) => {
        if (!path) return isAvatar ? DEFAULT_AVATAR : NO_IMAGE;
        if (path.startsWith("http")) return path;
        const cleanPath = path.startsWith("/") ? path : `/${path}`;
        return `${api.defaults.baseURL}${cleanPath}`;
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                // ✅ เรียก API: /api/auth/user/:id (อ้างอิงจาก server.js ที่คุณใช้ authRoutes)
                // หาก Backend คุณใช้ /api/users/:id ให้เปลี่ยนที่นี่
                const [userRes, prodRes] = await Promise.all([
                    api.get(`/api/auth/user/${id}`).catch(() =>
                        api.get(`/api/users/${id}`)
                    ),
                    api.get(`/api/products/user/${id}`)
                ]);


                setSeller(userRes.data);
                setProducts(prodRes.data);
            } catch (err) {
                console.error("Error fetching shop data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="loading-screen">กำลังโหลดร้านค้า...</div>;

    if (!seller) return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <p>ไม่พบข้อมูลร้านค้า (ID: {id})</p>
            <button onClick={() => navigate(-1)}>ย้อนกลับ</button>
        </div>
    );

    return (
        <div className="shop-profile-container">
            {/* ส่วนปุ่มย้อนกลับที่ปรับใหม่ */}
            <div className="back-button-wrapper">
                <button className="btn-back-global" onClick={() => navigate(-1)}>
                    ← ย้อนกลับ
                </button>
            </div>
            <div className="shop-header-section">
                <div className="shop-profile-card">
                    <img
                        className="shop-avatar-img"
                        src={getFullUrl(seller.profileImage, true)}
                        alt={seller.username}
                        onError={(e) => e.target.src = DEFAULT_AVATAR}
                    />
                    <div className="shop-details">
                        <h1 className="shop-name">{seller.shopId?.name || seller.username}</h1>
                        <p className="shop-email">✉️ {seller.email}</p>

                    </div>
                </div>
            </div>

            <div className="shop-content-section">
                <h3 className="grid-title">สินค้าทั้งหมด ({products.length})</h3>
                <div className="shop-product-grid">
                    {products.length > 0 ? (
                        products.map(p => (
                            <div key={p._id} className="product-item-card" onClick={() => navigate(`/products/${p._id}`)}>
                                <div className="product-img-box">
                                    <img
                                        src={getFullUrl(p.images?.[0])}
                                        alt={p.title}
                                        onError={(e) => e.target.src = NO_IMAGE}
                                    />
                                </div>
                                <div className="product-info-box">
                                    <div className="product-item-title">{p.title}</div>
                                    <div className="product-item-price">฿{p.price?.toLocaleString()}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="no-product">ผู้ขายท่านนี้ยังไม่มีการลงสินค้า</p>
                    )}
                </div>
            </div>
        </div>
    );
}