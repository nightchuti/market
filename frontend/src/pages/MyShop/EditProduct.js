import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./EditProduct.css";

const API_URL = "http://localhost:5000";

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products/${id}`);
      setProduct(res.data);
    } catch {
      alert("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProduct({
      ...product,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.put(
        `${API_URL}/api/products/${id}`,
        product,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      alert("อัปเดตข้อมูลสำเร็จ");
      navigate("/myshop");
    } catch {
      alert("อัปเดตไม่สำเร็จ");
    }
  };

  if (loading) return <div className="loading">กำลังโหลด...</div>;
  if (!product) return <div>ไม่พบสินค้า</div>;

  return (
    <div className="edit-page">
      <div className="edit-card">

        <h2>แก้ไขสินค้า</h2>

        <form onSubmit={handleSubmit} className="edit-form">

          <div className="form-group full">
            <label>ชื่อสินค้า</label>
            <input
              type="text"
              name="title"
              value={product.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>ราคา (บาท)</label>
            <input
              type="number"
              name="price"
              value={product.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>จำนวนสินค้า</label>
            <input
              type="number"
              name="quantity"
              value={product.quantity}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>ประเภทขาย</label>
            <select
              name="tradeOption"
              value={product.tradeOption}
              onChange={handleChange}
            >
              <option value="sell_only">ขายเท่านั้น</option>
              <option value="trade_allowed">รับแลกเท่านั้น</option>
              <option value="negotiable">รับแลกหรือซื้อ</option>
            </select>
          </div>

          <div className="form-group">
            <label>การจัดส่ง</label>
            <select
              name="deliveryType"
              value={product.deliveryType}
              onChange={handleChange}
            >
              <option value="meetup">นัดรับ</option>
              <option value="delivery">จัดส่ง</option>
              <option value="both">ทั้งสองแบบ</option>
            </select>
          </div>

          <div className="form-group">
            <label>สถานะสินค้า</label>
            <select
              name="status"
              value={product.status}
              onChange={handleChange}
            >
              <option value="available">พร้อมขาย</option>
              <option value="sold">ขายแล้ว</option>
            </select>
          </div>

          <div className="form-group full">
            <label>รายละเอียดสินค้า</label>
            <textarea
              name="description"
              rows="4"
              value={product.description}
              onChange={handleChange}
            />
          </div>

          <div className="button-row">
            <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>
              ยกเลิก
            </button>

            <button type="submit" className="btn-save">
              บันทึกการแก้ไข
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default EditProduct;
