import React, { useEffect, useState } from "react";
import api from "../../api";

const STYLE = `
  .at-wrap { padding:24px 60px; background:#f4f6f9; min-height:100vh; font-family:'Prompt',sans-serif; }
  .at-h2   { margin-bottom:20px; font-size:20px; color:#1e293b; }
  .at-tabs { display:flex; gap:10px; margin-bottom:24px; }
  .at-tab  { padding:10px 18px; border-radius:8px; border:1px solid #ccc; background:#fff; cursor:pointer; font-family:inherit; font-size:14px; transition:.15s; }
  .at-tab.on { background:#264653; color:#fff; border-color:#264653; }

  .at-empty { padding:20px; background:#fff; border-radius:10px; text-align:center; color:#777; }

  .at-card { background:#fff; padding:20px; margin-bottom:16px; border-radius:14px; box-shadow:0 4px 14px rgba(0,0,0,.07); }
  .at-top  { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; flex-wrap:wrap; gap:8px; }
  .at-label { font-size:12px; color:#888; }
  .at-value { font-weight:600; font-size:14px; word-break:break-all; }
  .at-price { background:#2a9d8f; color:#fff; padding:8px 16px; border-radius:8px; font-weight:700; font-size:15px; white-space:nowrap; }
  .at-bank  { background:#f8f9fa; padding:12px; border-radius:8px; margin:12px 0; font-size:14px; line-height:1.8; }
  .at-btn   { display:block; margin:16px auto 0; width:60%; max-width:280px;
    background:linear-gradient(135deg,#2a9d8f,#21867a); border:none; color:#fff;
    padding:12px 20px; border-radius:30px; cursor:pointer; font-weight:600;
    font-size:14px; font-family:inherit; box-shadow:0 4px 10px rgba(0,0,0,.1); transition:.2s; }
  .at-btn:hover { opacity:.9; transform:translateY(-1px); }
  .at-done { background:#d4edda; color:#155724; padding:10px; border-radius:8px; text-align:center; font-weight:600; font-size:13px; }

  .at-summary { display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap; }
  .at-scard { background:#fff; border-radius:12px; padding:16px 20px; box-shadow:0 4px 14px rgba(0,0,0,.07);
    display:flex; align-items:center; gap:14px; flex:1; min-width:160px; border-left:4px solid #e2e8f0; }
  .at-scard-icon { width:42px; height:42px; border-radius:10px; display:flex; align-items:center;
    justify-content:center; font-size:20px; flex-shrink:0; }
  .at-scard-num  { font-size:20px; font-weight:700; color:#1e293b; line-height:1.2; }
  .at-scard-lbl  { font-size:12px; color:#888; margin-top:3px; }

  .at-parties { display:flex; gap:10px; margin:10px 0; flex-wrap:wrap; }
  .at-party { flex:1; min-width:140px; background:#f8f9fa; border-radius:8px; padding:10px 14px; }
  .at-party-title { font-size:11px; color:#888; font-weight:600; text-transform:uppercase; margin-bottom:4px; }
  .at-party-name  { font-weight:700; color:#1e293b; font-size:14px; }
  .at-party-sub   { color:#555; font-size:12px; }

  .at-items { background:#f8f9fa; border-radius:8px; padding:10px 14px; margin:10px 0; }
  .at-items-title { font-size:11px; color:#888; font-weight:600; text-transform:uppercase; margin-bottom:6px; }
  .at-item { display:flex; justify-content:space-between; font-size:13px; color:#444; padding:3px 0; border-bottom:1px solid #eee; }
  .at-item:last-child { border-bottom:none; }
  .at-item-price { font-weight:600; color:#2a9d8f; }

  @media (max-width:768px) {
    .at-wrap { padding:16px; }
    .at-btn  { width:100%; max-width:100%; }
    .at-value { font-size:13px; }
  }
`;
if (!document.getElementById("at-style")) {
  const el = document.createElement("style"); el.id="at-style"; el.textContent=STYLE; document.head.appendChild(el);
}

