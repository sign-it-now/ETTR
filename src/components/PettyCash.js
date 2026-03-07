// ─────────────────────────────────────────────────────────────────────────────
// PETTY CASH
// Rules:
//  - Uploading a receipt does NOT mark anything paid — it is a supporting doc only
//  - Mark Paid is a separate explicit action by either Tim or Bruce
//  - Camera and file picker are always two separate buttons
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from "react";
import { C, card, lbl, inp, btn, ghost } from "../styles";
import { PETTY_CATS, fmt, today } from "../constants";

export default function PettyCash({ user, petty, setPetty, isCarrier, setPage }) {
  const [showAdd,    setShowAdd]    = useState(false);
  const [ne,         setNe]         = useState({
    date:today(), description:"", vendor:"", amount:"",
    category:"Repairs & Maintenance", paidBy:"Bruce", notes:"",
    attachUrl:null, attachName:null,
  });
  const [del,        setDel]        = useState({ id:null, step:0 });
  const [viewModal,  setViewModal]  = useState(null);

  // Per-entry refs for file and camera
  const fileRefs   = useRef({});
  const camRefs    = useRef({});
  const newFileRef = useRef(null);
  const newCamRef  = useRef(null);

  const active = petty.filter(p => !p.deleted);
  const owed   = active.filter(p => p.status === "unpaid").reduce((s, p) => s + p.amount, 0);
  const paid   = active.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  const handleNewAttach = file => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setNe(prev => ({ ...prev, attachUrl:url, attachName:file.name }));
  };

  const addEntry = () => {
    if (!ne.description || !ne.amount || isNaN(parseFloat(ne.amount))) return;
    setPetty(prev => [...prev, {
      id:          `pc-${Date.now()}`,
      date:        ne.date,
      description: ne.description,
      vendor:      ne.vendor,
      amount:      parseFloat(ne.amount),
      category:    ne.category,
      paidBy:      ne.paidBy,
      notes:       ne.notes,
      attachUrl:   ne.attachUrl,
      attachName:  ne.attachName,
      receiptUrl:  null,
      receiptName: null,
      status:      "unpaid",
      paidDate:    null,
      paidBy2:     null,
      deleted:     false,
    }]);
    setNe({ date:today(), description:"", vendor:"", amount:"",
             category:"Repairs & Maintenance", paidBy:"Bruce", notes:"",
             attachUrl:null, attachName:null });
    setShowAdd(false);
  };

  // Attaching a doc does NOT mark paid
  const attachDoc = (id, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPetty(prev => prev.map(p => p.id === id ? { ...p, receiptUrl:url, receiptName:file.name } : p));
  };

  const markPaid   = id => setPetty(prev => prev.map(p =>
    p.id === id ? { ...p, status:"paid",   paidDate:today(), paidBy2:user.name } : p));
  const markUnpaid = id => setPetty(prev => prev.map(p =>
    p.id === id ? { ...p, status:"unpaid", paidDate:null,    paidBy2:null }      : p));

  const softDel = id => {
    if (del.id === id && del.step === 1) {
      setPetty(prev => prev.map(p => p.id === id ? { ...p, deleted:true } : p));
      setDel({ id:null, step:0 });
    } else {
      setDel({ id, step:1 });
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:8 }}>
        <div style={{ fontSize:22, fontWeight:900, color:"#fff" }}>💼 Petty Cash</div>
        <button onClick={() => setShowAdd(!showAdd)} style={btn()}>
          {showAdd ? "✕ Cancel" : "+ Log Expense"}
        </button>
      </div>

      {/* Totals */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:20 }}>
        {[
          { l:"TOTAL OWED TO BRUCE", v:fmt(owed), c:C.red    },
          { l:"PAID BACK",           v:fmt(paid), c:C.green  },
          { l:"OPEN ITEMS",          v:active.filter(p => p.status === "unpaid").length, c:C.yellow },
        ].map(s => (
          <div key={s.l} style={card()}>
            <div style={{ fontSize:9, color:C.dim, letterSpacing:1.5, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontSize:22, fontWeight:900, color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Add entry form */}
      {showAdd && (
        <div style={card({ marginBottom:20, borderColor:C.accent, background:"#0a1929" })}>
          <div style={{ fontSize:11, color:C.accent, fontWeight:900,
                        letterSpacing:1, marginBottom:14 }}>
            LOG EXPENSE — Bruce paid for something Tim owes back
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <span style={lbl}>DATE PAID</span>
              <input type="date" value={ne.date}
                     onChange={e => setNe({ ...ne, date:e.target.value })} style={inp}/>
            </div>
            <div>
              <span style={lbl}>AMOUNT ($)</span>
              <input type="number" placeholder="0.00" value={ne.amount}
                     onChange={e => setNe({ ...ne, amount:e.target.value })} style={inp}/>
            </div>
            <div style={{ gridColumn:"span 2" }}>
              <span style={lbl}>DESCRIPTION — what was it for?</span>
              <input placeholder="e.g. Truck repair at Mike's Inc, tires, supplies..."
                     value={ne.description}
                     onChange={e => setNe({ ...ne, description:e.target.value })} style={inp}/>
            </div>
            <div>
              <span style={lbl}>VENDOR / WHERE</span>
              <input placeholder="Shop name, store, etc." value={ne.vendor}
                     onChange={e => setNe({ ...ne, vendor:e.target.value })} style={inp}/>
            </div>
            <div>
              <span style={lbl}>CATEGORY</span>
              <select value={ne.category}
                      onChange={e => setNe({ ...ne, category:e.target.value })} style={inp}>
                {PETTY_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <span style={lbl}>PAID BY</span>
              <select value={ne.paidBy}
                      onChange={e => setNe({ ...ne, paidBy:e.target.value })} style={inp}>
                <option>Bruce</option>
                <option>Tim</option>
              </select>
            </div>
            <div>
              <span style={lbl}>NOTES (optional)</span>
              <input value={ne.notes}
                     onChange={e => setNe({ ...ne, notes:e.target.value })} style={inp}/>
            </div>
          </div>

          {/* Attach invoice/bill */}
          <div style={{ background:C.bg, borderRadius:10, padding:14,
                        border:`1px solid ${C.border}`, marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.dim, fontWeight:800,
                          marginBottom:4, letterSpacing:1 }}>
              ATTACH INVOICE OR BILL (optional but recommended)
            </div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>
              Upload the receipt or invoice Bruce paid. This does NOT mark anything paid.
            </div>
            {ne.attachName && (
              <div style={{ fontSize:12, color:"#93c5fd", fontWeight:700, marginBottom:8 }}>
                📎 {ne.attachName}
                <button onClick={() => setNe({ ...ne, attachUrl:null, attachName:null })}
                        style={{ background:"none", border:"none", color:C.dim,
                                 cursor:"pointer", marginLeft:8, fontSize:11,
                                 WebkitTapHighlightColor:"transparent" }}>✕</button>
              </div>
            )}
            {ne.attachUrl && (
              <img src={ne.attachUrl} alt="Invoice preview"
                   style={{ width:"100%", maxHeight:160, objectFit:"contain",
                            borderRadius:8, marginBottom:10, border:`1px solid ${C.border}` }}/>
            )}
            <input type="file" accept="*/*" ref={newFileRef}
                   onChange={e => handleNewAttach(e.target.files[0])} style={{ display:"none" }}/>
            <input type="file" accept="image/*" capture="environment" ref={newCamRef}
                   onChange={e => handleNewAttach(e.target.files[0])} style={{ display:"none" }}/>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => newFileRef.current?.click()}
                      style={{ ...ghost, fontSize:11, display:"flex", alignItems:"center", gap:5 }}>
                <span>📎</span> Import File / PDF
              </button>
              <button onClick={() => newCamRef.current?.click()}
                      style={{ ...ghost, fontSize:11, display:"flex", alignItems:"center", gap:5 }}>
                <span>📷</span> Take Photo
              </button>
            </div>
          </div>

          <button onClick={addEntry} style={btn(C.green)}>✓ Save Expense</button>
        </div>
      )}

      {/* Entry list */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {active.length === 0 && (
          <div style={{ ...card({ textAlign:"center", color:C.border, padding:40 }) }}>
            No petty cash entries yet.
          </div>
        )}
        {active.map(entry => {
          const isPaid = entry.status === "paid";
          return (
            <div key={entry.id} style={card({ borderColor:isPaid ? "#22c55e30" : "#ef444430" })}>
              {/* Top row */}
              <div style={{ display:"flex", justifyContent:"space-between",
                            flexWrap:"wrap", gap:8, marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap",
                                marginBottom:6, alignItems:"center" }}>
                    <span style={{ background:isPaid ? "#22c55e20" : "#ef444420",
                                   color:isPaid ? C.green : C.red,
                                   border:`1px solid ${isPaid ? "#22c55e40" : "#ef444440"}`,
                                   borderRadius:5, padding:"3px 10px",
                                   fontSize:11, fontWeight:900, letterSpacing:0.5 }}>
                      {isPaid ? "✓ PAID" : "⚠ OWED"}
                    </span>
                    <span style={{ fontSize:10, color:C.dim }}>{entry.date}</span>
                    <span style={{ fontSize:10, background:"#1e40af20", color:"#93c5fd",
                                   border:"1px solid #1e40af30", borderRadius:4, padding:"1px 7px" }}>
                      {entry.category}
                    </span>
                    <span style={{ fontSize:10, color:C.dim }}>
                      Paid by: <strong style={{ color:C.text }}>{entry.paidBy}</strong>
                    </span>
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{entry.description}</div>
                  {entry.vendor && <div style={{ fontSize:12, color:C.dim }}>📍 {entry.vendor}</div>}
                  {entry.notes  && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{entry.notes}</div>}
                  {isPaid && entry.paidDate && (
                    <div style={{ fontSize:11, color:C.green, marginTop:4 }}>
                      ✓ Marked paid {entry.paidDate}{entry.paidBy2 ? ` by ${entry.paidBy2}` : ""}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:26, fontWeight:900, color:isPaid ? C.green : C.red }}>
                    {fmt(entry.amount)}
                  </div>
                </div>
              </div>

              {/* Supporting documents */}
              <div style={{ background:C.bg, borderRadius:10, padding:14,
                            border:`1px solid ${C.border}`, marginBottom:12 }}>
                <div style={{ fontSize:10, color:C.dim, fontWeight:800,
                              letterSpacing:1, marginBottom:10 }}>SUPPORTING DOCUMENTS</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {/* Original invoice */}
                  <div style={{ background:C.card2, borderRadius:8, padding:10 }}>
                    <div style={{ fontSize:10, color:C.dim, marginBottom:6, fontWeight:700 }}>
                      ORIGINAL INVOICE / BILL
                    </div>
                    {entry.attachName ? (
                      <div>
                        <div style={{ fontSize:11, color:"#93c5fd", marginBottom:6 }}>
                          📎 {entry.attachName}
                        </div>
                        {entry.attachUrl && (
                          <button onClick={() => setViewModal({ url:entry.attachUrl,
                                                                title:entry.description + " — Invoice" })}
                                  style={{ ...ghost, fontSize:10, padding:"5px 10px" }}>
                            👁 View
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize:11, color:C.border }}>Not attached</div>
                    )}
                  </div>

                  {/* Payment receipt */}
                  <div style={{ background:C.card2, borderRadius:8, padding:10 }}>
                    <div style={{ fontSize:10, color:C.dim, marginBottom:6, fontWeight:700 }}>
                      PAYMENT RECEIPT / PROOF PAID
                    </div>
                    {entry.receiptName ? (
                      <div>
                        <div style={{ fontSize:11, color:"#93c5fd", marginBottom:6 }}>
                          📎 {entry.receiptName}
                        </div>
                        {entry.receiptUrl && (
                          <button onClick={() => setViewModal({ url:entry.receiptUrl,
                                                                title:entry.description + " — Receipt" })}
                                  style={{ ...ghost, fontSize:10, padding:"5px 10px" }}>
                            👁 View
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize:11, color:C.border, marginBottom:6 }}>Not uploaded yet</div>
                    )}
                    <input type="file" accept="*/*"
                           ref={el => fileRefs.current[entry.id] = el}
                           onChange={e => attachDoc(entry.id, e.target.files[0])}
                           style={{ display:"none" }}/>
                    <input type="file" accept="image/*" capture="environment"
                           ref={el => camRefs.current[entry.id] = el}
                           onChange={e => attachDoc(entry.id, e.target.files[0])}
                           style={{ display:"none" }}/>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
                      <button onClick={() => fileRefs.current[entry.id]?.click()}
                              style={{ ...ghost, fontSize:10, padding:"5px 10px",
                                       display:"flex", alignItems:"center", gap:4 }}>
                        <span>📎</span> File
                      </button>
                      <button onClick={() => camRefs.current[entry.id]?.click()}
                              style={{ ...ghost, fontSize:10, padding:"5px 10px",
                                       display:"flex", alignItems:"center", gap:4 }}>
                        <span>📷</span> Photo
                      </button>
                    </div>
                    <div style={{ fontSize:9, color:C.border, marginTop:4, fontStyle:"italic" }}>
                      Uploading does NOT mark paid
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                {!isPaid && (
                  <button onClick={() => markPaid(entry.id)}
                          style={{ ...btn(C.green), fontSize:12, padding:"9px 18px" }}>
                    ✓ Mark Paid
                  </button>
                )}
                {isPaid && (
                  <button onClick={() => markUnpaid(entry.id)} style={{ ...ghost, fontSize:11 }}>
                    ↩ Unmark Paid
                  </button>
                )}
                <button onClick={() => softDel(entry.id)}
                        style={{ background:del.id === entry.id ? "#7f1d1d20" : "transparent",
                                 color:del.id === entry.id ? "#fca5a5" : C.muted,
                                 border:`1px solid ${del.id === entry.id ? "#ef444450" : C.border}`,
                                 borderRadius:7, padding:"7px 12px", cursor:"pointer",
                                 fontFamily:"inherit", fontSize:11, fontWeight:700,
                                 WebkitTapHighlightColor:"transparent" }}>
                  {del.id === entry.id ? "⚠️ Confirm Remove" : "🗑 Remove"}
                </button>
                {del.id === entry.id && (
                  <button onClick={() => setDel({ id:null, step:0 })} style={ghost}>Cancel</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* View doc modal */}
      {viewModal && (
        <div onClick={() => setViewModal(null)}
             style={{ position:"fixed", inset:0, background:"#000d",
                      display:"flex", alignItems:"center", justifyContent:"center", zIndex:999 }}>
          <div onClick={e => e.stopPropagation()}
               style={card({ maxWidth:640, width:"90%", maxHeight:"90vh", overflowY:"auto" })}>
            <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:800, color:"#93c5fd" }}>{viewModal.title}</div>
              <button onClick={() => setViewModal(null)}
                      style={{ background:"none", border:"none", color:C.dim,
                               cursor:"pointer", fontSize:20,
                               WebkitTapHighlightColor:"transparent" }}>✕</button>
            </div>
            <img src={viewModal.url} alt="Document"
                 style={{ width:"100%", borderRadius:8, maxHeight:500, objectFit:"contain" }}/>
          </div>
        </div>
      )}
    </div>
  );
}
