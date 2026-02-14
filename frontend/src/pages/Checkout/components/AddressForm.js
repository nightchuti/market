export default function AddressForm({ address, setAddress }) {
  return (
    <div className="co-card">
      <h3>ที่อยู่จัดส่ง</h3>
      <textarea
        className="co-input"
        placeholder="กรอกที่อยู่จัดส่งของคุณ"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
    </div>
  );
}
