export default function OrderItem({ item }) {
  return (
    <div className="co-item">
      <img src={item.image} alt={item.name} />
      <div className="co-item-info">
        <p className="co-item-name">{item.name}</p>
        <p>฿{item.price} x {item.qty}</p>
      </div>
      <strong>฿{item.price * item.qty}</strong>
    </div>
  );
}
