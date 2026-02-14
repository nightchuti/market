import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./CheckoutPage.css";
import { useLocation } from "react-router-dom";

const API_URL = "http://127.0.0.1:5000";

const CheckoutPage = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [selectedAddr, setSelectedAddr] = useState(null);
    const [shippingService, setShippingService] = useState("GRAB");
    const [distance, setDistance] = useState(0);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [loading, setLoading] = useState(true);
    const [deliveryMode, setDeliveryMode] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("PROMPTPAY");

    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);


    // ดึงข้อมูลเบื้องต้น
    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            const [cartRes, addrRes] = await Promise.all([
                axios.get(`${API_URL}/api/cart`, { headers }),
                axios.get(`${API_URL}/api/address`, { headers })
            ]);
            setCart(cartRes.data);
            setAddresses(addrRes.data);
            setSelectedAddr(addrRes.data.find(a => a.isDefault) || addrRes.data[0]);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (cart?.items?.length > 0) {
            const type = cart.items[0].product.deliveryType;

            if (type === "PICKUP") {
                setDeliveryMode("PICKUP");
            } else if (type === "DELIVERY") {
                setDeliveryMode("DELIVERY");
            } else {
                setDeliveryMode(null); // ให้ผู้ใช้เลือก
            }
        }
    }, [cart]);

    const location = useLocation();

    useEffect(() => {
        if (location.state?.selectedAddress) {
            setSelectedAddr(location.state.selectedAddress);
        }
    }, [location.state]);


    useEffect(() => { fetchData(); }, [fetchData]);

    // คำนวณระยะทางและค่าส่ง
    useEffect(() => {
        if (
            deliveryMode === "DELIVERY" &&
            selectedAddr &&
            cart?.items?.length > 0
        ) {
            const shopLat = cart.items[0].product.lat || 14.0235;
            const shopLng = cart.items[0].product.lng || 99.9744;

            const R = 6371;
            const dLat = (selectedAddr.lat - shopLat) * Math.PI / 180;
            const dLng = (selectedAddr.lng - shopLng) * Math.PI / 180;

            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(shopLat * Math.PI / 180) *
                Math.cos(selectedAddr.lat * Math.PI / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);

            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = R * c;

            let fee =
                shippingService === "GRAB"
                    ? Math.round(25 + dist * 7)
                    : Math.round(20 + dist * 6);

            setDeliveryFee(fee);
        } else {
            setDeliveryFee(0);
        }
    }, [deliveryMode, selectedAddr, shippingService, cart]);


    const subTotal = cart?.items?.reduce((sum, i) => sum + (i.product.price * i.quantity), 0) || 0;
    const total = subTotal + deliveryFee - discount;


    if (loading) return <div className="loading">กำลังเตรียมคำสั่งซื้อ...</div>;

    // ฟังก์ชันสำหรับส่งข้อมูลไปบันทึกใน Database
    const handlePlaceOrder = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!selectedAddr) return alert("กรุณาเลือกที่อยู่จัดส่ง");

            if (deliveryMode === "PICKUP" && paymentMethod === "COD") {
                return alert("นัดรับสินค้าไม่สามารถเก็บเงินปลายทางได้");
            }

            const orderData = {
                items: cart.items.map(i => ({
                    product: i.product._id,
                    quantity: i.quantity,
                    price: i.product.price
                })),

                shippingAddress: deliveryMode === "DELIVERY" ? {
                    dormName: selectedAddr.dormName,
                    room: selectedAddr.room,
                    note: selectedAddr.note,
                    lat: selectedAddr.lat,
                    lng: selectedAddr.lng
                } : null,

                deliveryMode: deliveryMode,        // 🆕 เพิ่ม
                deliveryFee: deliveryFee,
                shippingService: deliveryMode === "DELIVERY" ? shippingService : null,

                couponCode: couponCode,            // 🆕 เพิ่ม
                discount: discount,                // 🆕 เพิ่ม

                paymentMethod: paymentMethod,
                subTotal: subTotal,
                totalPrice: total                  // 🆕 ใช้ total ใหม่ที่หักส่วนลดแล้ว
            };


            const res = await axios.post(`${API_URL}/api/orders`, orderData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // เมื่อสั่งสำเร็จ ให้ไปหน้าชำระเงิน หรือหน้าประวัติคำสั่งซื้อ
            alert("สั่งซื้อสำเร็จ!");
            navigate(`/profile`); // หรือ navigate(`/payment/${res.data._id}`)

        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "เกิดข้อผิดพลาดในการสั่งซื้อ");
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
                    <div className="addr-icon">📍</div>
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
                <div className="shop-name">🏪 ร้านค้าผู้ขาย</div>
                {cart?.items.map((item) => (
                    <div key={item._id} className="sh-item">
                        <img src={`${API_URL}${item.product.images[0]}`} alt="product" />
                        <div className="item-detail">
                            <p className="item-title">{item.product.title}</p>
                            <div className="item-price-qty">
                                <span className="price">฿{item.product.price.toLocaleString()}</span>
                                <span className="qty">x{item.quantity}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* เลือกประเภทการรับสินค้า */}
            {cart?.items[0]?.product.deliveryType === "BOTH" && (
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