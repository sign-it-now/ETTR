// ─────────────────────────────────────────────────────────────────────────────
// TRUCK PROFILE
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, card, lbl, inp, btn } from "../styles";

export default function TruckProfile({ user, trucks, setTrucks, setPage }) {
  const myT  = trucks.find(t => t.driverId === user.id) || trucks[0];
  const [form,  setForm]  = useState({ ...myT });
  const [saved, setSaved] = useState(false);

  const save = () => {
    setTrucks(trucks.map(t => t.id === form.id ? { ...form } : t));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const F = ({ l, k, type = "text" }) => (
    <div>
      <span style={lbl}>{l}</span>
      <input type={type} value={form[k] || ""}
             onChange={e => setForm({ ...form, [k]:e.target.value })} style={inp}/>
    </div>
  );

  return (
    <div style={{ maxWidth:720 }}>
      <div style={{ fontSize:22, fontWeight:900, color:"#fff", marginBottom:20 }}>🚛 My Truck</div>
      <div style={card()}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <F l="MAKE"          k="make"/>
          <F l="MODEL"         k="model"/>
          <F l="YEAR"          k="year"    type="number"/>
          <F l="COLOR"         k="color"/>
          <F l="UNIT #"        k="unit"/>
          <F l="VIN"           k="vin"/>
          <F l="LICENSE PLATE" k="plate"/>
          <F l="STATE REG"     k="state"/>
          <F l="MILEAGE"       k="mileage" type="number"/>
          <F l="ELD PROVIDER"  k="eld"/>
        </div>
        <div>
          <span style={{ ...lbl, marginTop:14 }}>NOTES</span>
          <textarea value={form.notes || ""}
                    onChange={e => setForm({ ...form, notes:e.target.value })}
                    style={{ ...inp, minHeight:60, resize:"vertical" }}/>
        </div>
        <button onClick={save} style={{ ...btn(), marginTop:18 }}>
          {saved ? "✓ Saved!" : "Save Truck"}
        </button>
      </div>
    </div>
  );
}
