// ─────────────────────────────────────────────────────────────────────────────
// SERVICE RECORDS
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, card, lbl, inp, btn } from "../styles";
import { fmt, today } from "../constants";

const SERVICE_TYPES = [
  "Oil Change","Tire Rotation","Brake Service","PM Inspection","DOT Inspection",
  "Alignment","Engine Repair","Transmission","Electrical","Other",
];

export default function Service({ user, serviceRecords, setServiceRecords, trucks, isCarrier, setPage }) {
  const records = serviceRecords || [];
  const [showAdd, setShowAdd] = useState(false);
  const [nr, setNr] = useState({
    date:today(), truckId:trucks[0]?.id || "", type:"Oil Change",
    vendor:"", cost:"", mileage:"", notes:"", nextDueDate:"", nextDueMileage:"",
  });

  const add = () => {
    setServiceRecords([...records, {
      id:`svc-${Date.now()}`, ...nr,
      cost:parseFloat(nr.cost) || 0, deleted:false,
    }]);
    setShowAdd(false);
  };

  const active = records.filter(r =>
    !r.deleted &&
    (isCarrier || trucks.find(t => t.id === r.truckId)?.driverId === user.id)
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:8 }}>
        <div style={{ fontSize:22, fontWeight:900, color:"#fff" }}>🔧 Service Records</div>
        <button onClick={() => setShowAdd(!showAdd)} style={btn()}>
          {showAdd ? "✕ Cancel" : "+ Add Record"}
        </button>
      </div>

      {showAdd && (
        <div style={card({ marginBottom:18, borderColor:C.accent })}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <span style={lbl}>TRUCK</span>
              <select value={nr.truckId}
                      onChange={e => setNr({ ...nr, truckId:e.target.value })} style={inp}>
                {trucks.map(t => (
                  <option key={t.id} value={t.id}>{t.unit || t.make} {t.model}</option>
                ))}
              </select>
            </div>
            <div>
              <span style={lbl}>TYPE</span>
              <select value={nr.type}
                      onChange={e => setNr({ ...nr, type:e.target.value })} style={inp}>
                {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {[
              { l:"DATE",             k:"date",          type:"date"   },
              { l:"VENDOR",           k:"vendor"                       },
              { l:"COST ($)",         k:"cost",          type:"number" },
              { l:"MILEAGE",          k:"mileage",       type:"number" },
              { l:"NEXT DUE DATE",    k:"nextDueDate",   type:"date"   },
              { l:"NEXT DUE MILES",   k:"nextDueMileage",type:"number" },
              { l:"NOTES",            k:"notes"                        },
            ].map(f => (
              <div key={f.k}>
                <span style={lbl}>{f.l}</span>
                <input type={f.type || "text"} value={nr[f.k]}
                       onChange={e => setNr({ ...nr, [f.k]:e.target.value })} style={inp}/>
              </div>
            ))}
          </div>
          <button onClick={add} style={{ ...btn(), marginTop:14 }}>✓ Save</button>
        </div>
      )}

      {active.length === 0 && (
        <div style={{ ...card({ textAlign:"center", color:C.border, padding:40 }) }}>
          No service records.
        </div>
      )}

      {active.map(rec => {
        const truck = trucks.find(t => t.id === rec.truckId);
        return (
          <div key={rec.id} style={card({ marginBottom:10 })}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{rec.type}</div>
                <div style={{ fontSize:11, color:C.dim }}>
                  {truck?.unit || truck?.make} · {rec.date} · {rec.vendor}
                </div>
                {rec.notes && (
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{rec.notes}</div>
                )}
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{fmt(rec.cost)}</div>
                {rec.nextDueDate && (
                  <div style={{ fontSize:10, color:C.yellow }}>Next: {rec.nextDueDate}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
