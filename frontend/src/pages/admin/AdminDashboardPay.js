import React, { useState, useEffect } from "react";
import api from "../../api";

const API_URL = process.env.REACT_APP_API_URL;
const getImg = (img) => {
  if (!img) return "/images/no-slip.png";
  if (img.startsWith("http")) return img;
  if (!API_URL) return img;
  return `${API_URL.replace(/\/$/, "")}/${img.replace(/^\//, "")}`;
};

const STYLE = `
  .adp { padding:24px; max-width:1000px; margin:0 auto; font-family:'Prompt',sans-serif; }
  .adp-h2 { color:#00467f; margin-bottom:18px; font-size:20px; }
  .adp-tabs { display:flex; gap:20px; margin-bottom:18px; border-bottom:1px solid #ddd; }
  .adp-tab { padding:10px 14px; cursor:pointer; background:none; border:none;
    font-size:15px; font-weight:600; color:#888; font-family:inherit;
    border-bottom:3px solid transparent; margin-bottom:-1px; transition:.15s; }
  .adp-tab.on { color:#00467f; border-bottom-color:#00467f; }

  /* table */
  .adp-table-wrap { background:#fff; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,.05); overflow-x:auto; }
  .adp-table { width:100%; border-collapse:collapse; min-width:620px; }
  .adp-table thead tr { background:#f9fafb; }
  .adp-table th { padding:14px 12px; text-align:left; font-size:13px; color:#666; white-space:nowrap; }
  .adp-table td { padding:13px 12px; font-size:14px; vertical-align:middle; border-bottom:1px solid #f1f1f1; }
  .adp-thumb { width:46px; height:64px; object-fit:cover; border-radius:6px; cursor:pointer; border:1px solid #eee; }
  .adp-price { font-size:16px; font-weight:700; color:#ee4d2d; }
  .adp-paid  { color:#28a745; font-weight:600; font-size:13px; }
  .adp-init  { background:#00467f; color:#fff; border:none; padding:7px 14px; border-radius:8px; cursor:pointer; font-size:13px; }
  .adp-cg    { display:flex; gap:5px; }
  .adp-yes   { background:#28a745; color:#fff; border:none; padding:7px 12px; border-radius:6px; cursor:pointer; }
  .adp-no    { background:#6c757d; color:#fff; border:none; padding:7px 12px; border-radius:6px; cursor:pointer; }

  /* mobile cards — hidden on desktop */
  .adp-cards { display:none; flex-direction:column; gap:12px; }
  .adp-card  { background:#fff; border-radius:12px; padding:16px; box-shadow:0 2px 10px rgba(0,0,0,.06); border:1px solid #f0f0f0; }
  .adp-card-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
  .adp-card-id   { font-weight:700; font-size:14px; color:#333; }
  .adp-card-shop { font-size:12px; color:#00467f; margin-top:2px; }
  .adp-card-row  { display:flex; gap:12px; margin-bottom:10px; align-items:flex-start; }
  .adp-card-items{ flex:1; font-size:13px; color:#555; line-height:1.7; }
  .adp-card-foot { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-top:1px solid #f1f1f1; padding-top:10px; }
  .adp-card-date { font-size:11px; color:#999; }

  /* modal */
  .adp-modal { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; justify-content:center; align-items:center; z-index:9999; padding:20px; }
  .adp-modal img { max-width:80vw; max-height:80vh; object-fit:contain; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.4); }

  @media (max-width:640px) {
    .adp { padding:14px; }
    .adp-table-wrap { display:none; }
    .adp-cards { display:flex; }
  }
`;
if (!document.getElementById("adp-style")) {
  const el = document.createElement("style"); el.id="adp-style"; el.textContent=STYLE; document.head.appendChild(el);
}

