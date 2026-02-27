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
  .asp { padding:24px; max-width:1000px; margin:0 auto; font-family:'Prompt',sans-serif; }
  .asp-h2 { color:#00467f; margin-bottom:18px; font-size:20px; }
  .asp-tabs { display:flex; gap:20px; margin-bottom:18px; border-bottom:1px solid #ddd; }
  .asp-tab { padding:10px 14px; cursor:pointer; background:none; border:none;
    font-size:15px; font-weight:600; color:#888; font-family:inherit;
    border-bottom:3px solid transparent; margin-bottom:-1px; }
  .asp-tab.on { color:#00467f; border-bottom-color:#00467f; }

  .asp-table-wrap { background:#fff; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,.05); overflow-x:auto; }
  .asp-table { width:100%; border-collapse:collapse; min-width:580px; }
  .asp-table thead tr { background:#f9fafb; }
  .asp-table th { padding:14px 12px; text-align:left; font-size:13px; color:#666; white-space:nowrap; }
  .asp-table td { padding:13px 12px; font-size:14px; vertical-align:middle; border-bottom:1px solid #f1f1f1; }
  .asp-thumb { width:46px; height:64px; object-fit:cover; border-radius:6px; cursor:pointer; border:1px solid #eee; }
  .asp-price { font-size:16px; font-weight:700; color:#ee4d2d; }
  .asp-paid  { color:#28a745; font-weight:600; font-size:13px; }
  .asp-init  { background:#00467f; color:#fff; border:none; padding:7px 14px; border-radius:8px; cursor:pointer; font-size:13px; }
  .asp-cg    { display:flex; gap:5px; }
  .asp-yes   { background:#28a745; color:#fff; border:none; padding:7px 12px; border-radius:6px; cursor:pointer; }
  .asp-no    { background:#6c757d; color:#fff; border:none; padding:7px 12px; border-radius:6px; cursor:pointer; }

  /* mobile cards */
  .asp-cards { display:none; flex-direction:column; gap:12px; }
  .asp-card  { background:#fff; border-radius:12px; padding:16px; box-shadow:0 2px 10px rgba(0,0,0,.06); border:1px solid #f0f0f0; }
  .asp-card-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
  .asp-card-name { font-weight:700; font-size:14px; color:#333; }
  .asp-card-plan { font-size:12px; color:#00467f; margin-top:2px; }
  .asp-card-row  { display:flex; gap:12px; margin-bottom:10px; align-items:center; }
  .asp-card-foot { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-top:1px solid #f1f1f1; padding-top:10px; }
  .asp-card-date { font-size:11px; color:#999; }

  .asp-modal { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; justify-content:center; align-items:center; z-index:9999; padding:20px; }
  .asp-modal img { max-width:80vw; max-height:80vh; object-fit:contain; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.4); }

  @media (max-width:640px) {
    .asp { padding:14px; }
    .asp-table-wrap { display:none; }
    .asp-cards { display:flex; }
  }
`;
if (!document.getElementById("asp-style")) {
  const el = document.createElement("style"); el.id="asp-style"; el.textContent=STYLE; document.head.appendChild(el);
}

const AdminDashboardSubPay = () => {
  const [list, setList]           = useState([]);
  const [tab, setTab]             = useState("waiting");
  const [loading, setLoading]     = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [updating, setUpdating]   = useState(false);
  const [bigImg, setBigImg]       = useState(null);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/api/memberships/admin/memberships"); setList(r.data); }
    catch(e){ console.error(e); } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const approve = async (id) => {
    setUpdating(true);
    try { await api.post(`/api/memberships/approve/${id}`); setConfirmId(null); load(); }
    catch(e){ console.error(e); } finally { setUpdating(false); }
  };

  const filtered = list.filter(m => tab==="waiting" ? m.status==="pending" : m.status==="approved");

  const ActionBtn = ({ item }) => tab==="waiting" ? (
    confirmId===item._id
      ? <div className="asp-cg">
          <button className="asp-yes" disabled={updating} onClick={()=>approve(item._id)}>ใช่</button>
          <button className="asp-no"  disabled={updating} onClick={()=>setConfirmId(null)}>ไม่</button>
        </div>
      : <button className="asp-init" onClick={()=>setConfirmId(item._id)}>อนุมัติ</button>
  ) : <span className="asp-paid">อนุมัติแล้ว</span>;

  const pendingCount = list.filter(m=>m.status==="pending").length;

  return (
    <div className="asp">
      <h2 className="asp-h2">จัดการการสมัครสมาชิก</h2>

      <div className="asp-tabs">
        {[["waiting",`รอตรวจสอบ (${pendingCount})`],["approved","อนุมัติแล้ว"]].map(([k,l])=>(
          <button key={k} className={`asp-tab ${tab===k?"on":""}`}
            onClick={()=>{setTab(k);setConfirmId(null);}}>{l}</button>
        ))}
      </div>

      {loading ? <p style={{textAlign:"center"}}>กำลังโหลด...</p> : (<>

        {/* Desktop table */}
        <div className="asp-table-wrap">
          <table className="asp-table">
            <thead><tr>
              {["ผู้ใช้","แพ็กเกจ","ราคา","หลักฐาน","วันที่สมัคร","จัดการ"].map(h=><th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>{filtered.map(item=>(
              <tr key={item._id}>
                <td>{item.user?.email||"ไม่พบผู้ใช้"}</td>
                <td>{item.plan}</td>
                <td><span className="asp-price">฿{item.price?.toLocaleString()}</span></td>
                <td><img src={getImg(item.slip)} className="asp-thumb" onClick={()=>setBigImg(getImg(item.slip))} alt="slip"/></td>
                <td style={{fontSize:13}}>{new Date(item.createdAt).toLocaleString("th-TH")}</td>
                <td><ActionBtn item={item}/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="asp-cards">
          {filtered.length===0
            ? <p style={{textAlign:"center",color:"#999",padding:20}}>ไม่มีรายการ</p>
            : filtered.map(item=>(
            <div key={item._id} className="asp-card">
              <div className="asp-card-head">
                <div>
                  <div className="asp-card-name">{item.user?.email||"ไม่พบผู้ใช้"}</div>
                  <div className="asp-card-plan">แพ็กเกจ: {item.plan}</div>
                </div>
                <span className="asp-price">฿{item.price?.toLocaleString()}</span>
              </div>
              <div className="asp-card-row">
                <img src={getImg(item.slip)} className="asp-thumb" onClick={()=>setBigImg(getImg(item.slip))} alt="slip"/>
                <span style={{fontSize:13,color:"#555"}}>วันที่: {new Date(item.createdAt).toLocaleString("th-TH")}</span>
              </div>
              <div className="asp-card-foot">
                <span className="asp-card-date">{new Date(item.createdAt).toLocaleDateString("th-TH")}</span>
                <ActionBtn item={item}/>
              </div>
            </div>
          ))}
        </div>
      </>)}

      {bigImg && (
        <div className="asp-modal" onClick={()=>setBigImg(null)}>
          <img src={bigImg} alt="slip large"/>
        </div>
      )}
    </div>
  );
};
export default AdminDashboardSubPay;