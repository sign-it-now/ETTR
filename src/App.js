// ─────────────────────────────────────────────────────────────────────────────
// ETTR FLEET — ROOT
//
// This file is intentionally thin. It only handles:
//   • Authentication state
//   • Navigation / page routing
//   • Persisted data state (via useLocalStorage)
//   • Sidebar shell
//
// To add or edit a feature, open the relevant file in src/components/.
// Changing one module will never break another — each is self-contained.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { ROLES }           from "./constants";
import { SEED_USERS, SEED_TRUCKS, SEED_PETTY, SEED_LOADS } from "./seedData";
import { useLocalStorage } from "./storage";
import { C, btn }          from "./styles";

// ── Page modules ─────────────────────────────────────────────────────────────
import Login        from "./components/Login";
import Dashboard    from "./components/Dashboard";
import Loads        from "./components/Loads";
import PettyCash    from "./components/PettyCash";
import FuelLog      from "./components/FuelLog";
import TruckProfile from "./components/TruckProfile";
import Trailers     from "./components/Trailers";
import Service      from "./components/Service";
import Docs         from "./components/Docs";
import Reports      from "./components/Reports";
import Profile      from "./components/Profile";
import Admin        from "./components/Admin";

export default function ETTRApp() {
  const [user,      setUser]      = useState(null);
  const [page,      setPage]      = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  // ── Persisted state — survives page refresh ────────────────────────────────
  const [users,          setUsers]          = useLocalStorage("ettr_users",    SEED_USERS);
  const [trucks,         setTrucks]         = useLocalStorage("ettr_trucks",   SEED_TRUCKS);
  const [loads,          setLoads]          = useLocalStorage("ettr_loads",    SEED_LOADS);
  const [petty,          setPetty]          = useLocalStorage("ettr_petty",    SEED_PETTY);
  const [shippers,       setShippers]       = useLocalStorage("ettr_shippers", []);
  const [trailers,       setTrailers]       = useLocalStorage("ettr_trailers", []);
  const [serviceRecords, setServiceRecords] = useLocalStorage("ettr_service",  []);
  const [documents,      setDocuments]      = useLocalStorage("ettr_docs",     []);
  const [fuelEntries,    setFuelEntries]    = useLocalStorage("ettr_fuel",     []);

  if (!user) {
    return <Login users={users} onLogin={u => { setUser(u); setPage("dashboard"); }}/>;
  }

  const live      = users.find(u => u.id === user.id) || user;
  const isCarrier = live.role === ROLES.DEV || live.role === ROLES.CARRIER;

  // Props passed to every page module
  const shared = {
    user:live, users, setUsers,
    trucks, setTrucks,
    loads,  setLoads,
    petty,  setPetty,
    shippers, setShippers,
    trailers, setTrailers,
    serviceRecords, setServiceRecords,
    documents,      setDocuments,
    fuelEntries,    setFuelEntries,
    isCarrier, setPage,
  };

  const NAV = [
    { k:"dashboard", i:"🏠", l:"Dashboard"  },
    { k:"loads",     i:"📦", l:"Loads"       },
    { k:"petty",     i:"💵", l:"Petty Cash"  },
    { k:"fuel",      i:"⛽", l:"Fuel Log"    },
    { k:"truck",     i:"🚛", l:"My Truck"    },
    { k:"trailers",  i:"🔲", l:"Trailers"    },
    { k:"service",   i:"🔧", l:"Service"     },
    { k:"docs",      i:"📄", l:"Documents"   },
    { k:"reports",   i:"📊", l:"Reports"     },
    { k:"profile",   i:"👤", l:"Profile"     },
    ...(isCarrier ? [{ k:"admin", i:"🛡️", l:"Admin" }] : []),
  ];

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard    {...shared}/>;
      case "loads":     return <Loads        {...shared}/>;
      case "petty":     return <PettyCash    {...shared}/>;
      case "fuel":      return <FuelLog      {...shared}/>;
      case "truck":     return <TruckProfile {...shared}/>;
      case "trailers":  return <Trailers     {...shared}/>;
      case "service":   return <Service      {...shared}/>;
      case "docs":      return <Docs         {...shared}/>;
      case "reports":   return <Reports      {...shared}/>;
      case "profile":   return <Profile      {...shared}/>;
      case "admin":     return isCarrier ? <Admin {...shared}/> : <Dashboard {...shared}/>;
      default:          return <Dashboard    {...shared}/>;
    }
  };

  const sw = collapsed ? 58 : 220;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text,
                  fontFamily:"'Courier New',monospace", display:"flex" }}>

      {/* ── SIDEBAR ── */}
      <div style={{ width:sw, background:C.side, borderRight:`1px solid ${C.border}`,
                    display:"flex", flexDirection:"column", flexShrink:0,
                    transition:"width .2s", position:"sticky", top:0, height:"100vh",
                    overflowY:"auto", WebkitOverflowScrolling:"touch" }}>

        {/* Logo / collapse toggle */}
        <div style={{ padding:"14px 12px", borderBottom:`1px solid ${C.border}`,
                      display:"flex", alignItems:"center",
                      justifyContent:collapsed ? "center" : "space-between" }}>
          {!collapsed && (
            <div>
              <div style={{ fontSize:15, fontWeight:900, color:C.accent, letterSpacing:1 }}>ETTR</div>
              <div style={{ fontSize:8, color:C.border, letterSpacing:1 }}>DOT 1978980</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ background:"none", border:"none", color:C.dim, cursor:"pointer",
                     fontSize:18, padding:4,
                     WebkitTapHighlightColor:"transparent", touchAction:"manipulation" }}
          >☰</button>
        </div>

        {/* User info */}
        {!collapsed && (
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontWeight:800, color:C.text }}>{live.name}</div>
            <div style={{ fontSize:10, color:C.dim }}>{live.carrierRole}</div>
          </div>
        )}

        {/* Nav links */}
        <nav style={{ flex:1, overflowY:"auto", paddingTop:6, WebkitOverflowScrolling:"touch" }}>
          {NAV.map(n => {
            const active = page === n.k;
            return (
              <button
                key={n.k}
                onClick={() => setPage(n.k)}
                style={{
                  width:"100%", textAlign:"left",
                  padding:     collapsed ? "12px 18px" : "10px 14px",
                  border:      "none",
                  cursor:      "pointer",
                  fontFamily:  "inherit",
                  fontSize:    11,
                  fontWeight:  700,
                  display:     "flex",
                  alignItems:  "center",
                  gap:         9,
                  background:  active ? C.card1 : "transparent",
                  color:       active ? C.accent : C.dim,
                  borderLeft:  active ? `3px solid ${C.accent}` : "3px solid transparent",
                  transition:  "all .15s",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                <span style={{ fontSize:15 }}>{n.i}</span>
                {!collapsed && n.l}
              </button>
            );
          })}
        </nav>

        {/* Sign out */}
        <button
          onClick={() => setUser(null)}
          style={{
            margin:10, background:C.card1, border:`1px solid ${C.border}`,
            color:C.dim, borderRadius:8, padding:"9px 10px", cursor:"pointer",
            fontFamily:"inherit", fontSize:11, fontWeight:700,
            display:"flex", alignItems:"center", gap:8,
            justifyContent: collapsed ? "center" : "flex-start",
            WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
          }}
        >
          🚪{!collapsed && " Sign Out"}
        </button>

        {/* Saved indicator */}
        {!collapsed && (
          <div style={{ margin:"0 10px 10px", background:"#052e1620",
                        border:"1px solid #22c55e30", borderRadius:7,
                        padding:"6px 10px", fontSize:9, color:"#22c55e",
                        display:"flex", alignItems:"center", gap:5 }}>
            💾 Data saved on this device
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex:1, padding:"24px 28px", overflowY:"auto",
                     minWidth:0, WebkitOverflowScrolling:"touch" }}>
        <div style={{ maxWidth:1060 }}>{renderPage()}</div>
      </main>
    </div>
  );
}
