import { useEffect, useState } from "react";
import axios from "axios";
import "./Cart.css";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL;

function Cart() {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    fetchCart();
  }, [navigate]);

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(`${API_URL}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCart(res.data || { items: [] });
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // ================= UPDATE QUANTITY =================
  const updateQuantity = async (itemId, newQty, maxQty) => {
    if (newQty < 1) return;

    if (newQty > maxQty) {
      alert(`สินค้าเหลือเพียง ${maxQty} ชิ้น`);
      return;
    }

    const token = localStorage.getItem("token");

    await axios.put(
      `${API_URL}/api/cart/update/${itemId}`,
      { quantity: newQty },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    fetchCart();
  };

  // ================= REMOVE ONE ITEM =================
  const removeItem = async (itemId) => {
    const confirmDelete = window.confirm("คุณต้องการลบสินค้านี้หรือไม่?");

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `${API_URL}/api/cart/remove/${itemId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      fetchCart();

    } catch (err) {
      alert("ลบสินค้าไม่สำเร็จ");
    }
  };


  // ================= SELECT ITEM =================
  const toggleSelect = async (itemId) => {
    const token = localStorage.getItem("token");

    await axios.put(
      `${API_URL}/api/cart/select/${itemId}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    fetchCart();
  };

  // ================= SELECT ALL =================
  const selectAll = async (value) => {
    const token = localStorage.getItem("token");

    await axios.put(
      `${API_URL}/api/cart/select-all`,
      { selected: value },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    fetchCart();
  };


  // ================= REMOVE SELECTED =================
  const removeSelected = async () => {
    const token = localStorage.getItem("token");

    const selectedItems = cart.items.filter(i => i.selected === true);

    // ❌ ถ้าไม่เลือกอะไร
    if (selectedItems.length === 0) {
      alert("กรุณาเลือกสินค้าที่ต้องการลบ");
      return;
    }

    // ✅ ยืนยันก่อนลบ
    const confirmDelete = window.confirm(
      `คุณต้องการลบสินค้า ${selectedItems.length} รายการหรือไม่?`
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/api/cart/remove-selected`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchCart();

    } catch (err) {
      alert("ลบไม่สำเร็จ");
    }
  };


  // ================= CHECKOUT =================
  const goToCheckout = () => {
    const selectedItems = cart.items.filter(item => item.selected);

    if (selectedItems.length === 0) {
      alert("กรุณาเลือกสินค้าก่อนสั่งซื้อ");
      return;
    }

    navigate("/checkout", {
      state: {
        items: selectedItems.map(item => ({
          _id: item.product._id,
          title: item.product.title,
          price: item.product.price,
          images: item.product.images,
          qty: item.quantity,
          deliveryType: item.product.deliveryType // ⭐ เพิ่มบรรทัดนี้
        }))
      }
    });
  };



  const selectedItems = cart.items.filter(i => i.selected);

  const total = selectedItems.reduce(
    (sum, item) =>
      sum + (item.product?.price || 0) * item.quantity,
    0
  );

  if (loading) return <p className="loading">กำลังโหลดตะกร้า...</p>;

  return (
    <div className="cart-page">
      <h2>ตะกร้าของฉัน</h2>

      {cart.items.length === 0 ? (
        <div className="empty-cart">
          <p>ยังไม่มีสินค้าในตะกร้า</p>
          <button onClick={() => navigate("/products")}>
            ไปเลือกสินค้า
          </button>
        </div>
      ) : (
        <>
          <div className="cart-top">
            <label >
              <input
                type="checkbox"
                className="selectAllCheckbox"
                checked={
                  selectedItems.length === cart.items.length &&
                  cart.items.length > 0
                }
                onChange={(e) => selectAll(e.target.checked)}
              />
              <span className="selectAllText">เลือกทั้งหมด</span>
            </label>

            <button
              className="remove-btn"
              onClick={removeSelected}
            >
              ลบที่เลือก
            </button>
          </div>
          <div className="cart-list">
            {cart.items.map(item => {
              // ตรวจสอบว่า item.product มีค่าหรือไม่ก่อนที่จะเข้าถึง properties ต่าง ๆ
              const product = item.product || {}; // หาก product เป็น null/undefined ให้ fallback เป็น empty object
              const img = product.images?.[0] ? `${API_URL}${product.images[0]}` : "/images/default-avatar.png";

              const isOutOfStock = product.quantity === 0;

              return (
                <div key={item._id} className="cart-item">

                  <input
                    type="checkbox"
                    checked={!!item.selected}
                    onChange={() => toggleSelect(item._id)}
                  />

                  <img src={img} alt="" />

                  <div className="item-info">
                    <h4>{product?.title || "สินค้าหายไป"}</h4> {/* แสดงข้อความ fallback ถ้าไม่มี title */}
                    <p className="price">
                      ฿{product?.price?.toLocaleString() || "0.00"}
                    </p>

                    {isOutOfStock ? (
                      <p className="out-stock">สินค้าหมด</p>
                    ) : (
                      <>
                        <div className="qty-control">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item._id,
                                item.quantity - 1,
                                product.quantity
                              )
                            }
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            disabled={item.quantity >= product.quantity}
                            onClick={() =>
                              updateQuantity(
                                item._id,
                                item.quantity + 1,
                                product.quantity
                              )
                            }
                          >
                            +
                          </button>
                        </div>

                        <p className="stock">
                          เหลือ {product.quantity} ชิ้น
                        </p>
                      </>
                    )}
                  </div>

                  <div className="item-total">
                    ฿{(product?.price * item.quantity).toLocaleString() || "0.00"}
                  </div>

                  <button
                    className="delete-one"
                    onClick={() => removeItem(item._id)}
                  >
                    ลบ
                  </button>

                </div>
              );
            })}

          </div>

          <div className="cart-summary">
            <div>
              <span>สินค้าที่เลือก:</span>
              <span>{selectedItems.length}</span>
            </div>

            <div className="total-price">
              <span>ยอดรวม:</span>
              <span>฿{total.toLocaleString()}</span>
            </div>

            <button
              className="checkout-btn"
              disabled={selectedItems.length === 0}
              onClick={goToCheckout}
            >
              ดำเนินการสั่งซื้อ
            </button>


          </div>
        </>
      )}
    </div>
  );
}

export default Cart;
