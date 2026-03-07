// ─────────────────────────────────────────────────────────────────────────────
// LOADS — MASTER CONTROLLER + NEW LOAD + LOAD DETAIL + REMOVE LOAD
// All load sub-views live here because they share state (sel, view, fileRefs).
// To add a new feature inside a load, edit the relevant section below.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from "react";
import { C, card, lbl, inp, btn, ghost } from "../styles";
import {
  STAGES, STAGE_KEYS, BROKERS, stageIdx, nextStage, prevStage,
  fmt, today, brokerName, calcLoad,
} from "../constants";
import { idbSave } from "../storage";
import StoredFile   from "./StoredFile";
import ETTRInvoice  from "./ETTRInvoice";

// ─────────────────────────────────────────────────────────────────────────────
// LOADS — top-level controller
// ─────────────────────────────────────────────────────────────────────────────
export default function Loads({
  user, users, setUsers, loads, setLoads,
  shippers, setShippers, isCarrier, setPage,
}) {
  const [view,        setView]        = useState("list"); // list | new | detail
  const [sel,         setSel]         = useState(null);
  const [stageFilter, setStageFilter] = useState("all");
  const fileRefs = useRef({});

  // ── helpers ────────────────────────────────────────────────────────────────
  const updateLoad = (id, changes) => {
    setLoads(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...changes } : l);
      if (sel?.id === id) setSel(next.find(l => l.id === id));
      return next;
    });
  };

  const advanceLoad = (id, targetKey) => {
    const load = loads.find(l => l.id === id);
    if (!load) return;
    const next = targetKey || nextStage(load.stage);
    updateLoad(id, { stage:next, stageHistory:{ ...load.stageHistory, [next]:today() } });
  };

  // Save file to IndexedDB, store filename in load record
  const uploadDoc = async (lid, docKey, file) => {
    if (!file) return;
    const idbKey = `load_${lid}_${docKey}`;
    await idbSave(idbKey, file);
    const load = loads.find(l => l.id === lid);
    updateLoad(lid, { docNames:{ ...(load?.docNames || {}), [docKey]:file.name } });
  };

  const visible = loads.filter(l => {
    if (l.deleted) return false;
    if (!isCarrier && l.driverId !== user.id) return false;
    if (stageFilter !== "all" && l.stage !== stageFilter) return false;
    return true;
  });

  if (view === "new") return (
    <NewLoad
      users={users} user={user} isCarrier={isCarrier}
      shippers={shippers} setShippers={setShippers}
      onSave={load => { setLoads(p => [load, ...p]); setSel(load); setView("detail"); }}
      onCancel={() => setView("list")}
      setPage={setPage}
    />
  );

  if (view === "detail" && sel) return (
    <LoadDetail
      load={sel} users={users} user={user} isCarrier={isCarrier}
      shippers={shippers} setShippers={setShippers}
      onUpdate={updateLoad} onAdvance={advanceLoad}
      uploadDoc={uploadDoc} fileRefs={fileRefs}
      onBack={() => setView("list")} setPage={setPage}
    />
  );

  // ── LOAD LIST ──────────────────────────────────────────────────────────────
  const all        = loads.filter(l => !l.deleted);
  const totalGross = all.reduce((s, l) => s + l.grossRate, 0);
  const totalPaid  = all.filter(l => l.stage === "paid")
                        .reduce((s, l) => s + (l.paidAmount || l.grossRate), 0);
  const totalOS    = all.filter(l => l.stage === "invoiced")
                        .reduce((s, l) => s + l.grossRate, 0);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, color:"#fff" }}>
            {isCarrier ? "All Loads" : "My Loads"}
          </div>
          <div style={{ fontSize:11, color:C.dim }}>{visible.length} load(s)</div>
        </div>
        <button onClick={() => setView("new")}
                style={{ ...btn(), fontSize:13, padding:"11px 24px" }}>
          + NEW LOAD
        </button>
      </div>

      {isCarrier && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                      gap:12, marginBottom:18 }}>
          {[
            { l:"TOTAL GROSS",  v:fmt(totalGross), c:C.accent },
            { l:"OUTSTANDING",  v:fmt(totalOS),    c:C.yellow },
            { l:"COLLECTED",    v:fmt(totalPaid),  c:C.green  },
          ].map(s => (
            <div key={s.l} style={card()}>
              <div style={{ fontSize:9, color:C.dim, letterSpacing:1.5, marginBottom:4 }}>{s.l}</div>
              <div style={{ fontSize:20, fontWeight:900, color:s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Stage filter tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        <button
          onClick={() => setStageFilter("all")}
          style={{ ...btn(stageFilter === "all" ? C.accent : C.card1, "#fff"),
                   padding:"5px 12px", fontSize:10 }}
        >All</button>
        {STAGES.map(s => (
          <button key={s.key} onClick={() => setStageFilter(s.key)}
                  style={{ padding:"5px 10px", borderRadius:6, border:"none",
                           cursor:"pointer", fontFamily:"inherit", fontSize:10, fontWeight:700,
                           background:stageFilter === s.key ? s.color : C.card1, color:"#fff",
                           WebkitTapHighlightColor:"transparent", touchAction:"manipulation" }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Load cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {visible.length === 0 && (
          <div style={{ ...card({ textAlign:"center", padding:50, color:C.border }) }}>
            No loads. Click + NEW LOAD to create your first load.
          </div>
        )}
        {visible.map(load => {
          const st  = STAGES.find(s => s.key === load.stage) || STAGES[0];
          const drv = users.find(u => u.id === load.driverId);
          const si  = stageIdx(load.stage);
          const { pct, carrierCut, driverNet } = calcLoad(load, users);
          return (
            <div key={load.id}
                 onClick={() => { setSel(load); setView("detail"); }}
                 style={card({ cursor:"pointer", borderColor:`${st.color}50`,
                               transition:"border-color .2s" })}>
              {/* Progress bar */}
              <div style={{ display:"flex", gap:3, marginBottom:10 }}>
                {STAGES.map((s, i) => (
                  <div key={s.key} title={s.label}
                       style={{ flex:1, height:4, borderRadius:2,
                                background:i < si ? "#22c55e" : i === si ? st.color : C.card2 }}/>
                ))}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between",
                            alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, marginBottom:6,
                                flexWrap:"wrap", alignItems:"center" }}>
                    <span style={{ background:`${st.color}20`, color:st.color,
                                   border:`1px solid ${st.color}50`, borderRadius:5,
                                   padding:"3px 10px", fontSize:10, fontWeight:800 }}>
                      {st.icon} {st.label}
                    </span>
                    <span style={{ fontSize:11, color:C.dim }}>{load.loadNumber}</span>
                    <span style={{ fontSize:11, color:C.dim }}>{brokerName(load)}</span>
                    {load.comcheck && (
                      <span style={{ fontSize:10, color:"#fbbf24", background:"#78350f20",
                                     border:"1px solid #78350f50", borderRadius:4,
                                     padding:"1px 7px" }}>⛽ COMCHECK</span>
                    )}
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color:C.text }}>
                    {load.origin} → {load.destination}
                  </div>
                  <div style={{ fontSize:11, color:C.dim }}>
                    {drv?.name} · PU: {load.pickupDate} · DEL: {load.deliveryDate}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:22, fontWeight:900, color:C.text }}>
                    {fmt(load.grossRate)}
                  </div>
                  {isCarrier && (
                    <>
                      <div style={{ fontSize:11, color:"#a78bfa" }}>
                        Carrier: {fmt(carrierCut)} ({pct}%)
                      </div>
                      <div style={{ fontSize:11, color:C.green }}>
                        Driver: {fmt(driverNet)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW LOAD — upload rate con first, then fill details
// ─────────────────────────────────────────────────────────────────────────────
function NewLoad({ users, user, isCarrier, shippers, setShippers, onSave, onCancel, setPage }) {
  const fileRef = useRef(null); // any file (PDF, image, screenshot)
  const camRef  = useRef(null); // camera capture only
  const [rcFile, setRcFile] = useState(null);
  const [rcUrl,  setRcUrl]  = useState(null);
  const [mode,   setMode]   = useState("upload");
  const [err,    setErr]    = useState("");
  const [form,   setForm]   = useState({
    driverId:     isCarrier ? "tim" : user.id,
    broker:       "CNA Transportation",
    brokerCustom: "",
    brokerContact:"",
    loadNumber:   "",
    origin:       "",
    destination:  "",
    shipper:      "",
    receiver:     "",
    commodity:    "General Freight",
    pickupDate:   "",
    deliveryDate: "",
    grossRate:    "",
    hasComcheck:  false,
    ccNum:        "",
    ccAmt:        "",
    ccDate:       today(),
    notes:        "",
  });

  const handleFile = f => {
    if (!f) return;
    setRcFile(f);
    setRcUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const save = () => {
    if (!form.loadNumber || !form.grossRate || !form.origin || !form.destination) {
      setErr("Load #, gross rate, pickup, and delivery are required.");
      return;
    }
    const load = {
      id:            `load-${Date.now()}`,
      driverId:      form.driverId,
      broker:        form.broker,
      brokerCustom:  form.brokerCustom,
      brokerContact: form.brokerContact,
      loadNumber:    form.loadNumber,
      origin:        form.origin,
      destination:   form.destination,
      shipper:       form.shipper,
      receiver:      form.receiver,
      commodity:     form.commodity,
      pickupDate:    form.pickupDate,
      deliveryDate:  form.deliveryDate,
      grossRate:     parseFloat(form.grossRate) || 0,
      stage:         "rate_con",
      comcheck:      form.hasComcheck
                       ? { number:form.ccNum, amount:parseFloat(form.ccAmt) || 0, dateIssued:form.ccDate }
                       : null,
      docs:    { rateCon:null, bolUnsigned:null, bolSigned:null, lumper:null, pod:null, invoice:null },
      docNames:{ rateCon:rcFile?.name || null, bolUnsigned:null, bolSigned:null,
                 lumper:null, pod:null, invoice:null },
      lumperAmount:0, detentionAmount:0, expenses:[],
      stageHistory:{ rate_con:today() },
      paidAmount:null, notes:form.notes, deleted:false,
    };

    if (rcFile) {
      idbSave(`load_${load.id}_rateCon`, rcFile);
    }
    if (form.shipper && !shippers.includes(form.shipper)) {
      setShippers(p => [...p, form.shipper]);
    }
    onSave(load);
  };

  const F = ({ l, k, type = "text", ph, full }) => (
    <div style={full ? { gridColumn:"span 2" } : {}}>
      <span style={lbl}>{l}</span>
      <input type={type} placeholder={ph} value={form[k] || ""}
             onChange={e => setForm({ ...form, [k]:e.target.value })} style={inp}/>
    </div>
  );

  const isCustom = form.broker === "Custom (type below)";

  return (
    <div style={{ maxWidth:700 }}>
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:8 }}>
        <div style={{ fontSize:20, fontWeight:900, color:"#fff" }}>📋 New Load</div>
        <button onClick={onCancel} style={ghost}>← Back to Loads</button>
      </div>

      {err && (
        <div style={{ background:"#7f1d1d20", border:"1px solid #ef444440",
                      borderRadius:8, padding:"10px 14px", color:"#fca5a5",
                      fontSize:12, marginBottom:14 }}>{err}</div>
      )}

      {/* ── STEP 1: RATE CON ── */}
      <div style={card({ marginBottom:16, borderColor:C.accent, background:"#0a1929" })}>
        <div style={{ fontSize:13, fontWeight:900, color:C.accent,
                      letterSpacing:1, marginBottom:10 }}>
          STEP 1 — IMPORT RATE CONFIRMATION
        </div>

        <div style={{ background:"#0f2744", borderRadius:10, padding:16, marginBottom:18,
                      border:"1px solid #1e3a5f" }}>
          <div style={{ fontSize:11, color:"#93c5fd", fontWeight:900,
                        marginBottom:10, letterSpacing:1 }}>
            HOW TO GET YOUR RATE CON INTO THE APP:
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[
              { icon:"📧", title:"From Email (most common)",
                steps:["Open your email app", "Find the rate con email from the broker",
                        "Tap the PDF attachment — it downloads to your phone",
                        "Come back here and tap 'Import File' below", "Pick that PDF — done"] },
              { icon:"📷", title:"Photo of a Printed Rate Con",
                steps:["Have the paper rate con in front of you",
                        "Tap 'Take Photo' below", "Point camera at it — done"] },
              { icon:"🖼️", title:"Screenshot of the Email",
                steps:["Take a screenshot of the rate con in your email",
                        "Tap 'Import File' below", "Pick the screenshot from your photos"] },
            ].map(m => (
              <div key={m.title} style={{ background:"#0c1f38", borderRadius:8, padding:12 }}>
                <div style={{ fontSize:12, fontWeight:800, color:"#e2e8f0", marginBottom:6 }}>
                  {m.icon} {m.title}
                </div>
                <ol style={{ margin:0, paddingLeft:18 }}>
                  {m.steps.map((s, i) => (
                    <li key={i} style={{ fontSize:11, color:C.dim, marginBottom:2 }}>{s}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        <input type="file" accept="*/*" ref={fileRef}
               onChange={e => handleFile(e.target.files[0])} style={{ display:"none" }}/>
        <input type="file" accept="image/*" capture="environment" ref={camRef}
               onChange={e => handleFile(e.target.files[0])} style={{ display:"none" }}/>

        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
          <button onClick={() => fileRef.current?.click()}
                  style={{ ...btn("#1d4ed8", "#fff"), fontSize:13, padding:"14px 22px",
                           border:"2px solid #3b82f6", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:20 }}>📎</span>
            <div style={{ textAlign:"left" }}>
              <div>Import File / PDF</div>
              <div style={{ fontSize:10, fontWeight:400, opacity:0.8 }}>
                From your downloads, email, or files app
              </div>
            </div>
          </button>
          <button onClick={() => camRef.current?.click()}
                  style={{ ...btn("#0f766e", "#fff"), fontSize:13, padding:"14px 22px",
                           border:"2px solid #14b8a6", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:20 }}>📷</span>
            <div style={{ textAlign:"left" }}>
              <div>Take a Photo</div>
              <div style={{ fontSize:10, fontWeight:400, opacity:0.8 }}>
                Of a printed rate con
              </div>
            </div>
          </button>
        </div>

        {rcFile ? (
          <div style={{ background:"#0f2744", borderRadius:10, padding:14,
                        border:`1px solid ${C.green}50` }}>
            <div style={{ fontSize:13, color:C.green, fontWeight:800, marginBottom:8 }}>
              ✓ RATE CON IMPORTED: {rcFile.name}
            </div>
            {rcUrl && (
              <img src={rcUrl} alt="Rate Con Preview"
                   style={{ width:"100%", maxHeight:280, objectFit:"contain",
                            borderRadius:8, border:`1px solid ${C.border}`, marginBottom:8 }}/>
            )}
            {!rcUrl && (
              <div style={{ fontSize:11, color:C.dim }}>
                📄 PDF imported — fill in the load details below from this rate con.
              </div>
            )}
            <button onClick={() => { setRcFile(null); setRcUrl(null); }}
                    style={{ ...ghost, fontSize:11, marginTop:8 }}>
              ✕ Remove — pick different file
            </button>
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"20px 0",
                        border:`2px dashed ${C.border}`, borderRadius:10,
                        color:C.border, fontSize:12 }}>
            No file imported yet — use the buttons above
          </div>
        )}

        <div style={{ marginTop:12, textAlign:"right" }}>
          <button onClick={() => setMode(mode === "manual" ? "upload" : "manual")}
                  style={{ background:"none", border:"none", color:C.dim, cursor:"pointer",
                           fontSize:11, fontFamily:"inherit",
                           WebkitTapHighlightColor:"transparent" }}>
            {mode === "manual" ? "↑ Back to file import" : "⌨ Skip — I'll enter details manually instead"}
          </button>
        </div>
      </div>

      {/* ── STEP 2: LOAD DETAILS ── */}
      <div style={card()}>
        <div style={{ fontSize:11, fontWeight:900, color:C.accent,
                      letterSpacing:1, marginBottom:14 }}>
          STEP 2 — LOAD DETAILS
          {rcFile && <span style={{ color:C.green, marginLeft:8 }}>
            (Confirm details from rate con above)
          </span>}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {isCarrier && (
            <div>
              <span style={lbl}>Assign Driver</span>
              <select value={form.driverId}
                      onChange={e => setForm({ ...form, driverId:e.target.value })} style={inp}>
                {users.filter(u => !u.deleted).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <span style={lbl}>Broker</span>
            <select value={form.broker}
                    onChange={e => setForm({ ...form, broker:e.target.value })} style={inp}>
              {BROKERS.map(b => <option key={b}>{b}</option>)}
              <option value="Custom (type below)">Custom (type below)</option>
            </select>
          </div>

          {isCustom && (
            <div>
              <span style={lbl}>Broker Name (custom)</span>
              <input value={form.brokerCustom}
                     onChange={e => setForm({ ...form, brokerCustom:e.target.value })}
                     style={inp} placeholder="Type broker name — saved for reuse"/>
            </div>
          )}

          <F l="Load / Reference #"        k="loadNumber"    ph="From rate con"/>
          <F l="Broker Billing Email"       k="brokerContact" type="email" ph="billing@broker.com"/>
          <F l="Pickup Location"            k="origin"        ph="City, State"/>
          <F l="Delivery Location"          k="destination"   ph="City, State"/>
          <F l="Shipper Name & Location"    k="shipper"       ph="ABC Warehouse, Chicago IL" full/>
          <F l="Receiver Name & Location"   k="receiver"      ph="XYZ Distribution, Memphis TN" full/>
          <F l="Commodity"                  k="commodity"     ph="General Freight"/>
          <F l="Pickup Date"                k="pickupDate"    type="date"/>
          <F l="Delivery Date"              k="deliveryDate"  type="date"/>
          <F l="Gross Rate ($)"             k="grossRate"     type="number" ph="0.00"/>
          <F l="Notes"                      k="notes"         ph="Optional" full/>
        </div>

        {/* ComCheck */}
        <div style={{ marginTop:16, background:C.bg, borderRadius:10,
                      padding:14, border:`1px solid ${C.border}` }}>
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <input type="checkbox" checked={form.hasComcheck}
                   onChange={e => setForm({ ...form, hasComcheck:e.target.checked })}/>
            <span style={{ fontSize:13, fontWeight:700, color:"#fbbf24" }}>
              ⛽ ComCheck / Fuel Advance on This Load
            </span>
          </label>
          {form.hasComcheck && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                          gap:10, marginTop:12 }}>
              {[
                { l:"ComCheck #",  k:"ccNum",  ph:"CC-XXXXX" },
                { l:"Amount ($)",  k:"ccAmt",  type:"number" },
                { l:"Date Issued", k:"ccDate", type:"date"   },
              ].map(f => (
                <div key={f.k}>
                  <span style={lbl}>{f.l}</span>
                  <input type={f.type || "text"} placeholder={f.ph}
                         value={form[f.k] || ""}
                         onChange={e => setForm({ ...form, [f.k]:e.target.value })}
                         style={{ ...inp, color:"#fbbf24", border:"1px solid #78350f80" }}/>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10, marginTop:18 }}>
          <button onClick={save} style={{ ...btn(C.green), fontSize:13, padding:"12px 26px" }}>
            ✓ CREATE LOAD
          </button>
          <button onClick={onCancel} style={ghost}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD DETAIL — full workflow view for a single load
// ─────────────────────────────────────────────────────────────────────────────
function LoadDetail({
  load, users, user, isCarrier, shippers, setShippers,
  onUpdate, onAdvance, uploadDoc, fileRefs, onBack, setPage,
}) {
  const [showInvoice, setShowInvoice] = useState(false);
  const [showPay,     setShowPay]     = useState(false);
  const [showEmail,   setShowEmail]   = useState(false);
  const [payAmt,      setPayAmt]      = useState(load.paidAmount || load.grossRate || "");
  const [newExp,      setNewExp]      = useState({ desc:"", amount:"" });

  const driver  = users.find(u => u.id === load.driverId);
  const si      = stageIdx(load.stage);
  const st      = STAGES[si] || STAGES[0];
  const sc      = st.color;
  const isFirst = si === 0;
  const isLast  = si === STAGE_KEYS.length - 1;

  const canAct = st.who === "both"
    || (st.who === "carrier" && isCarrier)
    || (st.who === "driver"  && load.driverId === user.id);

  const { pct, carrierCut, driverNet, comcheck, invoiceTotal, expenses, driverProfit }
    = calcLoad(load, users);

  const set   = (f, v) => onUpdate(load.id, { [f]:v });
  const setCC = (f, v) => onUpdate(load.id, { comcheck:{ ...load.comcheck, [f]:v } });

  const addExp = () => {
    if (!newExp.desc || !newExp.amount) return;
    onUpdate(load.id, {
      expenses:[...(load.expenses || []),
                { id:Date.now(), desc:newExp.desc, amount:parseFloat(newExp.amount) }],
    });
    setNewExp({ desc:"", amount:"" });
  };

  const handleAdvance = () => {
    if (load.stage === "invoiced") { setShowPay(true); return; }
    if (load.stage === "delivered" || load.stage === "billing") { setShowInvoice(true); return; }
    onAdvance(load.id);
  };

  const handleGoBack = () => onAdvance(load.id, prevStage(load.stage));

  const confirmPaid = () => {
    onUpdate(load.id, {
      stage:"paid", paidAmount:parseFloat(payAmt),
      stageHistory:{ ...load.stageHistory, paid:today() },
    });
    setShowPay(false);
  };

  const openEmail = type => {
    const subj = `ETTR Invoice — Load ${load.loadNumber} — ${load.origin} to ${load.destination}`;
    const body = `Please find attached billing for Load #${load.loadNumber}.\n\n`
      + `Pickup: ${load.origin}\nDelivery: ${load.destination}\n`
      + `Delivery Date: ${load.deliveryDate}\nTrucking: ${fmt(load.grossRate)}\n`
      + `Lumper: ${fmt(load.lumperAmount || 0)}\nDetention: ${fmt(load.detentionAmount || 0)}\n`
      + `Total Due: ${fmt((load.grossRate || 0) + (load.lumperAmount || 0) + (load.detentionAmount || 0))}\n\n`
      + `Attached: ETTR Invoice, Rate Confirmation, Signed BOL, POD, Receipts\n\n`
      + `Thank you,\nBruce Edgerton\nEdgerton Truck & Trailer Repair\n715-509-0114\nMC#699644`;
    const to = load.brokerContact || "";

    if (type === "gmail")
      window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`);
    else if (type === "zoho")
      window.open(`https://mail.zoho.com/zm/#compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subj)}`);
    else
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;

    onUpdate(load.id, { stage:"invoiced", stageHistory:{ ...load.stageHistory, invoiced:today() } });
    setShowEmail(false);
    setShowInvoice(false);
  };

  // ── Section wrapper ──
  const Sec = ({ t, children, bc }) => (
    <div style={card({ marginBottom:14, borderColor:bc || C.border })}>
      <div style={{ fontSize:10, color:C.accent, fontWeight:900,
                    letterSpacing:1.5, marginBottom:14 }}>{t}</div>
      {children}
    </div>
  );

  // ── Label-value row ──
  const Row = ({ l, v, vc, big }) => (
    <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:8 }}>
      <span style={{ fontSize:big ? 12 : 11, color:C.dim }}>{l}</span>
      <span style={{ fontSize:big ? 18 : 13, fontWeight:big ? 900 : 700, color:vc || C.text }}>{v}</span>
    </div>
  );

  // ── Document upload box ──
  const DocBox = ({ docKey, label, required }) => {
    const hasDoc = load.docNames?.[docKey];
    const idbKey = `load_${load.id}_${docKey}`;
    if (!fileRefs.current[load.id]) fileRefs.current[load.id] = {};
    return (
      <div style={{ background:C.bg, borderRadius:10, padding:14,
                    border:`1px solid ${hasDoc ? C.green + "40" : C.border}` }}>
        <div style={{ ...lbl, color:required && !hasDoc ? C.yellow : C.dim }}>
          {label}{required && !hasDoc ? " ⚠" : ""}
        </div>
        {hasDoc && (
          <StoredFile idbKey={idbKey} fileName={hasDoc}
                      imgStyle={{ width:"100%", maxHeight:100, objectFit:"contain",
                                  borderRadius:6, marginBottom:8 }}/>
        )}
        {!hasDoc && (
          <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>Not uploaded</div>
        )}
        {/* File picker */}
        <input type="file" accept="*/*"
               ref={el => { if (!fileRefs.current[load.id]) fileRefs.current[load.id] = {};
                             fileRefs.current[load.id][docKey + "_file"] = el; }}
               onChange={e => uploadDoc(load.id, docKey, e.target.files[0])}
               style={{ display:"none" }}/>
        {/* Camera */}
        <input type="file" accept="image/*" capture="environment"
               ref={el => { if (!fileRefs.current[load.id]) fileRefs.current[load.id] = {};
                             fileRefs.current[load.id][docKey + "_cam"] = el; }}
               onChange={e => uploadDoc(load.id, docKey, e.target.files[0])}
               style={{ display:"none" }}/>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <button onClick={() => fileRefs.current[load.id]?.[docKey + "_file"]?.click()}
                  style={{ ...ghost, fontSize:11, padding:"7px 12px",
                           display:"flex", alignItems:"center", gap:4 }}>
            📎 {hasDoc ? "Replace" : "Import File / PDF"}
          </button>
          <button onClick={() => fileRefs.current[load.id]?.[docKey + "_cam"]?.click()}
                  style={{ ...ghost, fontSize:11, padding:"7px 12px",
                           display:"flex", alignItems:"center", gap:4 }}>
            📷 Take Photo
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Invoice modal */}
      {showInvoice && (
        <ETTRInvoice
          load={load} users={users}
          onClose={() => setShowInvoice(false)}
          onEmail={() => setShowEmail(true)}
          onMarkInvoiced={() => {
            onUpdate(load.id, { stage:"invoiced",
              stageHistory:{ ...load.stageHistory, invoiced:today() } });
            setShowInvoice(false);
          }}
        />
      )}

      {/* Email modal */}
      {showEmail && (
        <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:999,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={card({ maxWidth:400, width:"90%", borderColor:"#ec4899" })}>
            <div style={{ fontSize:14, fontWeight:900, color:"#fff", marginBottom:6 }}>
              📤 Send Billing Package
            </div>
            <div style={{ fontSize:11, color:C.dim, marginBottom:20 }}>
              Opens your email app with the billing package pre-filled.
              Attach your docs manually or from the document section below.
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={() => openEmail("gmail")}   style={btn("#ea4335")}>📧 Open in Gmail</button>
              <button onClick={() => openEmail("zoho")}    style={btn("#e04a28")}>📧 Open in Zoho Mail</button>
              <button onClick={() => openEmail("default")} style={btn(C.card2, "#fff")}>📧 Open in Device Mail App</button>
              <button onClick={() => setShowEmail(false)} style={ghost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Top nav */}
      <div style={{ display:"flex", gap:10, marginBottom:18,
                    alignItems:"center", flexWrap:"wrap" }}>
        <button onClick={onBack} style={ghost}>← Back to Loads</button>
        <span style={{ color:C.border }}>|</span>
        <span style={{ fontSize:12, color:C.dim }}>
          {brokerName(load)} · {load.loadNumber}
        </span>
      </div>

      {/* ── STAGE BAR ── */}
      <div style={{ background:`${sc}12`, border:`2px solid ${sc}50`,
                    borderRadius:12, padding:20, marginBottom:18 }}>
        {/* Progress track */}
        <div style={{ display:"flex", gap:0, marginBottom:16, overflowX:"auto" }}>
          {STAGES.map((s, i) => {
            const done = i < si;
            const cur  = i === si;
            return (
              <div key={s.key} style={{ display:"flex", alignItems:"center", flex:1, minWidth:0 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:"0 0 auto" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%",
                                background:done ? C.green : cur ? s.color : C.card2,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:15, border:`2px solid ${done ? C.green : cur ? s.color : C.border}`,
                                transition:"all .3s" }}>
                    {done ? "✓" : s.icon}
                  </div>
                  <div style={{ fontSize:8, color:done ? C.green : cur ? s.color : C.border,
                                textAlign:"center", marginTop:3, maxWidth:60,
                                lineHeight:1.2, letterSpacing:0.5 }}>
                    {s.label}
                  </div>
                </div>
                {i < STAGES.length - 1 && (
                  <div style={{ flex:1, height:2, background:done ? C.green : C.card2,
                                margin:"0 2px", marginBottom:16, transition:"background .3s" }}/>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize:18, fontWeight:900, color:sc, marginBottom:4 }}>
          {st.icon} {st.label}
        </div>
        <div style={{ fontSize:12, color:C.dim, marginBottom:16 }}>{st.desc}</div>

        {/* Back / Forward buttons */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          {!isFirst && (
            <button onClick={handleGoBack}
                    style={{ ...btn(C.card2, "#94a3b8"), border:`1px solid ${C.border}` }}>
              ← Go Back a Step
            </button>
          )}
          {!isLast && canAct && !showPay && (
            <button onClick={handleAdvance}
                    style={{ ...btn(sc), fontSize:13, padding:"12px 28px",
                             boxShadow:`0 0 20px ${sc}50` }}>
              {st.action} →
            </button>
          )}
          {!isLast && !canAct && (
            <span style={{ fontSize:12, color:C.muted, fontStyle:"italic" }}>
              Waiting on {st.who === "driver" ? "driver" : "carrier"} action
            </span>
          )}
          {showPay && (
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:12, color:"#94a3b8" }}>Amount received ($):</span>
              <input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)}
                     style={{ ...inp, width:130, border:`1px solid ${C.green}` }}/>
              <button onClick={confirmPaid} style={btn(C.green)}>✓ Confirm Paid</button>
              <button onClick={() => setShowPay(false)} style={ghost}>Cancel</button>
            </div>
          )}
          {isLast && (
            <div style={{ fontSize:14, color:C.green, fontWeight:900 }}>
              ✓ LOAD COMPLETE — PAID {load.paidAmount ? fmt(load.paidAmount) : ""}
            </div>
          )}
        </div>

        {/* Stage history */}
        <div style={{ marginTop:14, display:"flex", gap:8, flexWrap:"wrap" }}>
          {STAGES.map(s => {
            const d = load.stageHistory?.[s.key];
            if (!d) return null;
            return (
              <span key={s.key} style={{ fontSize:10, color:C.dim,
                                         background:C.card2, borderRadius:4, padding:"2px 8px" }}>
                {s.icon} {d}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Stage-specific document uploads ── */}
      {(load.stage === "rate_con" || load.stage === "accepted") && (
        <Sec t="📋 RATE CONFIRMATION DOCUMENTS" bc="#3b82f640">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <DocBox docKey="rateCon" label="Rate Con — Original (upload or photo)" required/>
            {load.stage === "accepted" && (
              <DocBox docKey="rateConSigned" label="Rate Con — Signed/Accepted copy"/>
            )}
          </div>
          {load.stage === "rate_con" && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, color:C.dim, marginBottom:10 }}>
                After uploading the rate con, confirm acceptance and the app will generate an email to the broker.
              </div>
              <button onClick={() => setShowEmail(true)}
                      style={{ ...btn("#06b6d4"), marginRight:8 }}>
                ✉️ Confirm Acceptance &amp; Email Broker
              </button>
            </div>
          )}
        </Sec>
      )}

      {(load.stage === "at_pickup" || load.stage === "in_transit") && (
        <Sec t="🏭 PICKUP DOCUMENTS — BOL FROM SHIPPER" bc="#f59e0b40">
          <div style={{ fontSize:11, color:C.dim, marginBottom:12 }}>
            Get the BOL from the shipper. Upload unsigned first, then upload signed after shipper signs.
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <DocBox docKey="bolUnsigned" label="BOL — Unsigned (get from shipper)"/>
            <DocBox docKey="bolSigned"   label="BOL — Signed by Shipper" required/>
          </div>
        </Sec>
      )}

      {(load.stage === "delivered" || load.stage === "billing") && (
        <Sec t="📦 DELIVERY DOCUMENTS — RECEIVER SIGNED" bc="#84cc1640">
          <div style={{ fontSize:11, color:C.dim, marginBottom:12 }}>
            Upload signed BOL from receiver, POD, and any lumper or incidental receipts.
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <DocBox docKey="pod"    label="POD — Proof of Delivery (receiver signed)" required/>
            <DocBox docKey="lumper" label="Lumper / Unload Receipt (if applicable)"/>
          </div>
        </Sec>
      )}

      {/* Billing section — from delivered onwards */}
      {stageIdx(load.stage) >= stageIdx("delivered") && (
        <Sec t="🧾 BILLING PACKAGE — SEND TO BROKER" bc="#ec489940">
          <div style={{ fontSize:11, color:C.dim, marginBottom:14 }}>
            Both Tim and Bruce can submit billing. The package includes the ETTR invoice,
            rate con, signed BOL, POD, and all receipts.
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
            {[
              { k:"rateCon",  l:"Rate Con"    },
              { k:"bolSigned",l:"Signed BOL"  },
              { k:"pod",      l:"POD"         },
              { k:"lumper",   l:"Lumper Rcpt" },
              { k:"invoice",  l:"ETTR Invoice"},
            ].map(d => {
              const has = load.docNames?.[d.k];
              return (
                <div key={d.k} style={{ display:"flex", alignItems:"center", gap:6,
                                        background:C.card2, borderRadius:7, padding:"8px 10px",
                                        border:`1px solid ${has ? C.green + "40" : C.border}` }}>
                  <span>{has ? "✅" : "⬜"}</span>
                  <span style={{ fontSize:10, color:has ? C.green : C.muted, fontWeight:700 }}>
                    {d.l}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={() => setShowInvoice(true)} style={btn("#7c3aed")}>
              🧾 Preview ETTR Invoice
            </button>
            <button onClick={() => window.print()} style={btn(C.card2, "#94a3b8")}>
              🖨️ Print Package
            </button>
            <button onClick={() => setShowEmail(true)} style={btn("#ec4899")}>
              📤 Email to Broker
            </button>
          </div>
        </Sec>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {/* Left column */}
        <div>
          <Sec t="📍 LOAD DETAILS">
            {[
              { l:"Load #",        k:"loadNumber",   ed:isCarrier },
              { l:"Broker",        k:"broker",       ed:false,    v:brokerName(load) },
              { l:"Driver",        k:"driver",       ed:false,    v:driver?.name },
              { l:"Pickup",        k:"origin",       ed:isCarrier },
              { l:"Delivery",      k:"destination",  ed:isCarrier },
              { l:"Shipper",       k:"shipper",      ed:true },
              { l:"Receiver",      k:"receiver",     ed:true },
              { l:"Commodity",     k:"commodity",    ed:true },
              { l:"Pickup Date",   k:"pickupDate",   ed:true, type:"date" },
              { l:"Delivery Date", k:"deliveryDate", ed:true, type:"date" },
              { l:"Broker Email",  k:"brokerContact",ed:isCarrier, type:"email" },
            ].map(f => (
              <div key={f.k} style={{ marginBottom:10 }}>
                <span style={lbl}>{f.l}</span>
                {f.ed !== false
                  ? <input type={f.type || "text"}
                           value={f.v !== undefined ? f.v : (load[f.k] || "")}
                           onChange={e => set(f.k, e.target.value)}
                           style={inp}
                           readOnly={f.ed === false}/>
                  : <div style={{ fontSize:13, color:C.text, fontWeight:600,
                                  padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                      {f.v || load[f.k] || "—"}
                    </div>
                }
              </div>
            ))}
            {isCarrier && (
              <div style={{ marginTop:8 }}>
                <span style={lbl}>Reassign Driver</span>
                <select value={load.driverId}
                        onChange={e => set("driverId", e.target.value)} style={inp}>
                  {users.filter(u => !u.deleted).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
          </Sec>

          {/* ComCheck */}
          <Sec t="⛽ COMCHECK / FUEL ADVANCE">
            {load.comcheck ? (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <span style={lbl}>ComCheck #</span>
                  <input value={load.comcheck.number || ""}
                         onChange={e => setCC("number", e.target.value)}
                         style={{ ...inp, color:"#fbbf24" }}/>
                </div>
                <div>
                  <span style={lbl}>Amount ($)</span>
                  <input type="number" value={load.comcheck.amount || ""}
                         onChange={e => setCC("amount", parseFloat(e.target.value))}
                         style={{ ...inp, color:"#fbbf24" }}/>
                </div>
                <div>
                  <span style={lbl}>Date Issued</span>
                  <input type="date" value={load.comcheck.dateIssued || ""}
                         onChange={e => setCC("dateIssued", e.target.value)}
                         style={{ ...inp, color:"#fbbf24" }}/>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ color:C.muted, fontSize:12, marginBottom:10 }}>
                  No ComCheck on this load.
                </div>
                <button onClick={() => set("comcheck", { number:"", amount:0, dateIssued:today() })}
                        style={btn("#78350f", "#fbbf24")}>
                  + Add ComCheck
                </button>
              </div>
            )}
          </Sec>
        </div>

        {/* Right column */}
        <div>
          <Sec t="💵 FINANCIALS — TRANSPARENT">
            <Row l="Gross Rate (Rate Con)" v={fmt(load.grossRate)} vc={C.text} big/>
            <Row l={`Carrier Commission (${pct}%)`} v={`− ${fmt(carrierCut)}`} vc="#a78bfa"/>
            <Row l={`Driver Net — ${driver?.name?.split(" ")[0]}`} v={fmt(driverNet)} vc={C.accent}/>
            {load.comcheck && <Row l="ComCheck Advance" v={`− ${fmt(comcheck)}`} vc="#fbbf24"/>}
            {isCarrier && <Row l="Broker Invoice Total" v={fmt(invoiceTotal)} vc="#ec4899"/>}

            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, marginTop:8 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                            gap:8, marginBottom:12 }}>
                {[
                  { l:"Trucking ($)",   k:"grossRate" },
                  { l:"Lumper ($)",     k:"lumperAmount" },
                  { l:"Detention ($)",  k:"detentionAmount" },
                ].map(f => (
                  <div key={f.k}>
                    <span style={lbl}>{f.l}</span>
                    <input type="number" value={load[f.k] || ""}
                           onChange={e => set(f.k, parseFloat(e.target.value) || 0)} style={inp}/>
                  </div>
                ))}
              </div>
              <Row l="Driver Actual Profit" v={fmt(driverProfit)} vc={C.green} big/>
            </div>

            {load.stage === "paid" && load.paidAmount && (
              <div style={{ marginTop:10, background:"#052e1620",
                            border:`1px solid ${C.green}30`, borderRadius:8, padding:12 }}>
                <span style={lbl}>Payment Received</span>
                <div style={{ fontSize:22, fontWeight:900, color:C.green }}>
                  {fmt(load.paidAmount)}
                </div>
              </div>
            )}
          </Sec>

          {/* Expenses */}
          <Sec t="🧾 LOAD EXPENSES (driver — no fuel)">
            {(load.expenses || []).map(exp => (
              <div key={exp.id}
                   style={{ display:"flex", justifyContent:"space-between",
                            alignItems:"center", background:C.bg, borderRadius:7,
                            padding:"8px 12px", marginBottom:6 }}>
                <span style={{ fontSize:12 }}>{exp.desc}</span>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ color:"#f87171", fontWeight:700 }}>{fmt(exp.amount)}</span>
                  <button onClick={() => onUpdate(load.id,
                                         { expenses:load.expenses.filter(e => e.id !== exp.id) })}
                          style={{ background:"none", border:"none", color:C.muted, cursor:"pointer",
                                   WebkitTapHighlightColor:"transparent" }}>✕</button>
                </div>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <input placeholder="Scale ticket, lumper, etc. (not fuel)"
                     value={newExp.desc}
                     onChange={e => setNewExp({ ...newExp, desc:e.target.value })}
                     style={{ ...inp, flex:1 }}/>
              <input type="number" placeholder="$" value={newExp.amount}
                     onChange={e => setNewExp({ ...newExp, amount:e.target.value })}
                     style={{ ...inp, width:80 }}/>
              <button onClick={addExp} style={btn()}>+</button>
            </div>
          </Sec>
        </div>
      </div>

      {/* All documents */}
      <Sec t="📁 ALL LOAD DOCUMENTS">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          <DocBox docKey="rateCon"     label="Rate Confirmation"/>
          <DocBox docKey="bolUnsigned" label="BOL — Unsigned"/>
          <DocBox docKey="bolSigned"   label="BOL — Signed"/>
          <DocBox docKey="lumper"      label="Lumper Receipt"/>
          <DocBox docKey="pod"         label="POD — Proof of Delivery"/>
          <DocBox docKey="invoice"     label="ETTR Invoice"/>
        </div>
      </Sec>

      {/* Notes */}
      <Sec t="📝 NOTES">
        <textarea value={load.notes || ""} onChange={e => set("notes", e.target.value)}
                  style={{ ...inp, minHeight:80, resize:"vertical" }}
                  placeholder="Load notes, special instructions, etc."/>
      </Sec>

      {isCarrier && (
        <RemoveLoad loadId={load.id} onRemove={() => {
          onUpdate(load.id, { deleted:true });
          onBack();
        }}/>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REMOVE LOAD — double-confirm before soft-delete
// ─────────────────────────────────────────────────────────────────────────────
function RemoveLoad({ loadId, onRemove }) {
  const [step, setStep] = useState(0);
  return (
    <div style={{ textAlign:"right", marginTop:16 }}>
      {step === 0 && (
        <button onClick={() => setStep(1)} style={ghost}>🗑 Remove Load</button>
      )}
      {step === 1 && (
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", alignItems:"center" }}>
          <span style={{ fontSize:12, color:C.red }}>Are you sure? This cannot be undone.</span>
          <button onClick={onRemove} style={btn(C.red)}>⚠️ Yes, Remove</button>
          <button onClick={() => setStep(0)} style={ghost}>Cancel</button>
        </div>
      )}
    </div>
  );
}
