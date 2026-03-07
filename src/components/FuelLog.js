// ─────────────────────────────────────────────────────────────────────────────
// FUEL LOG
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, card, lbl, inp, btn } from "../styles";
import { fmt, today } from "../constants";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export default function FuelLog({ user, trucks, fuelEntries, setFuelEntries, setPage }) {
  const [showAdd, setShowAdd] = useState(false);
  const [nf, setNf] = useState({
    date:today(), state:"IL", gallons:"", ppg:"", location:"", notes:"",
  });

  const add = () => {
    if (!nf.gallons || !nf.ppg) return;
    const entry = {
      id:      `f-${Date.now()}`,
      ...nf,
      gallons: parseFloat(nf.gallons),
      ppg:     parseFloat(nf.ppg),
      total:   parseFloat(nf.gallons) * parseFloat(nf.ppg),
    };
    setFuelEntries(p => [entry, ...p]);
    setNf({ date:today(), state:"IL", gallons:"", ppg:"", location:"", notes:"" });
    setShowAdd(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, color:"#fff" }}>⛽ Fuel Log</div>
          <a href="https://www.nastc.com/fuel-network/" target="_blank" rel="noreferrer"
             style={{ fontSize:11, color:C.accent }}>NASTC Fuel Network ↗</a>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={btn()}>
          {showAdd ? "✕ Cancel" : "+ Log Fuel"}
        </button>
      </div>

      {showAdd && (
        <div style={card({ marginBottom:18, borderColor:C.accent })}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <span style={lbl}>DATE</span>
              <input type="date" value={nf.date}
                     onChange={e => setNf({ ...nf, date:e.target.value })} style={inp}/>
            </div>
            <div>
              <span style={lbl}>STATE (IFTA)</span>
              <select value={nf.state}
                      onChange={e => setNf({ ...nf, state:e.target.value })} style={inp}>
                {US_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span style={lbl}>GALLONS</span>
              <input type="number" value={nf.gallons}
                     onChange={e => setNf({ ...nf, gallons:e.target.value })} style={inp}/>
            </div>
            <div>
              <span style={lbl}>PRICE/GAL ($)</span>
              <input type="number" value={nf.ppg}
                     onChange={e => setNf({ ...nf, ppg:e.target.value })} style={inp}/>
            </div>
            <div>
              <span style={lbl}>LOCATION / TRUCK STOP</span>
              <input value={nf.location}
                     onChange={e => setNf({ ...nf, location:e.target.value })} style={inp}/>
            </div>
            <div>
              <span style={lbl}>NOTES</span>
              <input value={nf.notes}
                     onChange={e => setNf({ ...nf, notes:e.target.value })} style={inp}/>
            </div>
          </div>
          {nf.gallons && nf.ppg && (
            <div style={{ marginTop:10, fontSize:13, color:C.accent, fontWeight:700 }}>
              Total: {fmt(parseFloat(nf.gallons) * parseFloat(nf.ppg))}
            </div>
          )}
          <button onClick={add} style={{ ...btn(), marginTop:12 }}>✓ Save</button>
        </div>
      )}

      <div style={{ ...card({ textAlign:"center", color:C.border, marginBottom:14 }) }}>
        FleetOne fuel card integration — connect in Admin → Integrations to auto-import transactions.
      </div>

      {fuelEntries.length === 0 && (
        <div style={{ ...card({ textAlign:"center", color:C.border, padding:40 }) }}>
          No fuel entries yet.
        </div>
      )}

      {fuelEntries.map(e => (
        <div key={e.id} style={card({ marginBottom:10 })}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:C.text }}>
                {e.state} — {e.gallons} gal @ ${e.ppg}/gal
              </div>
              <div style={{ fontSize:11, color:C.dim }}>
                {e.date}{e.location ? ` · ${e.location}` : ""}
              </div>
            </div>
            <div style={{ fontSize:18, fontWeight:900, color:C.accent }}>{fmt(e.total)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
