import { useState } from "react";
import api from "../api";

export default function PlaceOrderPage({
    cartItems,
    subTotal,
    deliveryFee,
    discount,
    couponCode,
    token
}) {

    const [loading, setLoading] = useState(false);
    const finalTotal = subTotal + deliveryFee - discount;

    const handlePlaceOrder = async () => {
        try {
            setLoading(true);

            const res = await api.post(
                "/api/orders",
                {
                    items: cartItems,
                    subTotal,
                    deliveryFee,
                    discount,
                    couponCode,
                    total: finalTotal
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            alert("สั่งซื้อสำเร็จ 🎉");
            console.log(res.data);

        } catch (err) {
            alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="place-order-container">

            <h2>ยืนยันคำสั่งซื้อ</h2>

            {/* รายการสินค้า */}
            <div className="order-items">
                {cartItems.map(item => (
                    <div key={item._id} className="order-item">
                        <span>{item.name}</span>
                        <span>x{item.qty}</span>
                        <span>฿{item.price * item.qty}</span>
                    </div>
                ))}
            </div>

            {/* สรุปยอด */}
            <div className="order-summary">
                <div>
                    <span>ยอดสินค้า</span>
                    <span>฿{subTotal}</span>
                </div>

                <div>
                    <span>ค่าจัดส่ง</span>
                    <span>฿{deliveryFee}</span>
                </div>

                {discount > 0 && (
                    <div className="discount-row">
                        <span>ส่วนลด ({couponCode})</span>
                        <span>- ฿{discount}</span>
                    </div>
                )}

                <hr />

                <div className="final-total">
                    <strong>ยอดสุทธิ</strong>
                    <strong>฿{finalTotal}</strong>
                </div>
            </div>

            <button
                className="place-order-btn"
                onClick={handlePlaceOrder}
                disabled={loading}
            >
                {loading ? "กำลังดำเนินการ..." : "สั่งซื้อสินค้า"}
            </button>

        </div>
    );
}
