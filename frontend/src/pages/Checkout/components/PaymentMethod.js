export default function PaymentMethod({ payment, setPayment }) {
  return (
    <div className="co-card">
      <h3>วิธีชำระเงิน</h3>

      <label className="co-radio">
        <input
          type="radio"
          value="cod"
          checked={payment === "cod"}
          onChange={() => setPayment("cod")}
        />
        เก็บเงินปลายทาง (COD)
      </label>

      <label className="co-radio">
        <input
          type="radio"
          value="transfer"
          checked={payment === "transfer"}
          onChange={() => setPayment("transfer")}
        />
        โอนผ่านธนาคาร
      </label>
    </div>
  );
}
