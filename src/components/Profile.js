// ─────────────────────────────────────────────────────────────────────────────
// PROFILE — driver / user profile editor
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, card, lbl, inp, btn } from "../styles";

export default function Profile({ user, users, setUsers, setPage }) {
  const [form,  setForm]  = useState({ ...user });
  const [saved, setSaved] = useState(false);

  const save = () => {
    setUsers(users.map(u => u.id === user.id ? { ...u, ...form } : u));
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
    <div style={{ maxWidth:680 }}>
      <div style={{ fontSize:22, fontWeight:900, color:"#fff", marginBottom:20 }}>👤 My Profile</div>
      <div style={card()}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <F l="FULL NAME"           k="name"/>
          <F l="EMAIL"               k="email"            type="email"/>
          <F l="PHONE"               k="phone"/>
          <F l="ADDRESS"             k="address"/>
          <F l="CDL NUMBER"          k="cdl"/>
          <F l="CDL EXPIRY"          k="cdlExpiry"        type="date"/>
          <F l="MED CARD EXPIRY"     k="medExpiry"        type="date"/>
          <F l="EMERGENCY CONTACT"   k="emergencyContact"/>
          <F l="EMERGENCY PHONE"     k="emergencyPhone"/>
        </div>
        <button onClick={save} style={{ ...btn(), marginTop:18 }}>
          {saved ? "✓ Saved!" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
