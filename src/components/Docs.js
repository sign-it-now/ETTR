// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS — compliance docs, CDL, insurance, permits, etc.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, card, lbl, inp, btn } from "../styles";
import { today } from "../constants";

const DOC_TYPES = [
  "CDL","Medical Examiner Certificate","Form 2290 (HVUT)","IFTA License",
  "Operating Authority","COI (Insurance)","W-9","Annual Inspection Report",
  "Plate Registration","Other",
];

export default function Docs({ user, documents, setDocuments, isCarrier, setPage }) {
  const docs = documents || [];
  const [showAdd, setShowAdd] = useState(false);
  const [nd, setNd] = useState({ name:"", type:"CDL", expiry:"", notes:"" });

  const add = () => {
    setDocuments([...docs, {
      id:`doc-${Date.now()}`, ...nd,
      uploadDate:today(), driverId:user.id, deleted:false,
    }]);
    setShowAdd(false);
  };

  const active = docs.filter(d =>
    !d.deleted && (isCarrier || d.driverId === user.id)
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:8 }}>
        <div style={{ fontSize:22, fontWeight:900, color:"#fff" }}>📄 Documents</div>
        <button onClick={() => setShowAdd(!showAdd)} style={btn()}>
          {showAdd ? "✕ Cancel" : "+ Add Document"}
        </button>
      </div>

      {showAdd && (
        <div style={card({ marginBottom:18, borderColor:C.accent })}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <span style={lbl}>TYPE</span>
              <select value={nd.type}
                      onChange={e => setNd({ ...nd, type:e.target.value })} style={inp}>
                {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <span style={lbl}>NAME</span>
              <input value={nd.name}
                     onChange={e => setNd({ ...nd, name:e.target.value })} style={inp}/>
            </div>
            <div>
              <span style={lbl}>EXPIRY DATE</span>
              <input type="date" value={nd.expiry}
                     onChange={e => setNd({ ...nd, expiry:e.target.value })} style={inp}/>
            </div>
            <div>
              <span style={lbl}>NOTES</span>
              <input value={nd.notes}
                     onChange={e => setNd({ ...nd, notes:e.target.value })} style={inp}/>
            </div>
          </div>
          <button onClick={add} style={{ ...btn(), marginTop:14 }}>✓ Save</button>
        </div>
      )}

      {active.length === 0 && (
        <div style={{ ...card({ textAlign:"center", color:C.border, padding:40 }) }}>
          No documents yet.
        </div>
      )}

      {active.map(doc => {
        const expiring = doc.expiry && new Date(doc.expiry) < new Date(Date.now() + 30 * 86400000);
        return (
          <div key={doc.id}
               style={card({ marginBottom:10, borderColor:expiring ? "#f59e0b40" : C.border })}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:C.text }}>
                  {doc.name || doc.type}
                </div>
                <div style={{ fontSize:11, color:C.dim }}>
                  {doc.type} · Added: {doc.uploadDate}
                </div>
                {doc.notes && (
                  <div style={{ fontSize:11, color:C.muted }}>{doc.notes}</div>
                )}
              </div>
              {doc.expiry && (
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:11, color:expiring ? C.yellow : C.dim }}>
                    Expires: {doc.expiry}
                  </div>
                  {expiring && (
                    <div style={{ fontSize:10, color:C.yellow }}>⚠ Expiring soon</div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
