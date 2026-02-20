function SalesHistory({ orders }) {
  if (!orders || orders.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        ยังไม่มีประวัติการขาย
      </div>
    );
  }

  return orders.map(order => (
    <div key={order._id} className="shop-card">
      <div className="card-top">
        <div>
          <h4>ORDER #{order._id.slice(-8).toUpperCase()}</h4>
          <span className="price">
            ฿{order.totalPrice?.toLocaleString()}
          </span>
        </div>

        <div className="card-actions">
          <span className="status sold">สำเร็จแล้ว</span>
        </div>
      </div>

      <div className="card-dropdown">
        {order.items?.map((item, i) => (
          <div key={i}>
            • {item.product?.title} x{item.quantity}
          </div>
        ))}
      </div>
    </div>
  ));
}

export default SalesHistory;