const AdminDashboardPay = () => {
  const [orders, setOrders]       = useState([]);
  const [tab, setTab]             = useState("waiting");
  const [loading, setLoading]     = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [updating, setUpdating]   = useState(false);
  const [bigImg, setBigImg]       = useState(null);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/api/orders/admin/all-payments"); setOrders(r.data); }
    catch(e){ console.error(e); } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const approve = async (id) => {
    setUpdating(true);
    try { await api.patch(`/api/orders/${id}/admin-confirm`); setConfirmId(null); load(); }
    catch(e){ console.error(e); } finally { setUpdating(false); }
  };

  const filtered = orders.filter(o => tab==="waiting" ? o.status==="WaitingConfirm" : o.status==="Paid");

  const ActionBtn = ({ order }) => tab==="waiting" ? (
    confirmId===order._id
      ? <div className="adp-cg">
          <button className="adp-yes" disabled={updating} onClick={()=>approve(order._id)}>ใช่</button>
          <button className="adp-no"  disabled={updating} onClick={()=>setConfirmId(null)}>ไม่</button>
        </div>
      : <button className="adp-init" onClick={()=>setConfirmId(order._id)}>อนุมัติ</button>
  ) : <span className="adp-paid">✔️ จ่ายแล้ว</span>;

  const waitCount = orders.filter(o=>o.status==="WaitingConfirm").length;

  return (
    <div className="adp">
      <h2 className="adp-h2">ระบบจัดการบัญชีกลาง</h2>

      <div className="adp-tabs">
        {[["waiting",`รอตรวจสอบ (${waitCount})`],["approved","อนุมัติแล้ว"]].map(([k,l])=>(
          <button key={k} className={`adp-tab ${tab===k?"on":""}`}
            onClick={()=>{setTab(k);setConfirmId(null);}}>{l}</button>
        ))}
      </div>

      {loading ? <p style={{textAlign:"center"}}>กำลังโหลด...</p> : (<>

        {/* Desktop table */}
        <div className="adp-table-wrap">
          <table className="adp-table">
            <thead><tr>
              {["รหัส/ร้านค้า","รายการสินค้า","ยอดเงิน","หลักฐาน","วันที่สั่ง","จัดการ"].map(h=>(
                <th key={h}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map(o=>(
              <tr key={o._id}>
                <td>
                  <div style={{fontWeight:700,color:"#333"}}>#{o._id.slice(-6).toUpperCase()}</div>
                  <div style={{fontSize:12,color:"#00467f"}}>{o.items[0]?.product?.user?.username||"ร้านค้าทั่วไป"}</div>
                </td>
                <td>{o.items.map((it,i)=>(
                  <div key={i} style={{fontSize:13,color:"#555"}}>{it.product?.title||"ไม่พบสินค้า"} (x{it.quantity})</div>
                ))}</td>
                <td><span className="adp-price">฿{o.totalPrice.toLocaleString()}</span></td>
                <td><img src={getImg(o.paymentSlip)} className="adp-thumb" onClick={()=>setBigImg(getImg(o.paymentSlip))} alt="slip"
                  onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src="/images/no-slip.png";}}/></td>
                <td style={{fontSize:13}}>{new Date(o.createdAt).toLocaleString("th-TH")}</td>
                <td><ActionBtn order={o}/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="adp-cards">
          {filtered.length===0
            ? <p style={{textAlign:"center",color:"#999",padding:20}}>ไม่มีรายการ</p>
            : filtered.map(o=>(
            <div key={o._id} className="adp-card">
              <div className="adp-card-head">
                <div>
                  <div className="adp-card-id">#{o._id.slice(-6).toUpperCase()}</div>
                  <div className="adp-card-shop">{o.items[0]?.product?.user?.username||"ร้านค้าทั่วไป"}</div>
                </div>
                <span className="adp-price">฿{o.totalPrice.toLocaleString()}</span>
              </div>
              <div className="adp-card-row">
                <img src={getImg(o.paymentSlip)} className="adp-thumb" onClick={()=>setBigImg(getImg(o.paymentSlip))} alt="slip"
                  onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src="/images/no-slip.png";}}/>
                <div className="adp-card-items">
                  {o.items.map((it,i)=><div key={i}>{it.product?.title||"ไม่พบสินค้า"} (x{it.quantity})</div>)}
                </div>
              </div>
              <div className="adp-card-foot">
                <span className="adp-card-date">{new Date(o.createdAt).toLocaleString("th-TH")}</span>
                <ActionBtn order={o}/>
              </div>
            </div>
          ))}
        </div>
      </>)}

      {bigImg && (
        <div className="adp-modal" onClick={()=>setBigImg(null)}>
          <img src={bigImg} alt="slip large"
            onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src="/images/no-slip.png";}}/>
        </div>
      )}
    </div>
  );
};
export default AdminDashboardPay;