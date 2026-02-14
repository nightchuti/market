import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./EditProduct.css";

const API_URL = "http://localhost:5000";

function EditProduct() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [images, setImages] = useState([]);        // รูปใหม่ที่เพิ่ม
    const [existingImages, setExistingImages] = useState([]); // รูปเดิมจาก DB

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
        status: "pending"
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProduct();
    }, []);

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
                status: "pending"
            });

            setExistingImages(data.images || []);

        } catch {
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

        const mustHavePrice =
            form.tradeOption === "sell_only" ||
            form.tradeOption === "negotiable";

        if (
            !form.title ||
            !form.category ||
            !form.deliveryType ||
            !form.tradeOption ||
            !form.locationName ||
            form.quantity === "" ||
            (mustHavePrice && !form.price)
        ) {
            alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
            return;
        }

        if (mustHavePrice && Number(form.price) <= 0) {
            alert("ราคาต้องมากกว่า 0");
            return;
        }

        try {
            const formData = new FormData();

            Object.keys(form).forEach((key) => {
                if (key === "price") {
                    formData.append(
                        "price",
                        form.tradeOption === "trade_allowed"
                            ? 0
                            : Number(form.price)
                    );
                } else {
                    formData.append(key, form[key]);
                }
            });

            formData.set("status", "pending");

            // ส่งรูปเดิมที่ยังเหลือ
            formData.append("existingImages", JSON.stringify(existingImages));

            // เพิ่มรูปใหม่
            images.forEach((img) => {
                formData.append("images", img);
            });

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

            alert("อัปเดตข้อมูลสำเร็จ");
            navigate("/myshop");

        } catch (err) {
            console.error(err.response?.data || err);
            alert("อัปเดตไม่สำเร็จ");
        }
    };

    if (loading) return <div>กำลังโหลด...</div>;

    return (
        <div className="edit-page">
            <h2>แก้ไขสินค้า</h2>

            <form onSubmit={submit} className="edit-form">

                <div className="form-group">
                    <label>ชื่อสินค้า</label>
                    <input
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label>รายละเอียดสินค้า</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                    />
                </div>

                {/* ===== รูปเดิม ===== */}
                <div className="image-section">
                    <h4>รูปปัจจุบัน</h4>
                    <div className="image-preview">
                        {existingImages.map((img, index) => (
                            <div key={index} className="image-card">
                                <img src={`${API_URL}/${img}`} alt="old" />
                                <button
                                    type="button"
                                    onClick={() => removeOldImage(index)}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ===== เพิ่มรูปใหม่ ===== */}
                <div className="image-section">
                    <h4>เพิ่มรูปใหม่</h4>
                    <input type="file" multiple onChange={handleImageChange} />

                    <div className="image-preview">
                        {images.map((img, index) => (
                            <div key={index} className="image-card">
                                <img src={URL.createObjectURL(img)} alt="new" />
                                <button
                                    type="button"
                                    onClick={() => removeNewImage(index)}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>


                {(form.tradeOption === "sell_only" ||
                    form.tradeOption === "negotiable") && (
                        <div className="form-group">
                            <label>ราคา (บาท)</label>
                            <input
                                name="price"
                                type="number"
                                value={form.price}
                                onChange={handleChange}
                            />
                        </div>
                    )}

                <div className="form-group">
                    <label>จำนวนสินค้า</label>
                    <input
                        name="quantity"
                        type="number"
                        value={form.quantity}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label>หมวดหมู่</label>
                    <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                    >
                        <option value="">-- เลือกหมวดหมู่ --</option>
                        <option value="เสื้อผ้า">เสื้อผ้า</option>
                        <option value="เครื่องใช้ไฟฟ้า">เครื่องใช้ไฟฟ้า</option>
                        <option value="หนังสือ">หนังสือ</option>
                        <option value="เฟอร์นิเจอร์">เฟอร์นิเจอร์</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>รูปแบบการจัดส่ง</label>
                    <select
                        name="deliveryType"
                        value={form.deliveryType}
                        onChange={handleChange}
                    >
                        <option value="delivery">จัดส่ง</option>
                        <option value="meetup">นัดรับ</option>
                        <option value="both">ทั้งสองแบบ</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>ตัวเลือกการขาย</label>
                    <select
                        name="tradeOption"
                        value={form.tradeOption}
                        onChange={handleChange}
                    >
                        <option value="sell_only">ขายเท่านั้น</option>
                        <option value="trade_allowed">รับแลกเท่านั้น</option>
                        <option value="negotiable">รับแลก/ต่อรอง</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>สถานที่</label>
                    <input
                        name="locationName"
                        value={form.locationName}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label>Latitude</label>
                    <input
                        name="lat"
                        type="number"
                        value={form.lat}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label>Longitude</label>
                    <input
                        name="lng"
                        type="number"
                        value={form.lng}
                        onChange={handleChange}
                    />
                </div>

                {/* ปุ่ม */}
                <div className="form-actions">
                    <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => navigate(-1)}
                    >
                        ยกเลิก
                    </button>

                    <button type="submit" className="save-btn">
                        บันทึกการแก้ไข
                    </button>
                </div>

            </form>

        </div>
    );
}

export default EditProduct;