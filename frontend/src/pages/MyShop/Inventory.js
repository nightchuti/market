import axios from "axios";
import "./MyShop.css";

function Inventory({
  products,
  openId,
  setOpenId,
  handleDelete,
  navigate,
  type
}) {
  if (products.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        ไม่มีสินค้าในหมวดนี้
      </div>
    );
  }

  const handlePublish = async (id) => {
    try {
      await axios.put(
        `http://localhost:5000/api/products/${id}`,
        { status: "available" },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      window.location.reload();
    } catch (err) {
      alert("เปลี่ยนสถานะไม่สำเร็จ");
    }
  };

  return products.map(p => {

    const statusLabel =
      p.status === "draft"
        ? "ฉบับร่าง"
        : p.status === "sold"
        ? "ขายแล้ว"
        : "พร้อมขาย";

    const statusClass =
      p.status === "draft"
        ? "draft"
        : p.status === "sold"
        ? "sold"
        : "available";

    return (
      <div key={p._id} className="shop-card">

        <div className="card-top">
          <div>
            <h4>{p.title}</h4>
            <span className="price">
              ฿{p.price?.toLocaleString()}
            </span>

            <p className="stock">
              คงเหลือ {p.quantity} ชิ้น
            </p>
          </div>

          <div className="card-actions">
            <span className={`status ${statusClass}`}>
              {statusLabel}
            </span>

            <button
              className="dropdown-btn"
              onClick={() =>
                setOpenId(openId === p._id ? null : p._id)
              }
            >
              {openId === p._id ? "−" : "+"}
            </button>
          </div>
        </div>

        {openId === p._id && (
          <div className="card-dropdown">

            <p>
              <strong>รายละเอียด:</strong> {p.description}
            </p>

            <div className="detail-grid">
              <div>
                <strong>หมวดหมู่</strong>
                <span>{p.category || "-"}</span>
              </div>

              <div>
                <strong>ประเภทขาย</strong>
                <span>{p.tradeOption}</span>
              </div>

              <div>
                <strong>การจัดส่ง</strong>
                <span>{p.deliveryType}</span>
              </div>
            </div>

            {/* ====== ปุ่มควบคุม ====== */}

            {p.status !== "sold" && (
              <div className="dropdown-buttons">

                <button
                  onClick={() =>
                    navigate(`/edit-product/${p._id}`)
                  }
                  className="edit-btn"
                >
                  แก้ไข
                </button>

                {p.status === "draft" && (
                  <button
                    className="publish-btn"
                    onClick={() => handlePublish(p._id)}
                  >
                    🚀 ลงขาย
                  </button>
                )}

                <button
                  className="delete-btn"
                  onClick={() => handleDelete(p._id)}
                >
                  ลบสินค้า
                </button>

              </div>
            )}

          </div>
        )}

      </div>
    );
  });
}

export default Inventory;
