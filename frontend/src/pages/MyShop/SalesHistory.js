function SalesHistory({ products }) {
  if (products.length === 0) {
    return <div style={{ padding: "40px", textAlign: "center" }}>ยังไม่มีประวัติการขาย</div>;
  }

  return products.map(p => (
    <div key={p._id} className="shop-card">
      <div className="card-top">
        <div>
          <h4>{p.title}</h4>
          <span className="price">฿{p.price?.toLocaleString()}</span>
        </div>

        <div className="card-actions">
          <span className="status sold">ขายแล้ว</span>
        </div>
      </div>
    </div>
  ));
}

export default SalesHistory;
