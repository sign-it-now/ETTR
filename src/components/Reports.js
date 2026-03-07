// ─────────────────────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, card, lbl, inp } from "../styles";
import { fmt, calcLoad } from "../constants";

export default function Reports({ user, loads, petty, serviceRecords, users, isCarrier, setPage }) {
  const [dFilter, setDFilter] = useState("all");

  const records = serviceRecords || [];

  const my = isCarrier
    ? (dFilter === "all" ? loads : loads.filter(l => l.driverId === dFilter))
        .filter(l => !l.deleted)
    : loads.filter(l => !l.deleted && l.driverId === user.id);

  const gross = my.reduce((s, l) => s + l.grossRate, 0);

  const { carrierCut, driverNet } = my.reduce((s, l) => {
    const c = calcLoad(l, users);
    return { carrierCut:s.carrierCut + c.carrierCut, driverNet:s.driverNet + c.driverNet };
  }, { carrierCut:0, driverNet:0 });

  const collected = my.filter(l => l.stage === "paid")
                      .reduce((s, l) => s + (l.paidAmount || l.grossRate), 0);
  const os        = my.filter(l => l.stage === "invoiced")
                      .reduce((s, l) => s + l.grossRate, 0);
  const pcOwed    = petty.filter(p => !p.deleted && p.status === "unpaid")
                         .reduce((s, p) => s + p.amount, 0);
  const svc       = records.filter(r => !r.deleted)
                           .reduce((s, r) => s + (r.cost || 0), 0);

  const stats = [
    { l:"GROSS REVENUE",  v:fmt(gross),      c:C.accent },
    ...(isCarrier ? [{ l:"CARRIER CUT", v:fmt(carrierCut), c:"#a78bfa" }] : []),
    { l:"DRIVER NET",     v:fmt(driverNet),  c:C.green  },
    { l:"COLLECTED",      v:fmt(collected),  c:C.green  },
    { l:"OUTSTANDING",    v:fmt(os),         c:C.yellow },
    { l:"TOTAL LOADS",    v:my.length,       c:C.accent },
    { l:"PETTY CASH OWED",v:fmt(pcOwed),     c:C.red    },
    { l:"MAINTENANCE",    v:fmt(svc),        c:"#f87171"},
    { l:"LOADS PAID",     v:my.filter(l => l.stage === "paid").length, c:C.green },
  ];

  return (
    <div>
      <div style={{ fontSize:22, fontWeight:900, color:"#fff", marginBottom:20 }}>📊 Reports</div>

      {isCarrier && (
        <div style={{ marginBottom:16 }}>
          <span style={lbl}>Filter by Driver</span>
          <select value={dFilter}
                  onChange={e => setDFilter(e.target.value)}
                  style={{ ...inp, width:"auto" }}>
            <option value="all">All Drivers</option>
            {users.filter(u => !u.deleted).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
        {stats.map(s => (
          <div key={s.l} style={card()}>
            <div style={{ fontSize:9, color:C.dim, letterSpacing:1.5, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontSize:22, fontWeight:900, color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {isCarrier && (
        <div style={card()}>
          <div style={{ fontSize:10, color:C.accent, fontWeight:900,
                        letterSpacing:1.5, marginBottom:14 }}>
            PER-DRIVER BREAKDOWN
          </div>
          {users.filter(u => !u.deleted).map(drv => {
            const dl  = loads.filter(l => !l.deleted && l.driverId === drv.id);
            const dg  = dl.reduce((s, l) => s + l.grossRate, 0);
            const dc  = dl.reduce((s, l) => s + calcLoad(l, users).carrierCut, 0);
            const dn  = dl.reduce((s, l) => s + calcLoad(l, users).driverNet, 0);
            return (
              <div key={drv.id}
                   style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                            padding:"12px 0", borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{drv.name}</div>
                  <div style={{ fontSize:11, color:C.dim }}>
                    {dl.length} loads · {drv.commissionPct}% commission
                  </div>
                </div>
                <div style={{ display:"flex", gap:24, textAlign:"right" }}>
                  {[
                    { l:"GROSS",       v:fmt(dg), c:C.accent  },
                    { l:"CARRIER CUT", v:fmt(dc), c:"#a78bfa" },
                    { l:"DRIVER NET",  v:fmt(dn), c:C.green   },
                  ].map(x => (
                    <div key={x.l}>
                      <div style={{ fontSize:9,  color:C.dim }}>{x.l}</div>
                      <div style={{ fontSize:14, fontWeight:800, color:x.c }}>{x.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
