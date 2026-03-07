// ─────────────────────────────────────────────────────────────────────────────
// TRAILERS
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, card, lbl, inp, btn } from "../styles";

const TRAILER_TYPES = ["Dry Van","Reefer","Flatbed","Step Deck","Lowboy","Tanker","Other"];

export default function Trailers({ user, trailers, setTrailers, isCarrier, setPage }) {
  const [showAdd, setShowAdd] = useState(false);
  const [nt, setNt] = useState({
    unit:"", make:"", year:"", vin:"", plate:"", type:"Dry Van", notes:"",
  });

  const add = () => {
    setTrailers([...trailers, { id:`tr-${Date.now()}`, ...nt, deleted:false }]);
    setNt({ unit:"", make:"", year:"", vin:"", plate:"", type:"Dry Van", notes:"" });
    setShowAdd(false);
  };

  const active = trailers.filter(t => !t.deleted);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:8 }}>
        <div style={{ fontSize:22, fontWeight:900, color:"#fff" }}>🔲 Trailers</div>
        {isCarrier && (
          <button onClick={() => setShowAdd(!showAdd)} style={btn()}>
            {showAdd ? "✕ Cancel" : "+ Add Trailer"}
          </button>
        )}
      </div>

      {showAdd && (
        <div style={card({ marginBottom:18, borderColor:C.accent })}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[
              { l:"UNIT #",  k:"unit"  },
              { l:"MAKE",    k:"make"  },
              { l:"YEAR",    k:"year",  type:"number" },
              { l:"VIN",     k:"vin"   },
              { l:"PLATE",   k:"plate" },
              { l:"NOTES",   k:"notes" },
            ].map(f => (
              <div key={f.k}>
                <span style={lbl}>{f.l}</span>
                <input type={f.type || "text"} value={nt[f.k]}
                       onChange={e => setNt({ ...nt, [f.k]:e.target.value })} style={inp}/>
              </div>
            ))}
            <div>
              <span style={lbl}>TYPE</span>
              <select value={nt.type}
                      onChange={e => setNt({ ...nt, type:e.target.value })} style={inp}>
                {TRAILER_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <button onClick={add} style={{ ...btn(), marginTop:14 }}>✓ Save</button>
        </div>
      )}

      {active.length === 0 && (
        <div style={{ ...card({ textAlign:"center", color:C.border, padding:40 }) }}>
          No trailers yet.
        </div>
      )}

      {active.map(t => (
        <div key={t.id} style={card({ marginBottom:10 })}>
          <div style={{ fontSize:14, fontWeight:800, color:C.text }}>
            {t.unit ? `${t.unit} — ` : ""}{t.make} {t.year}
          </div>
          <div style={{ fontSize:11, color:C.dim }}>
            {t.type} · VIN: {t.vin || "—"} · Plate: {t.plate || "—"}
          </div>
          {t.notes && <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{t.notes}</div>}
        </div>
      ))}
    </div>
  );
}
