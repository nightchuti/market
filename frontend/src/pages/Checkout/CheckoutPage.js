import { useState, useEffect, useCallback } from "react";
import api from "../../api";
import { useNavigate, useLocation } from "react-router-dom";
import "./CheckoutPage.css";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedItems = location.state?.items || [];

  // ================= STATE =================
  const [cartItems] = useState(selectedItems);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(null);

  const [deliveryMode, setDeliveryMode] = useState(
    location.state?.deliveryMode || ""
  );

  const [deliveryFee, setDeliveryFee] = useState(0);
  const [distance, setDistance] = useState(0);
  const [loading, setLoading] = useState(true);

  const [discount, setDiscount] = useState(0);
  //const [appliedCoupon, setAppliedCoupon] = useState(null);
const [appliedCoupon] = useState(null);

  // ================= REDIRECT IF EMPTY =================
  useEffect(() => {
    if (!location.state?.items || location.state.items.length === 0) {
      navigate("/cart");
    }
  }, [location.state, navigate]);

  // ================= FETCH ADDRESS =================
  const fetchData = useCallback(async () => {
    try {
      const addrRes = await api.get("/api/address");
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
      const defaultAddr =
        addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddr(defaultAddr);
    }
  }, [addresses]);

  // ================= DETERMINE DELIVERY MODE =================
  useEffect(() => {
    if (cartItems.length > 0) {
      const type = cartItems[0]?.deliveryType?.toLowerCase();

      if (type === "meetup") setDeliveryMode("PICKUP");
      else if (type === "delivery") setDeliveryMode("DELIVERY");
    }
  }, [cartItems]);

  // ================= MOCK DISTANCE =================
  useEffect(() => {
    if (deliveryMode === "DELIVERY" && selectedAddr) {
      setDistance(2.5);
    }
  }, [deliveryMode, selectedAddr]);

  // ================= CALCULATE DELIVERY FEE =================
  useEffect(() => {
    if (deliveryMode === "DELIVERY" && selectedAddr) {
      const fee = Math.round(25 + distance * 7);
      setDeliveryFee(fee);
    } else {
      setDeliveryFee(0);
    }
  }, [deliveryMode, selectedAddr, distance]);

  // ================= TOTAL =================
  const subTotal = cartItems.reduce(
    (sum, i) => sum + i.price * i.qty,
    0
  );

  const total = Math.max(0, subTotal + deliveryFee - discount);

  useEffect(() => {
    setDiscount(0);
  }, [subTotal]);

  if (loading)
    return <div className="loading">กำลังเตรียมคำสั่งซื้อ...</div>;

  // ================= PLACE ORDER =================
  const handlePlaceOrder = async () => {
    try {
      if (deliveryMode === "DELIVERY" && !selectedAddr)
        return alert("กรุณาเลือกที่อยู่จัดส่ง");

      const orderData = {
        items: cartItems.map((item) => ({
          product: item.product?._id || item._id,
          quantity: item.quantity || item.qty,
          price: item.price
        })),
        shippingAddress:
          deliveryMode === "PICKUP"
            ? null
            : {
                dormName: selectedAddr.dormName,
                room: selectedAddr.room,
                note: selectedAddr.note
              },
        deliveryMode,
        paymentMethod: "PROMPTPAY",
        subTotal,
        deliveryFee,
        totalPrice: total,
        couponCode: appliedCoupon ? appliedCoupon.code : null
      };

      const res = await api.post("/api/orders/checkout", orderData);

      if (res.data.success) {
        alert("สั่งซื้อสำเร็จ!");
        navigate(`/payment/${res.data.order._id}`);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  // ================= UI =================
  return (
    <div className="shopee-checkout">
      <h2>ยืนยันคำสั่งซื้อ</h2>

      {cartItems.map((item) => (
        <div key={item._id} className="checkout-item">
          <p>{item.title}</p>
          <p>฿{item.price}</p>
        </div>
      ))}

      <hr />

      <p>ค่าสินค้า: ฿{subTotal}</p>
      <p>ค่าส่ง: ฿{deliveryFee}</p>
      <h3>รวมทั้งหมด: ฿{total}</h3>

      <button className="btn-main" onClick={handlePlaceOrder}>
        ยืนยันสั่งซื้อ
      </button>
    </div>
  );
};

export default CheckoutPage;
