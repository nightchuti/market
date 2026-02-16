import { useState, useEffect, useCallback } from "react";
import api from "../../api";
import { useNavigate, useLocation } from "react-router-dom";
import "./CheckoutPage.css";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedItems = location.state?.items || [];

  const [cartItems, setCartItems] = useState(selectedItems);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(null);

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

      if (location.state?.selectedAddressId) {
        const updated = addresses.find(
          addr => addr._id === location.state.selectedAddressId
        );
        if (updated) setSelectedAddr(updated);
      }

      if (location.state?.deliveryMode) {
        setDeliveryMode(location.state.deliveryMode);
      }
    }
  }, [addresses, location.state]);

  // ================= DETERMINE DELIVERY MODE =================
  useEffect(() => {
    if (cartItems.length > 0) {
      const type = cartItems[0]?.deliveryType?.toLowerCase();

      if (type === "meetup") setDeliveryMode("PICKUP");
      else if (type === "delivery") setDeliveryMode("DELIVERY");
      else if (type === "both") setDeliveryMode(prev => prev || "");
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
      let fee = shippingService === "GRAB"
        ? Math.round(25 + distance * 7)
        : Math.round(20 + distance * 6);

      setDeliveryFee(fee);
    } else {
      setDeliveryFee(0);
    }
  }, [deliveryMode, selectedAddr, shippingService, distance]);

  // ================= RECEIVE ADDRESS =================
  useEffect(() => {
    if (addresses.length > 0) {

      if (location.state?.selectedAddressId) {
        const updated = addresses.find(
          addr => addr._id === location.state.selectedAddressId
        );
        if (updated) {
          setSelectedAddr(updated);
          return;
        }
      }

      const defaultAddr =
        addresses.find(a => a.isDefault) || addresses[0];

      setSelectedAddr(defaultAddr);
    }
  }, [addresses, location.state]);

  // ================= COUPONS =================
  const fetchCoupons = async () => {
    try {
      const res = await api.get("/api/coupons/my");
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
      const res = await api.post("/api/coupons/check", {
        code,
        subTotal
      });

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

    if (coupon.isAlreadyUsed) return { usable: false, reason: "ใช้แล้ว" };
    if (coupon.isFull) return { usable: false, reason: "โควตาเต็ม" };
    if (subTotal < coupon.minSpend)
      return { usable: false, reason: `ขั้นต่ำ ฿${coupon.minSpend}` };

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

  // ================= PLACE ORDER =================
  const handlePlaceOrder = async () => {
    try {

      const type = cartItems[0]?.deliveryType?.toLowerCase();

      if (type === "both" && !deliveryMode)
        return alert("กรุณาเลือกรูปแบบการรับสินค้า");

      if (deliveryMode === "DELIVERY" && !selectedAddr)
        return alert("กรุณาเลือกที่อยู่จัดส่ง");

      if (deliveryMode === "PICKUP" && paymentMethod === "COD")
        return alert("นัดรับสินค้าไม่สามารถเก็บเงินปลายทางได้");

      const orderData = {
        items: cartItems.map(item => ({
          product: item.product?._id || item._id,
          quantity: item.quantity || item.qty,
          price: item.price
        })),
        shippingAddress: deliveryMode === "PICKUP" ? null : {
          dormName: selectedAddr.dormName,
          room: selectedAddr.room,
          note: selectedAddr.note
        },
        deliveryMode,
        paymentMethod,
        subTotal,
        deliveryFee,
        totalPrice: total,
        couponCode: appliedCoupon ? appliedCoupon.code : null
      };

      const res = await api.post("/api/orders/checkout", orderData);

      if (res.data.success) {
        alert("สั่งซื้อสำเร็จ!");

        if (paymentMethod === "PROMPTPAY") {
          navigate(`/payment/${res.data.order._id}`);
        } else {
          navigate("/profile");
        }
      }

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="shopee-checkout">
      {/* UI เหมือนเดิมทั้งหมด */}
    </div>
  );
};

export default CheckoutPage;
