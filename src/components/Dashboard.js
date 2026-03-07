// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
import { C, card, btn } from "../styles";
import { fmt, brokerName, STAGES } from "../constants";

export default function Dashboard({ user, loads, petty, users, isCarrier, setPage }) {
  const my = isCarrier
    ? loads.filter(l => !l.deleted)
    : loads.filter(l => !l.deleted && l.driverId === user.id);

  const open        = my.filter(l => l.stage !== "paid");
  const gross       = my.reduce((s, l) => s + l.grossRate, 0);
  const outstanding = my.filter(l => l.stage === "invoiced")
                        .reduce((s, l) => s + l.grossRate, 0);
  const pcOwed      = petty.filter(p => !p.deleted && p.status === "unpaid")
                           .reduce((s, p) => s + p.amount, 0);
  const needAction  = my.filter(l => l.stage === "dispatched" && l.driverId === user.id);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:24, fontWeight:900, color:"#fff" }}>
          Good day, {user.name.split(" ")[0]} 👋
        </div>
        <div style={{ fontSize:11, color:C.dim }}>
          {new Date().toLocaleDateString("en-US", {
            weekday:"long", year:"numeric", month:"long", day:"numeric",
          })}
        </div>
      </div>

      {needAction.length > 0 && (
        <div style={{ ...card({ borderColor:"#f59e0b", background:"#78350f10", marginBottom:20 }) }}>
          <div style={{ fontSize:12, color:"#fbbf24", fontWeight:900, marginBottom:8 }}>
            ⚡ YOU HAVE {needAction.length} LOAD{needAction.length > 1 ? "S" : ""} WAITING FOR YOUR ACCEPTANCE
          </div>
          {needAction.map(l => (
            <div key={l.id} style={{ fontSize:13, color:C.text, marginBottom:4 }}>
              📦 {brokerName(l)} · {l.origin} → {l.destination} · {fmt(l.grossRate)}
            </div>
          ))}
          <button
            onClick={() => setPage("loads")}
            style={{ ...btn("#f59e0b", "#000"), marginTop:10 }}
          >
            → Go to My Loads
          </button>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
        {[
          { l:"GROSS REVENUE",   v:fmt(gross),       c:C.accent,  sub:`${my.length} total loads`, p:"loads" },
          { l:"OPEN LOADS",      v:open.length,       c:C.yellow,  sub:"In progress",              p:"loads" },
          { l:"OUTSTANDING",     v:fmt(outstanding),  c:"#ec4899", sub:"Invoiced, not paid",       p:"loads" },
          { l:"PETTY CASH OWED", v:fmt(pcOwed),       c:C.red,     sub:"To Bruce",                 p:"petty" },
        ].map(s => (
          <div
            key={s.l}
            onClick={() => setPage(s.p)}
            style={card({ cursor:"pointer", borderColor:`${s.c}30`, transition:"border-color .2s" })}
          >
            <div style={{ fontSize:9, color:C.dim, letterSpacing:1.5, marginBottom:6 }}>{s.l}</div>
            <div style={{ fontSize:24, fontWeight:900, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={card()}>
        <div style={{ fontSize:11, color:C.accent, fontWeight:900,
                      letterSpacing:1.5, marginBottom:14 }}>
          RECENT LOADS
        </div>

        {my.length === 0 && (
          <div style={{ color:C.border, textAlign:"center", padding:40 }}>
            No loads yet —{" "}
            <button onClick={() => setPage("loads")} style={{ ...btn(), padding:"6px 14px" }}>
              Start First Load
            </button>
          </div>
        )}

        {my.slice(0, 5).map(load => {
          const st  = STAGES.find(s => s.key === load.stage) || STAGES[0];
          const drv = users.find(u => u.id === load.driverId);
          return (
            <div
              key={load.id}
              onClick={() => setPage("loads")}
              style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                       padding:"11px 0", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}
            >
              <div>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                  <span style={{ background:`${st.color}20`, color:st.color,
                                 border:`1px solid ${st.color}40`, borderRadius:4,
                                 padding:"2px 8px", fontSize:10, fontWeight:800 }}>
                    {st.icon} {st.label}
                  </span>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:C.text }}>
                  {load.origin} → {load.destination}
                </div>
                <div style={{ fontSize:11, color:C.dim }}>
                  {brokerName(load)} · {drv?.name}
                </div>
              </div>
              <div style={{ fontSize:18, fontWeight:900, color:C.text }}>
                {fmt(load.grossRate)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
