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



    // ================= TOTAL =================
    const subTotal = cartItems.reduce(
        (sum, i) => sum + (i.price * i.qty),
        0
    );

    const total = subTotal + deliveryFee - discount;

    if (loading) return <div className="loading">กำลังเตรียมคำสั่งซื้อ...</div>;

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

            let initialStatus = "PENDING_PAYMENT";
            if (deliveryMode === "PICKUP") {
                initialStatus = "WAITING_MEETUP";
            }

            const orderData = {
                items: cartItems.map(i => ({
                    product: i._id,
                    quantity: i.qty,
                    price: i.price
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
                deliveryFee,
                shippingService:
                    deliveryMode === "DELIVERY" ? shippingService : null,
                couponCode,
                discount,
                paymentMethod,
                subTotal,
                totalPrice: total,
                status: initialStatus
            };

            await axios.post(`${API_URL}/api/orders`, orderData, {
                headers: { Authorization: `Bearer ${token}` }
            });

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
                        <p style={{ color: "red" }}>
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

        </div>
    );
};

export default CheckoutPage;
