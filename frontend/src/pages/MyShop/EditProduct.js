import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./EditProduct.css";
const API_URL = process.env.REACT_APP_API_URL;



function EditProduct() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [images, setImages] = useState([]);
    const [existingImages, setExistingImages] = useState([]);

    const [form, setForm] = useState({
        title: "",
        description: "",
        price: "",
        category: "",
        quantity: 1,
        deliveryType: "delivery",
        tradeOption: "sell_only",
        lat: "",
        lng: "",
        locationName: "",
        meetupAddress: "",
        status: "pending" // กำหนดเป็น pending รอไว้
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/products/${id}`);
            const data = res.data;

            setForm({
                title: data.title || "",
                description: data.description || "",
                price: data.price || "",
                category: data.category || "",
                quantity: data.quantity || 1,
                deliveryType: data.deliveryType || "delivery",
                tradeOption: data.tradeOption || "sell_only",
                lat: data.lat || "",
                lng: data.lng || "",
                locationName: data.locationName || "",
                meetupAddress: data.meetupAddress || "",
                status: "pending" // เมื่อโหลดมาแก้ไข ให้เตรียมสถานะเป็น pending เสมอ
            });

            setExistingImages(data.images || []);
        } catch (err) {
            console.error(err);
            alert("โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImages((prev) => [...prev, ...files]);
    };

    const removeNewImage = (index) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const removeOldImage = (index) => {
        setExistingImages((prev) => prev.filter((_, i) => i !== index));
    };

    const submit = async (e) => {
        e.preventDefault();

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!form.title || !form.category || !form.locationName) {
            alert("กรุณากรอกข้อมูลที่จำเป็น (ชื่อสินค้า, หมวดหมู่, สถานที่)");
            return;
        }

        try {
            const formData = new FormData();

            // ส่งข้อมูลจาก form (ยกเว้นรูปภาพ)
            Object.keys(form).forEach((key) => {
                if (key === "price") {
                    const priceValue = (form.tradeOption === "trade_allowed") ? 0 : Number(form.price);
                    formData.append("price", priceValue);
                } else if (form[key] !== null && form[key] !== undefined) {
                    formData.append(key, form[key]);
                }
            });

            // ยืนยันสถานะเป็น pending อีกครั้งเพื่อให้ Backend อัปเดตลง DB
            formData.set("status", "pending");

            // ส่งรายชื่อรูปเดิมที่ยังเก็บไว้
            formData.append("existingImages", JSON.stringify(existingImages));

            // เพิ่มรูปใหม่ (ถ้ามี)
            images.forEach((img) => {
                formData.append("images", img);
            });

            const token = localStorage.getItem("token");
            await axios.put(
                `${API_URL}/api/products/${id}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "multipart/form-data"
                    }
                }
            );

            alert("อัปเดตข้อมูลสำเร็จ (กรุณากด 'ลงขาย' อีกครั้งในหน้าคลังสินค้า)");
            navigate("/my-shop");

        } catch (err) {
            console.error("Update Error:", err.response?.data || err.message);
            alert(`อัปเดตไม่สำเร็จ: ${err.response?.data?.message || "เกิดข้อผิดพลาดภายในระบบ"}`);
        }
    };

    if (loading) return <div className="edit-page">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="edit-page">
            <h2>แก้ไขสินค้า</h2>
            <form onSubmit={submit} className="edit-form">
                <div className="form-group">
                    <label>ชื่อสินค้า</label>
                    <input name="title" value={form.title} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label>รายละเอียดสินค้า</label>
                    <textarea name="description" value={form.description} onChange={handleChange} />
                </div>

                <div className="image-section">
                    <h4>รูปปัจจุบัน</h4>
                    <div className="image-preview">
                        {existingImages.map((img, index) => (
                            <div key={index} className="image-card">
                                <img src={`${API_URL}${img}`} alt="old" />
                                <button type="button" onClick={() => removeOldImage(index)}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="image-section">
                    <h4>เพิ่มรูปใหม่</h4>
                    <input type="file" multiple onChange={handleImageChange} />
                    <div className="image-preview">
                        {images.map((img, index) => (
                            <div key={index} className="image-card">
                                <img src={URL.createObjectURL(img)} alt="new" />
                                <button type="button" onClick={() => removeNewImage(index)}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>

                {(form.tradeOption !== "trade_allowed") && (
                    <div className="form-group">
                        <label>ราคา (บาท)</label>
                        <input name="price" type="number" value={form.price} onChange={handleChange} />
                    </div>
                )}

                <div className="form-group">
                    <label>จำนวนสินค้า</label>
                    <input name="quantity" type="number" value={form.quantity} onChange={handleChange} />
                </div>

                <div className="form-group">
                    <label>หมวดหมู่</label>
                    <select name="category" value={form.category} onChange={handleChange}>
                        <option value="">-- เลือกหมวดหมู่ --</option>
                        <option value="เสื้อผ้า">เสื้อผ้า</option>
                        <option value="เครื่องใช้ไฟฟ้า">เครื่องใช้ไฟฟ้า</option>
                        <option value="หนังสือ">หนังสือ</option>
                        <option value="เฟอร์นิเจอร์">เฟอร์นิเจอร์</option>
                        <option value="อุปกรณ์การเรียน">อุปกรณ์การเรียน</option>
                        <option value="อาหาร">อาหาร</option>
                        <option value="อุปกรณ์สัตว์เลี้ยง">อุปกรณ์สัตว์เลี้ยง</option>
                        <option value="อุปกรณ์อิเล็กทรอนิกส์">อุปกรณ์อิเล็กทรอนิกส์</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>รูปแบบการจัดส่ง</label>
                    <select name="deliveryType" value={form.deliveryType} onChange={handleChange}>
                        <option value="delivery">จัดส่งเท่านั้น</option>
                        <option value="meetup">นัดรับเท่านั้น</option>
                        <option value="both">จัดส่งหรือนัดรับ</option>
                    </select>
                </div>
                {(form.deliveryType === "meetup" ||
                    form.deliveryType === "both") && (
                        <div className="form-group">
                            <label>ที่อยู่หอพัก / จุดนัดรับ</label>
                            <input
                                name="meetupAddress"
                                value={form.meetupAddress}
                                onChange={handleChange}
                                placeholder="เช่น หอ A ห้อง 203 หรือ หน้าอาคารเรียน"
                            />
                        </div>
                    )}

                <div className="form-group">
                    <label>ตัวเลือกการขาย</label>
                    <select name="tradeOption" value={form.tradeOption} onChange={handleChange}>
                        <option value="sell_only">ขายเท่านั้น</option>
                        <option value="trade_allowed">รับแลกเท่านั้น</option>
                        <option value="negotiable">รับแลก / ต่อรองได้</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>ชื่อสถานที่</label>
                    <input name="locationName" value={form.locationName} onChange={handleChange} required />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Latitude</label>
                        <input name="lat" type="number" step="any" value={form.lat} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Longitude</label>
                        <input name="lng" type="number" step="any" value={form.lng} onChange={handleChange} />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => navigate(-1)}>ยกเลิก</button>
                    <button type="submit" className="save-btn">บันทึกการแก้ไข</button>
                </div>
            </form>
        </div>
    );
}

export default EditProduct;