function Inventory({ products, openId, setOpenId, handleDelete, navigate, publishProduct }) {
  if (products.length === 0) {
    return <div style={{ padding: "40px", textAlign: "center" }}>ไม่มีสินค้าในคลัง</div>;
  }

  
  return products.map(p => (
    <div key={p._id} className="shop-card">
      <div className="card-top">
        <div>
          <h4>{p.title}</h4>
          <span className="price">฿{p.price?.toLocaleString()}</span>
        </div>

        <div className="card-actions">
          <span className={`status-badge ${p.status}`}>
            {p.status === "available" && "พร้อมขาย"}
            {p.status === "pending" && "รอลงขาย"}
            {p.status === "sold" && "ขายแล้ว"}
          </span>

          {p.status === "pending" && (
            <button
              className="publish-btn"
              onClick={() => publishProduct(p._id)}
            >
              ลงขาย
            </button>
          )}

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
          <p>{p.description}</p>

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
