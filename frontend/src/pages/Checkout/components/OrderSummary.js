export default function OrderSummary({ total, onConfirm }) {
  return (
    <div className="co-summary">
      <div>
        <span>รวมทั้งหมด</span>
        <strong>฿{total}</strong>
      </div>

      <button className="co-btn" onClick={onConfirm}>
        ยืนยันคำสั่งซื้อ
      </button>
    </div>
  );
}
