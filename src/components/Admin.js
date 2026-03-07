// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — carrier-only: manage users/drivers, view integrations
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, card, lbl, inp, btn } from "../styles";
import { ROLES } from "../constants";

export default function Admin({ user, users, setUsers, trucks, setTrucks, setPage }) {
  const [showAdd, setShowAdd] = useState(false);
  const [nu, setNu] = useState({
    name:"", email:"", phone:"", password:"ettr2024",
    role:ROLES.DRIVER, carrierRole:"Driver", commissionPct:20,
  });

  const add = () => {
    if (!nu.name || !nu.email) return;
    setUsers([...users, {
      id:          `usr-${Date.now()}`,
      ...nu,
      truckId:     null,
      cdl:         "",
      cdlExpiry:   "",
      medExpiry:   "",
      deleted:     false,
    }]);
    setShowAdd(false);
  };

  const integrations = [
    { n:"FleetOne / WEX Fuel Card",  d:"Auto-import fuel transactions for IFTA reporting", s:"Not Connected" },
    { n:"Zoho Mail API",              d:"Send carrier invoices directly from the app",       s:"Not Connected" },
    { n:"BlueInk Tech ELD",           d:"Driver HOS log integration",                       s:"Active"        },
  ];

  return (
    <div>
      <div style={{ fontSize:22, fontWeight:900, color:"#fff", marginBottom:20 }}>
        🛡️ Carrier Admin
      </div>

      {/* Users */}
      <div style={card({ marginBottom:16 })}>
        <div style={{ fontSize:10, color:C.accent, fontWeight:900,
                      letterSpacing:1.5, marginBottom:14 }}>
          USERS &amp; DRIVERS
        </div>
        {users.filter(u => !u.deleted).map(u => (
          <div key={u.id}
               style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                        padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{u.name}</div>
              <div style={{ fontSize:11, color:C.dim }}>
                {u.email} · {u.carrierRole} · {u.commissionPct}% commission
              </div>
            </div>
            <span style={{ fontSize:10, background:"#1e40af20", color:"#93c5fd",
                           border:"1px solid #1e40af30", borderRadius:4, padding:"2px 8px" }}>
              {u.role}
            </span>
          </div>
        ))}

        <button onClick={() => setShowAdd(!showAdd)} style={{ ...btn(), marginTop:16 }}>
          {showAdd ? "✕ Cancel" : "+ Add Driver"}
        </button>

        {showAdd && (
          <div style={{ marginTop:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[
              { l:"NAME",         k:"name"        },
              { l:"EMAIL",        k:"email",       type:"email" },
              { l:"PHONE",        k:"phone"        },
              { l:"PASSWORD",     k:"password"     },
              { l:"CARRIER ROLE", k:"carrierRole"  },
            ].map(f => (
              <div key={f.k}>
                <span style={lbl}>{f.l}</span>
                <input type={f.type || "text"} value={nu[f.k] || ""}
                       onChange={e => setNu({ ...nu, [f.k]:e.target.value })} style={inp}/>
              </div>
            ))}
            <div>
              <span style={lbl}>COMMISSION %</span>
              <input type="number" min="0" max="50" value={nu.commissionPct}
                     onChange={e => setNu({ ...nu, commissionPct:parseFloat(e.target.value) || 0 })}
                     style={inp}/>
            </div>
            <button onClick={add}
                    style={{ ...btn(), marginTop:10, gridColumn:"span 2" }}>
              ✓ Save Driver
            </button>
          </div>
        )}
      </div>

      {/* Integrations */}
      <div style={card()}>
        <div style={{ fontSize:10, color:C.accent, fontWeight:900,
                      letterSpacing:1.5, marginBottom:10 }}>
          INTEGRATIONS
        </div>
        {integrations.map(i => (
          <div key={i.n}
               style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                        background:C.bg, borderRadius:8, padding:"12px 14px", marginBottom:8 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{i.n}</div>
              <div style={{ fontSize:11, color:C.dim }}>{i.d}</div>
            </div>
            <span style={{ fontSize:10,
                           background:i.s === "Active" ? "#22c55e20" : C.card2,
                           color:i.s === "Active" ? C.green : C.dim,
                           border:`1px solid ${i.s === "Active" ? "#22c55e40" : C.border}`,
                           borderRadius:4, padding:"2px 10px", fontWeight:700 }}>
              {i.s}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
