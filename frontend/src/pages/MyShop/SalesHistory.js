import DetailSection from "../../components/DetailSection";

function SalesHistory({ orders }) {
  if (!orders || orders.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        ยังไม่มีประวัติการขาย
      </div>
    );
  }

  return orders.map(order => (
    <div className="card-dropdown">

      <DetailSection title="ข้อมูลคำสั่งซื้อ">
        <div><strong>วันที่:</strong> {new Date(order.createdAt).toLocaleString("th-TH")}</div>
        <div><strong>ยอดรวม:</strong> ฿{order.totalPrice?.toLocaleString()}</div>
      </DetailSection>

      <DetailSection title="รายการสินค้า">
        {order.items?.map((item, i) => (
          <div key={i}>
            {item.product?.title} x{item.quantity}
          </div>
        ))}
      </DetailSection>

    </div>
  ));
}

export default SalesHistory;
