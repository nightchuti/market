import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import "./CheckoutPage.css";

const API_URL = "http://127.0.0.1:5000";

const CheckoutPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const selectedItems = location.state?.items || [];

    const [cartItems, setCartItems] = useState(selectedItems);
    const [addresses, setAddresses] = useState([]);
    const [selectedAddr, setSelectedAddr] = useState(null);

    // ⭐ both ต้องเริ่มเป็น ""
    const [deliveryMode, setDeliveryMode] = useState(
        location.state?.deliveryMode || ""
    );

    const [shippingService, setShippingService] = useState("GRAB");
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [distance, setDistance] = useState(0);

    const [loading, setLoading] = useState(true);

    const [paymentMethod, setPaymentMethod] = useState("PROMPTPAY");
    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);

    const [showCouponModal, setShowCouponModal] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState([]);
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    // ================= REDIRECT IF EMPTY =================
    useEffect(() => {
        if (!location.state?.items || location.state.items.length === 0) {
            navigate("/cart");
        }
    }, [location.state, navigate]);

    // ================= FETCH ADDRESS =================
    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const addrRes = await axios.get(`${API_URL}/api/address`, { headers });

            setAddresses(addrRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ================= SET DEFAULT ADDRESS =================
    useEffect(() => {
        if (addresses.length > 0) {

            if (location.state?.selectedAddressId) {
                const updated = addresses.find(
                    addr => addr._id === location.state.selectedAddressId
                );

                if (updated) {
                    setSelectedAddr(updated);
                }
            }

            // ⭐ restore deliveryMode ถ้ามี
            if (location.state?.deliveryMode) {
                setDeliveryMode(location.state.deliveryMode);
            }

        }
    }, [addresses, location.state]);

    // ================= DETERMINE DELIVERY MODE =================
    useEffect(() => {
        if (cartItems.length > 0) {
            const type = cartItems[0]?.deliveryType?.toLowerCase();

            if (type === "meetup") {
                setDeliveryMode("PICKUP");
            }
            else if (type === "delivery") {
                setDeliveryMode("DELIVERY");
            }
            else if (type === "both") {
                // ⭐ ถ้ายังไม่เคยเลือกเท่านั้นถึงจะ reset
                setDeliveryMode(prev => prev || "");
            }
        }
    }, [cartItems]);

    // ================= MOCK DISTANCE =================
    useEffect(() => {
        if (deliveryMode === "DELIVERY" && selectedAddr) {
            const mockDistance = 2.5;
            setDistance(mockDistance);
        }
    }, [deliveryMode, selectedAddr]);

    // ================= CALCULATE DELIVERY FEE =================
    useEffect(() => {
        if (deliveryMode === "DELIVERY" && selectedAddr) {
            let fee = 0;

            if (shippingService === "GRAB") {
                fee = Math.round(25 + distance * 7);
            } else {
                fee = Math.round(20 + distance * 6);
            }

            setDeliveryFee(fee);
        } else {
            setDeliveryFee(0);
        }
    }, [deliveryMode, selectedAddr, shippingService, distance]);

    // ================= RECEIVE SELECTED ADDRESS FROM ADDRESS PAGE =================
    useEffect(() => {
        if (addresses.length > 0) {

            // ถ้ามี selectedAddressId กลับมา
            if (location.state?.selectedAddressId) {
                const updated = addresses.find(
                    addr => addr._id === location.state.selectedAddressId
                );

                if (updated) {
                    setSelectedAddr(updated);
                    return;
                }
            }

            // ถ้าไม่มี ให้ใช้ default หรืออันแรก
            const defaultAddr =
                addresses.find(a => a.isDefault) || addresses[0];

            setSelectedAddr(defaultAddr);
        }
    }, [addresses, location.state]);

    const fetchCoupons = async () => {
        try {
            const token = localStorage.getItem("token");

            const res = await axios.get(
                `${API_URL}/api/coupons/my`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setAvailableCoupons(res.data);

        } catch (err) {
            console.error(err);
        }
    };

    const openCouponModal = () => {
        fetchCoupons();
        setShowCouponModal(true);
    };

    const applyCouponCode = async (code) => {
        try {
            const token = localStorage.getItem("token");

            const res = await axios.post(
                `${API_URL}/api/coupons/check`,
                {
                    code,
                    subTotal
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setDiscount(res.data.discount);
            setCouponCode(code);
            setAppliedCoupon(res.data.coupon);
            setShowCouponModal(false);

        } catch (err) {
            alert(err.response?.data?.message || "ใช้คูปองไม่ได้");
        }
    };

    const handleRemoveCoupon = () => {
        setDiscount(0);
        setCouponCode("");
        setAppliedCoupon(null);
    };

    const evaluateCoupon = (coupon) => {
        if (!coupon) return { usable: false, reason: "" };

        if (coupon.isAlreadyUsed) {
            return { usable: false, reason: "ใช้แล้ว" };
        }

        if (coupon.isFull) {
            return { usable: false, reason: "โควตาเต็ม" };
        }

        if (subTotal < coupon.minSpend) {
            return {
                usable: false,
                reason: `ขั้นต่ำ ฿${coupon.minSpend}`
            };
        }

        return { usable: true, reason: "ใช้ได้" };
    };

    // ================= TOTAL =================
    const subTotal = cartItems.reduce(
        (sum, i) => sum + (i.price * i.qty),
        0
    );

    const total = Math.max(0, subTotal + deliveryFee - discount);

    useEffect(() => {
        setDiscount(0);
    }, [subTotal]);

    if (loading) return <div className="loading">กำลังเตรียมคำสั่งซื้อ...</div>;

    const handleApplyCoupon = async () => {
        if (!couponCode) return alert("กรุณากรอกโค้ดคูปอง");

        try {
            const token = localStorage.getItem("token");

            const res = await axios.post(
                `${API_URL}/api/coupons/check`,
                {
                    code: couponCode,
                    subTotal
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setDiscount(res.data.discount);

            alert("ใช้คูปองสำเร็จ!");

        } catch (err) {
            setDiscount(0);
            alert(err.response?.data?.message || "คูปองใช้ไม่ได้");
        }
    };

    // ================= PLACE ORDER =================
    const handlePlaceOrder = async () => {
        try {
            const token = localStorage.getItem("token");

            const type = cartItems[0]?.deliveryType?.toLowerCase();

            // BOTH ต้องเลือกก่อน
            if (type === "both" && !deliveryMode)
                return alert("กรุณาเลือกรูปแบบการรับสินค้า");

            // DELIVERY ต้องมีที่อยู่
            if (deliveryMode === "DELIVERY" && !selectedAddr)
                return alert("กรุณาเลือกที่อยู่จัดส่ง");

            // นัดรับห้าม COD
            if (deliveryMode === "PICKUP" && paymentMethod === "COD")
                return alert("นัดรับสินค้าไม่สามารถเก็บเงินปลายทางได้");

            const orderData = {
                items: cartItems.map(i => ({
                    product: i._id,
                    quantity: i.qty
                })),

                shippingAddress:
                    deliveryMode === "DELIVERY"
                        ? {
                            dormName: selectedAddr.dormName,
                            room: selectedAddr.room,
                            note: selectedAddr.note,
                            lat: selectedAddr.lat,
                            lng: selectedAddr.lng
                        }
                        : null,

                deliveryMode,
                shippingService:
                    deliveryMode === "DELIVERY" ? shippingService : null,
                couponCode,
                paymentMethod
            };

            const orderRes = await axios.post(
                `${API_URL}/api/orders/checkout`,
                orderData,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            alert("สั่งซื้อสำเร็จ!");
            navigate("/profile");

        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
        }
    };

    return (
        <div className="shopee-checkout">

            <div className="sh-header">
                <button className="back-btn" onClick={() => navigate(-1)}>❮</button>
                <h2>ทำการสั่งซื้อ</h2>
            </div>

            {/* ADDRESS */}
            {deliveryMode === "DELIVERY" && (
                <div className="sh-address-section"
                    onClick={() =>
                        navigate("/address", {
                            state: {
                                items: cartItems,
                                deliveryMode: deliveryMode   // ⭐ ส่งค่าปัจจุบันไปด้วย
                            }
                        })

                    }
                >
                    <div className="address-border"></div>
                    <div className="address-content">
                        <div className="addr-info">
                            <p className="addr-user">ที่อยู่จัดส่ง</p>
                            {selectedAddr ? (
                                <>
                                    <p className="addr-detail">
                                        {selectedAddr.dormName} ห้อง {selectedAddr.room}
                                    </p>
                                    <p className="addr-note">
                                        {selectedAddr.note || "ไม่มีหมายเหตุ"}
                                    </p>
                                </>
                            ) : <p className="addr-none">ยังไม่ได้เลือกที่อยู่</p>}
                        </div>
                        <div className="addr-arrow">❯</div>
                    </div>
                </div>
            )}

            {/* PRODUCT LIST */}
            <div className="sh-card product-list">
                <div className="shop-name">ร้านค้าผู้ขาย</div>
                {cartItems.map((item) => (
                    <div key={item._id} className="sh-item">
                        <img
                            src={item.images?.[0] ? `${API_URL}${item.images[0]}` : ""}
                            alt="product"
                        />
                        <div className="item-detail">
                            <p className="item-title">{item.title}</p>
                            <div className="item-price-qty">
                                <span className="price">
                                    ฿{item.price?.toLocaleString()}
                                </span>
                                <span className="qty">x{item.qty}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* BOTH SELECTOR */}
            {cartItems?.[0]?.deliveryType?.toLowerCase() === "both" && (
                <div className="sh-card">
                    <div className="section-title">รูปแบบการรับสินค้า</div>

                    {!deliveryMode && (
                        <p style={{ color: "red", marginBottom: "12px" }}>
                            กรุณาเลือกรูปแบบการรับสินค้า
                        </p>
                    )}

                    <div className="shipping-methods">
                        <div
                            className={`ship-box ${deliveryMode === "PICKUP" ? "active" : ""}`}
                            onClick={() => setDeliveryMode("PICKUP")}
                        >
                            นัดรับสินค้า
                        </div>

                        <div
                            className={`ship-box ${deliveryMode === "DELIVERY" ? "active" : ""}`}
                            onClick={() => setDeliveryMode("DELIVERY")}
                        >
                            จัดส่ง
                        </div>
                    </div>
                </div>
            )}

            {/* SHIPPING */}
            {deliveryMode === "DELIVERY" && (
                <div className="sh-card shipping-section">
                    <div className="section-title">ตัวเลือกการจัดส่ง</div>
                    <div className="shipping-methods">
                        <div
                            className={`ship-box ${shippingService === "GRAB" ? "active" : ""}`}
                            onClick={() => setShippingService("GRAB")}
                        >
                            Grab - ฿{Math.round(25 + distance * 7)}
                        </div>

                        <div
                            className={`ship-box ${shippingService === "LINEMAN" ? "active" : ""}`}
                            onClick={() => setShippingService("LINEMAN")}
                        >
                            LineMan - ฿{Math.round(20 + distance * 6)}
                        </div>
                    </div>
                </div>
            )}

            {/* COUPON TAB */}
            <div className="sh-card coupon-tab">
                <div className="coupon-tab-row">

                    <div onClick={openCouponModal} style={{ cursor: "pointer" }}>
                        ใช้โค้ดส่วนลด
                    </div>

                    {appliedCoupon ? (
                        <div className="coupon-applied">
                            <span>
                                {appliedCoupon.code} - ลด ฿{discount}
                            </span>

                            <button
                                className="remove-coupon-btn"
                                onClick={handleRemoveCoupon}
                            >
                                ยกเลิก
                            </button>
                        </div>
                    ) : (
                        <div
                            className="coupon-select"
                            onClick={openCouponModal}
                        >
                            เลือกคูปอง ❯
                        </div>
                    )}

                </div>
            </div>

            {/* BILLING */}
            <div className="sh-card billing-section">
                <div className="bill-row">
                    <span>ยอดรวมสินค้า</span>
                    <span>฿{subTotal.toLocaleString()}</span>
                </div>
                <div className="bill-row">
                    <span>ค่าจัดส่ง</span>
                    <span>฿{deliveryFee}</span>
                </div>
                {discount > 0 && (
                    <div className="bill-row discount-row">
                        <span>ส่วนลด ({couponCode})</span>
                        <span className="discount-amount">
                            - ฿{discount.toLocaleString()}
                        </span>
                    </div>
                )}
                <div className="bill-row total">
                    <span>ยอดชำระสุทธิ</span>
                    <span className="total-price">฿{total.toLocaleString()}</span>
                </div>
            </div>

            <div className="sh-footer">
                <div className="footer-total">
                    <p>ยอดชำระเงิน</p>
                    <span className="total-label">฿{total.toLocaleString()}</span>
                </div>
                <button className="order-btn" onClick={handlePlaceOrder}>
                    สั่งซื้อสินค้า
                </button>
            </div>


            {showCouponModal && (
                <div className="coupon-modal-overlay">
                    <div className="coupon-modal">

                        <div className="coupon-header">
                            <h3>เลือกคูปอง</h3>
                            <button onClick={() => setShowCouponModal(false)}>✕</button>
                        </div>

                        {/* กรอกโค้ด */}
                        <div className="coupon-input">
                            <input
                                type="text"
                                placeholder="กรอกรหัสโค้ด"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                            />
                            <button onClick={() => applyCouponCode(couponCode)}>
                                ใช้
                            </button>
                        </div>

                        {/* List คูปอง */}
                        <div className="coupon-list">
                            {availableCoupons
                                .sort((a, b) => {
                                    const aValid = evaluateCoupon(a).usable;
                                    const bValid = evaluateCoupon(b).usable;
                                    return bValid - aValid; // usable ขึ้นก่อน
                                })
                                .map((c) => {
                                    const { usable, reason } = evaluateCoupon(c);

                                    return (
                                        <div
                                            key={c._id}
                                            className={`coupon-item ${!usable ? "disabled" : ""}`}
                                        >
                                            <div>
                                                <strong>{c.code}</strong>

                                                {c.discountType === "PERCENT"
                                                    ? <p>ลด {c.discountValue}%</p>
                                                    : <p>ลด ฿{c.discountValue}</p>
                                                }

                                                <p style={{ color: usable ? "green" : "red" }}>
                                                    {reason}
                                                </p>
                                            </div>

                                            <button
                                                disabled={!usable}
                                                onClick={() => usable && applyCouponCode(c.code)}
                                            >
                                                ใช้
                                            </button>
                                        </div>
                                    );
                                })}

                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default CheckoutPage;