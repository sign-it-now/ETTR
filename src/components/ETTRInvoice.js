// ─────────────────────────────────────────────────────────────────────────────
// ETTR INVOICE — printable invoice modal
// ─────────────────────────────────────────────────────────────────────────────
import { C, btn, ghost } from "../styles";
import { fmt, today, brokerName } from "../constants";

export default function ETTRInvoice({ load, users, onClose, onEmail, onMarkInvoiced }) {
  const brok      = brokerName(load);
  const trucking  = load.grossRate    || 0;
  const lumper    = load.lumperAmount || 0;
  const detention = load.detentionAmount || 0;
  const total     = trucking + lumper + detention;

  return (
    <div style={{ position:"fixed", inset:0, background:"#000d", zIndex:1000,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  padding:20, overflowY:"auto" }}>
      <div style={{ background:"#fff", borderRadius:12, width:"100%",
                    maxWidth:600, color:"#111", fontFamily:"Georgia,serif", padding:44 }}>

        <div style={{ textAlign:"center", marginBottom:20,
                      borderBottom:"1px solid #ccc", paddingBottom:16 }}>
          <div style={{ fontSize:18, fontWeight:700, letterSpacing:1 }}>
            Edgerton Truck &amp; Trailer Repair
          </div>
        </div>

        <div style={{ display:"flex", justifyContent:"space-between",
                      marginBottom:24, flexWrap:"wrap", gap:16 }}>
          <div style={{ fontSize:13, lineHeight:1.9 }}>
            <div style={{ fontWeight:700 }}>Bruce Edgerton</div>
            <div>N4202 Hill Rd</div>
            <div>Bonduel WI 54107</div>
            <div>MC#699644</div>
            <div style={{ marginTop:6 }}>bruce.edgerton@yahoo.com</div>
            <div>715-509-0114</div>
          </div>
          <div style={{ fontSize:13, lineHeight:2.2 }}>
            {[
              { l:"Date Sent:", v:today() },
              { l:"Load #",     v:load.loadNumber },
              { l:"Pick up:",   v:load.origin },
              { l:"Delivery:",  v:load.destination },
              { l:"Del. Date:", v:load.deliveryDate },
            ].map(r => (
              <div key={r.l} style={{ display:"flex", gap:12 }}>
                <span style={{ color:"#666", minWidth:80 }}>{r.l}</span>
                <span style={{ borderBottom:"1px solid #000", minWidth:140 }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:13, color:"#666" }}>Bill to:</span>
            <span style={{ borderBottom:"1px solid #000", minWidth:200,
                           fontSize:14, fontWeight:700, paddingLeft:4 }}>
              {brok}
            </span>
          </div>
        </div>

        <div style={{ fontSize:13, color:"#444", marginBottom:16 }}>
          Please remit payment amount for transport services
        </div>

        <div style={{ fontSize:14, lineHeight:2.4 }}>
          {[
            { l:"Trucking:",  v:trucking },
            { l:"Pallets:",   v:0 },
            { l:"Lumpers:",   v:lumper },
            { l:"Detention:", v:detention },
          ].map(r => (
            <div key={r.l} style={{ display:"flex", gap:12, alignItems:"center" }}>
              <span style={{ width:110, color:"#666" }}>{r.l}</span>
              <span style={{ borderBottom:"1px solid #ccc", minWidth:140,
                             fontWeight:r.v ? 700 : 400 }}>
                {r.v ? fmt(r.v) : ""}
              </span>
            </div>
          ))}
          <div style={{ display:"flex", gap:12, marginTop:8,
                        borderTop:"2px solid #000", paddingTop:8 }}>
            <span style={{ width:110, fontWeight:700 }}>Total:</span>
            <span style={{ minWidth:140, fontWeight:900, fontSize:18 }}>{fmt(total)}</span>
          </div>
        </div>

        <div style={{ marginTop:24, background:"#f8f9fa", borderRadius:8,
                      padding:12, fontSize:11, color:"#666" }}>
          <div style={{ fontWeight:700, marginBottom:6 }}>ATTACHED DOCUMENTS:</div>
          {[
            ["Rate Confirmation", load.docNames?.rateCon],
            ["Signed BOL",        load.docNames?.bolSigned],
            ["Proof of Delivery", load.docNames?.pod],
            ["Lumper Receipt",    load.docNames?.lumper],
          ].filter(d => d[1]).map(d => (
            <div key={d[0]}>✓ {d[0]}: {d[1]}</div>
          ))}
        </div>

        <div style={{ marginTop:28, textAlign:"right" }}>
          <div style={{ fontSize:13, marginBottom:4 }}>Thank You</div>
          <div style={{ fontFamily:"cursive", fontSize:22 }}>Bruce Edgerton</div>
        </div>

        <div style={{ display:"flex", gap:10, marginTop:24,
                      justifyContent:"center", flexWrap:"wrap" }}>
          <button
            onClick={onEmail}
            style={{ ...btn("#ec4899"), fontFamily:"'Courier New',monospace" }}
          >
            📤 Email to Broker
          </button>
          <button
            onClick={() => { onMarkInvoiced(); onClose(); }}
            style={{ ...btn(C.green), fontFamily:"'Courier New',monospace" }}
          >
            ✓ Mark Invoiced
          </button>
          <button
            onClick={() => window.print()}
            style={{ ...btn(C.card1, "#94a3b8"), fontFamily:"'Courier New',monospace" }}
          >
            🖨️ Print
          </button>
          <button
            onClick={onClose}
            style={{ ...ghost, fontFamily:"'Courier New',monospace" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
