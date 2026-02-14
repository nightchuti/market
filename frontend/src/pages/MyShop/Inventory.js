function Inventory({
  products,
  openId,
  setOpenId,
  handleDelete,
  navigate
}) {
  if (products.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        ไม่มีสินค้าในคลัง
      </div>
    );
  }

  return products.map(p => (
    <div key={p._id} className="shop-card">

      <div className="card-top">
        <div>
          <h4>{p.title}</h4>
          <span className="price">฿{p.price?.toLocaleString()}</span>
          <p className="stock">คงเหลือ {p.quantity} ชิ้น</p>
        </div>

        <div className="card-actions">
          <span className="status available">พร้อมขาย</span>

          <button
            className="dropdown-btn"
            onClick={() => setOpenId(openId === p._id ? null : p._id)}
          >
            {openId === p._id ? "−" : "+"}
          </button>
        </div>
      </div>

      {openId === p._id && (
        <div className="card-dropdown">
          <p><strong>รายละเอียด:</strong> {p.description}</p>

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

          <div className="dropdown-buttons">
            <button
              onClick={() => navigate(`/edit-product/${p._id}`)}
              className="edit-btn"
            >
              แก้ไข
            </button>

            <button
              className="delete-btn"
              onClick={() => handleDelete(p._id)}
            >
              ลบสินค้า
            </button>
          </div>
        </div>
      )}

    </div>
  ));
}

export default Inventory;
