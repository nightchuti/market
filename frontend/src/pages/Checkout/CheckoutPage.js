import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./CheckoutPage.css";
import { useLocation } from "react-router-dom";

const API_URL = "http://127.0.0.1:5000";

const CheckoutPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const selectedItems = location.state?.items || [];

    const [cartItems, setCartItems] = useState(selectedItems);
    const [addresses, setAddresses] = useState([]);
    const [selectedAddr, setSelectedAddr] = useState(null);
    const [shippingService, setShippingService] = useState("GRAB");
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [loading, setLoading] = useState(true);
    const [deliveryMode, setDeliveryMode] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("PROMPTPAY");
    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);
    const [distance, setDistance] = useState(0);


    useEffect(() => {
        if (!location.state?.items || location.state.items.length === 0) {
            navigate("/cart");
        }
    }, [location.state, navigate]);

    // ================= FETCH ADDRESS ONLY =================
    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const addrRes = await axios.get(`${API_URL}/api/address`, { headers });

            setAddresses(addrRes.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ================= SET DEFAULT ADDRESS =================
    useEffect(() => {
        if (addresses.length > 0 && !selectedAddr) {
            const defaultAddr =
                addresses.find(a => a.isDefault) || addresses[0];
            setSelectedAddr(defaultAddr);
        }
    }, [addresses, selectedAddr]);

    // ================= DETERMINE DELIVERY MODE =================
    useEffect(() => {
        if (cartItems.length > 0) {
            const type = cartItems[0].deliveryType;

            if (type === "PICKUP") setDeliveryMode("PICKUP");
            else if (type === "DELIVERY") setDeliveryMode("DELIVERY");
            else setDeliveryMode("DELIVERY"); // default
        }
    }, [cartItems]);

    // ================= CALCULATE DELIVERY FEE =================
    useEffect(() => {
        if (deliveryMode === "DELIVERY" && selectedAddr) {
            // mock ค่าส่งแบบง่าย
            const fee = shippingService === "GRAB" ? 40 : 35;
            setDeliveryFee(fee);
        } else {
            setDeliveryFee(0);
        }
    }, [deliveryMode, selectedAddr, shippingService]);

    // ================= CALCULATE TOTAL =================
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
            if (!selectedAddr && deliveryMode === "DELIVERY")
                return alert("กรุณาเลือกที่อยู่จัดส่ง");

            if (deliveryMode === "PICKUP" && paymentMethod === "COD")
                return alert("นัดรับสินค้าไม่สามารถเก็บเงินปลายทางได้");

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
                totalPrice: total
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
            {/* 1. Header */}
            <div className="sh-header">
                <button className="back-btn" onClick={() => navigate(-1)}>❮</button>
                <h2>ทำการสั่งซื้อ</h2>
            </div>

            {/* 2. ที่อยู่ (Shopee Style: มีเส้นประสีแดง-น้ำเงินกั้นด้านบน/ล่าง) */}
            <div className="sh-address-section" onClick={() => navigate("/address")}>
                <div className="address-border"></div>
                <div className="address-content">
                    <div className="addr-info">
                        <p className="addr-user">ที่อยู่จัดส่ง</p>
                        {selectedAddr ? (
                            <>
                                <p className="addr-detail">{selectedAddr.dormName} ห้อง {selectedAddr.room}</p>
                                <p className="addr-note">{selectedAddr.note || "ไม่มีหมายเหตุ"}</p>
                            </>
                        ) : <p className="addr-none">ยังไม่ได้เลือกที่อยู่</p>}
                    </div>
                    <div className="addr-arrow">❯</div>
                </div>
            </div>

            {/* 3. รายการสินค้า */}
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

            {/* เลือกประเภทการรับสินค้า */}
            {cartItems?.[0]?.deliveryType === "BOTH" && (
                <div className="sh-card">
                    <div className="section-title">รูปแบบการรับสินค้า</div>
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


            {/* 4. ตัวเลือกขนส่ง */}
            {deliveryMode === "DELIVERY" && (
                <div className="sh-card shipping-section">
                    <div className="section-title">ตัวเลือกการจัดส่ง</div>
                    <div className="shipping-methods">
                        <div
                            className={`ship-box ${shippingService === "GRAB" ? "active" : ""
                                }`}
                            onClick={() => setShippingService("GRAB")}
                        >
                            <div className="ship-name">Grab</div>
                            <div className="ship-fee">฿{Math.round(25 + distance * 7)}</div>
                        </div>

                        <div
                            className={`ship-box ${shippingService === "LINEMAN" ? "active" : ""
                                }`}
                            onClick={() => setShippingService("LINEMAN")}
                        >
                            <div className="ship-name">LineMan</div>
                            <div className="ship-fee">฿{Math.round(20 + distance * 6)}</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="sh-card">
                <div className="section-title">คูปองส่วนลด</div>
                <div className="coupon-box">
                    <input
                        type="text"
                        placeholder="กรอกรหัสคูปอง"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                    />
                    <button
                        onClick={() => {
                            if (couponCode === "SAVE50") {
                                setDiscount(50);
                            } else {
                                alert("คูปองไม่ถูกต้อง");
                            }
                        }}
                    >
                        ใช้คูปอง
                    </button>
                </div>
                {discount > 0 && (
                    <p className="discount-text">- ฿{discount}</p>
                )}
            </div>

            {/* ช่องทางชำระเงิน */}
            <div className="sh-card">
                <div className="section-title">ช่องทางชำระเงิน</div>

                <div className="payment-methods">

                    <div
                        className={`pay-box ${paymentMethod === "PROMPTPAY" ? "active" : ""}`}
                        onClick={() => setPaymentMethod("PROMPTPAY")}
                    >
                        โอนผ่าน PromptPay
                    </div>

                    {deliveryMode === "DELIVERY" && (
                        <div
                            className={`pay-box ${paymentMethod === "COD" ? "active" : ""}`}
                            onClick={() => setPaymentMethod("COD")}
                        >
                            เก็บเงินปลายทาง (COD)
                        </div>
                    )}

                    <div
                        className={`pay-box ${paymentMethod === "WALLET" ? "active" : ""}`}
                        onClick={() => setPaymentMethod("WALLET")}
                    >
                        กระเป๋าเงินในระบบ
                    </div>

                </div>
            </div>


            {/* 5. สรุปยอดเงิน */}
            <div className="sh-card billing-section">
                <div className="bill-row"><span>ยอดรวมสินค้า</span><span>฿{subTotal.toLocaleString()}</span></div>
                <div className="bill-row"><span>ค่าจัดส่ง</span><span>฿{deliveryFee}</span></div>
                <div className="bill-row total">
                    <span>ยอดชำระสุทธิ</span>
                    <span className="total-price">฿{total.toLocaleString()}</span>
                </div>
            </div>

            {/* 6. ปุ่มสั่งซื้อ Sticky Footer */}
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