const AdminTransfer = () => {
  const [tab, setTab]             = useState("pending");
  const [pending, setPending]     = useState([]);
  const [transferred, setTransferred] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  const loadPending     = async () => { try { const r = await api.get("/api/orders/admin/pending-transfer");    setPending(r.data); } catch(e){} };
  const loadTransferred = async () => { try { const r = await api.get("/api/orders/admin/transferred"); setTransferred(r.data); } catch(e){} };

  useEffect(()=>{ loadPending(); loadTransferred(); },[]);

  const transfer = async (id) => {
    if (!window.confirm("ยืนยันว่าโอนเงินแล้ว?")) return;
    setLoadingId(id);
    try {
      await api.patch(`/api/orders/${id}/admin-transfer-seller`);
      loadPending(); loadTransferred();
    } catch(e) { alert("เกิดข้อผิดพลาด"); }
    finally { setLoadingId(null); }
  };

  const renderCards = (orders, done=false) =>
    orders.length===0
      ? <div className="at-empty">ไม่มีรายการ</div>
      : orders.map(o => {
          const seller = o.items[0]?.product?.user;
          const buyer  = o.user;
          const bank   = seller?.bankAccount;
          return (
            <div key={o._id} className="at-card">
              <div className="at-top">
                <div>
                  <p className="at-label">Order ID</p>
                  <p className="at-value">#{o._id.slice(-8).toUpperCase()}</p>
                  <p className="at-label" style={{marginTop:2}}>{new Date(o.completedAt||o.createdAt).toLocaleString("th-TH")}</p>
                </div>
                <div className="at-price">฿{o.totalPrice?.toLocaleString()}</div>
              </div>

              <div className="at-parties">
                <div className="at-party">
                  <div className="at-party-title">ร้านค้า : {seller?.username||"-"}</div>
                  <div className="at-party-sub">{seller?.email||""}</div>
                </div>
              </div>

              <div className="at-items">
                <div className="at-items-title">รายการสินค้า</div>
                {o.items.map((it,i) => (
                  <div key={i} className="at-item">
                    <span>{it.product?.title||"ไม่พบสินค้า"} ×{it.quantity}</span>
                    <span className="at-item-price">฿{((it.price||0)*it.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {bank && (
                <div className="at-bank">
                  <div>ธนาคาร: <strong>{bank.bankName||"-"}</strong></div>
                  <div>ชื่อบัญชี: <strong>{bank.accountName||"-"}</strong></div>
                  <div>เลขบัญชี: <strong>{bank.accountNumber||"-"}</strong></div>
                  {bank.promptPayNumber && <div>PromptPay: <strong>{bank.promptPayNumber}</strong></div>}
                </div>
              )}

              {done
                ? <div className="at-done">✅ โอนแล้วเมื่อ {new Date(o.sellerTransferredAt).toLocaleString("th-TH")}</div>
                : <button className="at-btn" disabled={loadingId===o._id} onClick={()=>transfer(o._id)}>
                    {loadingId===o._id ? "กำลังบันทึก..." : "โอนเงินให้ร้าน"}
                  </button>
              }
            </div>
          );
        });

  const pendingCount     = pending.length;
  const transferredCount = transferred.length;
  const pendingTotal     = pending.reduce((s,o)=>s+(o.totalPrice||0),0);
  const transferredTotal = transferred.reduce((s,o)=>s+(o.totalPrice||0),0);

  return (
    <div className="at-wrap">
      <h2 className="at-h2">จัดการโอนเงินร้านค้า</h2>

      <div className="at-summary">
        <div className="at-scard" style={{borderLeftColor:"#f59e0b"}}>
          <div>
            <div className="at-scard-num">{pendingCount} รายการ</div>
            <div className="at-scard-lbl">รอโอนเงิน</div>
          </div>
        </div>
        <div className="at-scard" style={{borderLeftColor:"#2a9d8f"}}>
          <div>
            <div className="at-scard-num">฿{pendingTotal.toLocaleString()}</div>
            <div className="at-scard-lbl">ยอดรอโอนทั้งหมด</div>
          </div>
        </div>
        <div className="at-scard" style={{borderLeftColor:"#22c55e"}}>
          <div>
            <div className="at-scard-num">{transferredCount} รายการ</div>
            <div className="at-scard-lbl">โอนแล้ว</div>
          </div>
        </div>
        <div className="at-scard" style={{borderLeftColor:"#6366f1"}}>
          <div>
            <div className="at-scard-num">฿{transferredTotal.toLocaleString()}</div>
            <div className="at-scard-lbl">ยอดโอนแล้วสะสม</div>
          </div>
        </div>
      </div>

      <div className="at-tabs">
        {[["pending",`รอโอนเงิน (${pendingCount})`],["transferred",`โอนแล้ว (${transferredCount})`]].map(([k,l])=>(
          <button key={k} className={`at-tab ${tab===k?"on":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>
      {tab==="pending" ? renderCards(pending) : renderCards(transferred,true)}
    </div>
  );
};
export default AdminTransfer;