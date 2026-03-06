import { useState, useRef } from “react”;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const ROLES = { DEV:“developer”, CARRIER:“carrier_admin”, DRIVER:“driver” };

const STAGES = [
{ key:“rate_con”,    label:“Rate Con Received”,  icon:“📋”, color:”#3b82f6”,
desc:“Upload photo of rate confirmation from broker”,
action:“Rate Con Received — Upload Now”,
who:“both” },
{ key:“accepted”,   label:“Rate Con Accepted”,   icon:“✅”, color:”#06b6d4”,
desc:“Confirm acceptance and notify broker”,
action:“Accept & Notify Broker”,
who:“both” },
{ key:“dispatched”, label:“Dispatched to Driver”, icon:“📡”, color:”#8b5cf6”,
desc:“Carrier assigns and dispatches load to driver”,
action:“Dispatch to Driver”,
who:“carrier” },
{ key:“drv_accept”, label:“Driver Accepted”,      icon:“🤝”, color:”#a78bfa”,
desc:“Driver confirms acceptance of this load”,
action:“I Accept This Load”,
who:“driver” },
{ key:“at_pickup”,  label:“At Pickup”,            icon:“🏭”, color:”#f59e0b”,
desc:“Driver arrived at shipper — get and upload unsigned BOL”,
action:“I’m At the Shipper”,
who:“driver” },
{ key:“in_transit”, label:“In Transit”,            icon:“🚛”, color:”#f97316”,
desc:“Load picked up, BOL signed by shipper — heading to receiver”,
action:“Load Picked Up — In Transit”,
who:“driver” },
{ key:“delivered”,  label:“Delivered”,             icon:“📦”, color:”#84cc16”,
desc:“Delivered to receiver — upload signed BOL and any receipts”,
action:“Confirm Delivery”,
who:“driver” },
{ key:“billing”,    label:“Ready to Bill”,         icon:“🧾”, color:”#ec4899”,
desc:“Generate ETTR invoice and email billing package to broker”,
action:“Submit Billing Package”,
who:“both” },
{ key:“invoiced”,   label:“Invoiced”,              icon:“📤”, color:”#f43f5e”,
desc:“Invoice sent to broker — awaiting payment”,
action:“Mark Invoice Sent”,
who:“carrier” },
{ key:“paid”,       label:“Paid”,                  icon:“💰”, color:”#22c55e”,
desc:“Payment received from broker”,
action:“Record Payment”,
who:“carrier” },
];

const STAGE_KEYS = STAGES.map(s=>s.key);
const stageIdx = k => STAGE_KEYS.indexOf(k);
const nextStage = k => STAGE_KEYS[stageIdx(k)+1]||k;
const prevStage = k => STAGE_KEYS[stageIdx(k)-1]||k;

const BROKERS = [“CNA Transportation”,“Echo Global Logistics”,“Coyote Logistics”,
“CH Robinson”,“Landstar”,“TQL”,“Convoy”,“Worldwide Express”];

const PETTY_CATS = [“Repairs & Maintenance”,“Fuel”,“Tires”,“Permits & Fees”,
“Supplies”,“Lodging”,“Meals”,“Other”];

const fmt = n => Number(n||0).toLocaleString(“en-US”,{style:“currency”,currency:“USD”});
const today = () => new Date().toISOString().split(“T”)[0];
const brokerName = l => (l.brokerCustom?.trim()) ? l.brokerCustom : l.broker;

const calcLoad = (load, users) => {
const driver = users.find(u=>u.id===load.driverId);
const pct = driver?.commissionPct||0;
const carrierCut = (load.grossRate*pct)/100;
const driverNet = load.grossRate - carrierCut;
const comcheck = load.comcheck ? Number(load.comcheck.amount) : 0;
const invoiceTotal = load.grossRate - comcheck;
const expenses = (load.expenses||[]).reduce((s,e)=>s+Number(e.amount),0);
const driverProfit = driverNet - expenses - (load.lumperAmount||0) - (load.detentionAmount||0);
return {pct,carrierCut,driverNet,comcheck,invoiceTotal,expenses,driverProfit};
};

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────
const SEED_USERS = [
{ id:“tim”, name:“Tim Smith”, email:“tim@ettr.com”, password:“ettr2024”,
role:ROLES.DEV, carrierRole:“Lease Operator”, phone:“618-974-8695”,
cdl:””, cdlExpiry:””, medExpiry:””, truckId:“pete777”, commissionPct:20, deleted:false },
{ id:“bruce”, name:“Bruce Edgerton”, email:“bruce@ettr.com”, password:“ettr2024”,
role:ROLES.CARRIER, carrierRole:“Carrier / Owner-Operator”, phone:“715-509-0114”,
cdl:””, cdlExpiry:””, medExpiry:””, truckId:“kwbruce”, commissionPct:0, deleted:false },
];

const SEED_TRUCKS = [
{ id:“pete777”, driverId:“tim”, unit:”#777”, make:“Peterbilt”, model:“579”,
year:2013, color:“White”, vin:“1XP-BDP9X-3-ED234685”, mileage:996058,
plate:””, state:“IL”, eld:“BlueInk Tech”, notes:”” },
{ id:“kwbruce”, driverId:“bruce”, unit:””, make:“Kenworth”, model:“T680”,
year:null, color:“Blue”, vin:””, mileage:0, plate:””, state:“WI”, eld:””, notes:”” },
];

const SEED_PETTY = [
{ id:“pc001”, date:“2026-01-30”, description:“Mike’s Inc — Truck #777 Major Repair”,
vendor:“Mike’s Inc — South Roxana, IL”, amount:15477.45,
category:“Repairs & Maintenance”, paidBy:“Bruce”, status:“unpaid”,
receiptUrl:null, receiptName:null, paidDate:null,
notes:“DOT inspection, kingpins, radiator, air springs, shocks, trans cooler — Unit now passes DOT.”,
deleted:false },
];

const SEED_LOADS = [
{ id:“load001”, driverId:“tim”, broker:“CNA Transportation”, brokerCustom:””,
brokerContact:“billing@cnatrans.com”, loadNumber:“CNA-2026-0041”,
origin:“Chicago, IL”, destination:“Memphis, TN”,
shipper:“ABC Warehouse, Chicago IL”, receiver:“XYZ Distribution, Memphis TN”,
commodity:“General Freight”, pickupDate:“2026-02-10”, deliveryDate:“2026-02-11”,
grossRate:2400, stage:“paid”,
comcheck:{number:“CC-88821”, amount:300, dateIssued:“2026-02-10”},
docs:{ rateCon:null, bolUnsigned:null, bolSigned:null,
lumper:null, pod:null, invoice:null },
docNames:{ rateCon:“RateCon_CNA0041.pdf”, bolUnsigned:null,
bolSigned:“BOL_signed.jpg”, lumper:null,
pod:“POD_Memphis.jpg”, invoice:“ETTR_Invoice.pdf” },
lumperAmount:0, detentionAmount:0, expenses:[],
stageHistory:{ rate_con:“2026-02-09”, accepted:“2026-02-09”,
dispatched:“2026-02-09”, drv_accept:“2026-02-09”,
at_pickup:“2026-02-10”, in_transit:“2026-02-10”,
delivered:“2026-02-11”, billing:“2026-02-12”,
invoiced:“2026-02-12”, paid:“2026-02-19” },
paidAmount:2100, notes:“First load of 2026.”, deleted:false },
];

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const C = {
bg:”#070d1a”, side:”#0c1526”, card1:”#111e35”, card2:”#162440”,
border:”#1e3a5f”, accent:”#3b82f6”, text:”#e2e8f0”, muted:”#475569”,
dim:”#64748b”, green:”#22c55e”, red:”#ef4444”, yellow:”#f59e0b”,
};

const card = (x={}) => ({
background:C.card1, border:`1px solid ${C.border}`,
borderRadius:12, padding:20, …x
});

const lbl = { fontSize:10, color:C.dim, letterSpacing:1.5,
marginBottom:4, display:“block”, textTransform:“uppercase” };

const inp = { width:“100%”, background:C.bg, border:`1px solid ${C.border}`,
borderRadius:8, padding:“10px 13px”, color:C.text, fontFamily:“inherit”,
fontSize:13, boxSizing:“border-box”, outline:“none” };

const btn = (bg=C.accent, col=”#fff”, extra={}) => ({
background:bg, color:col, border:“none”, borderRadius:8,
padding:“10px 20px”, cursor:“pointer”, fontFamily:“inherit”,
fontWeight:700, fontSize:12, letterSpacing:0.5, …extra
});

const ghost = { background:“transparent”, border:`1px solid ${C.border}`,
color:C.muted, borderRadius:8, padding:“10px 16px”,
cursor:“pointer”, fontFamily:“inherit”, fontSize:12, fontWeight:600 };

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function ETTRApp(){
const [user,setUser] = useState(null);
const [page,setPage] = useState(“dashboard”);
const [users,setUsers] = useState(SEED_USERS);
const [trucks,setTrucks] = useState(SEED_TRUCKS);
const [loads,setLoads] = useState(SEED_LOADS);
const [petty,setPetty] = useState(SEED_PETTY);
const [shippers,setShippers] = useState([]);
const [collapsed,setCollapsed] = useState(false);

if(!user) return <Login users={users} onLogin={u=>{setUser(u);setPage(“dashboard”);}}/>;

const live = users.find(u=>u.id===user.id)||user;
const isCarrier = live.role===ROLES.DEV || live.role===ROLES.CARRIER;

const shared = {user:live,users,setUsers,trucks,setTrucks,loads,setLoads,
petty,setPetty,shippers,setShippers,isCarrier,setPage};

const NAV = [
{k:“dashboard”, i:“🏠”, l:“Dashboard”},
{k:“loads”,     i:“📦”, l:“Loads”},
{k:“petty”,     i:“💵”, l:“Petty Cash”},
{k:“fuel”,      i:“⛽”, l:“Fuel Log”},
{k:“truck”,     i:“🚛”, l:“My Truck”},
{k:“trailers”,  i:“🔲”, l:“Trailers”},
{k:“service”,   i:“🔧”, l:“Service”},
{k:“docs”,      i:“📄”, l:“Documents”},
{k:“reports”,   i:“📊”, l:“Reports”},
{k:“profile”,   i:“👤”, l:“Profile”},
…(isCarrier?[{k:“admin”,i:“🛡️”,l:“Admin”}]:[]),
];

const render = () => {
switch(page){
case”dashboard”: return <Dashboard {…shared}/>;
case”loads”:     return <Loads {…shared}/>;
case”petty”:     return <PettyCash {…shared}/>;
case”fuel”:      return <FuelLog {…shared}/>;
case”truck”:     return <TruckProfile {…shared}/>;
case”trailers”:  return <Trailers {…shared}/>;
case”service”:   return <Service {…shared}/>;
case”docs”:      return <Docs {…shared}/>;
case”reports”:   return <Reports {…shared}/>;
case”profile”:   return <Profile {…shared}/>;
case”admin”:     return isCarrier?<Admin {…shared}/>:<Dashboard {…shared}/>;
default:         return <Dashboard {…shared}/>;
}
};

const sw = collapsed?58:220;

return (
<div style={{minHeight:“100vh”,background:C.bg,color:C.text,
fontFamily:”‘Courier New’,monospace”,display:“flex”}}>

```
  {/* ── SIDEBAR — always visible, home always accessible ── */}
  <div style={{width:sw,background:C.side,borderRight:`1px solid ${C.border}`,
    display:"flex",flexDirection:"column",flexShrink:0,
    transition:"width .2s",position:"sticky",top:0,height:"100vh"}}>

    <div style={{padding:"14px 12px",borderBottom:`1px solid ${C.border}`,
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      {!collapsed&&(
        <div>
          <div style={{fontSize:15,fontWeight:900,color:C.accent,letterSpacing:1}}>ETTR</div>
          <div style={{fontSize:8,color:C.border,letterSpacing:1}}>DOT 1978980</div>
        </div>
      )}
      <button onClick={()=>setCollapsed(!collapsed)}
        style={{background:"none",border:"none",color:C.dim,cursor:"pointer",
          fontSize:18,padding:4}}>☰</button>
    </div>

    {!collapsed&&(
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:11,fontWeight:800,color:C.text}}>{live.name}</div>
        <div style={{fontSize:10,color:C.dim}}>{live.carrierRole}</div>
      </div>
    )}

    <nav style={{flex:1,overflowY:"auto",paddingTop:6}}>
      {NAV.map(n=>{
        const active = page===n.k;
        return(
          <button key={n.k} onClick={()=>setPage(n.k)}
            style={{width:"100%",textAlign:"left",
              padding:collapsed?"12px 18px":"10px 14px",
              border:"none",cursor:"pointer",fontFamily:"inherit",
              fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:9,
              background:active?C.card1:"transparent",
              color:active?C.accent:C.dim,
              borderLeft:active?`3px solid ${C.accent}`:"3px solid transparent",
              transition:"all .15s"}}>
            <span style={{fontSize:15}}>{n.i}</span>
            {!collapsed&&n.l}
          </button>
        );
      })}
    </nav>

    <button onClick={()=>setUser(null)}
      style={{margin:10,background:C.card1,border:`1px solid ${C.border}`,
        color:C.dim,borderRadius:8,padding:"9px 10px",cursor:"pointer",
        fontFamily:"inherit",fontSize:11,fontWeight:700,
        display:"flex",alignItems:"center",gap:8,
        justifyContent:collapsed?"center":"flex-start"}}>
      🚪{!collapsed&&" Sign Out"}
    </button>
  </div>

  {/* ── MAIN CONTENT ── */}
  <main style={{flex:1,padding:"24px 28px",overflowY:"auto",minWidth:0}}>
    <div style={{maxWidth:1060}}>{render()}</div>
  </main>
</div>
```

);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
function Login({users,onLogin}){
const [em,setEm]=useState(””); const [pw,setPw]=useState(””);
const [show,setShow]=useState(false); const [err,setErr]=useState(””);
const go=()=>{
const u=users.find(x=>!x.deleted&&x.email===em.trim()&&x.password===pw);
u?onLogin(u):setErr(“Invalid email or password.”);
};
return(
<div style={{minHeight:“100vh”,background:C.bg,display:“flex”,
alignItems:“center”,justifyContent:“center”,fontFamily:”‘Courier New’,monospace”}}>
<div style={card({width:360,borderColor:C.accent})}>
<div style={{textAlign:“center”,marginBottom:28}}>
<div style={{fontSize:40,marginBottom:6}}>🚛</div>
<div style={{fontSize:22,fontWeight:900,color:”#fff”,letterSpacing:2}}>ETTR FLEET</div>
<div style={{fontSize:10,color:C.accent,letterSpacing:2}}>EDGERTON TRUCK & TRAILER REPAIR</div>
<div style={{fontSize:9,color:C.border,marginTop:3}}>DOT 1978980 · MC#699644 · Bonduel, WI</div>
</div>
<span style={lbl}>Email</span>
<input type=“email” value={em} onChange={e=>setEm(e.target.value)}
style={{…inp,marginBottom:12}} placeholder=“you@ettr.com”/>
<div style={{position:“relative”,marginBottom:16}}>
<span style={lbl}>Password</span>
<input type={show?“text”:“password”} value={pw}
onChange={e=>setPw(e.target.value)} style={inp}
onKeyDown={e=>e.key===“Enter”&&go()}/>
<button onClick={()=>setShow(!show)}
style={{position:“absolute”,right:10,top:28,background:“none”,
border:“none”,color:C.dim,cursor:“pointer”}}>
{show?“🙈”:“👁”}
</button>
</div>
{err&&<div style={{color:C.red,fontSize:12,marginBottom:10}}>{err}</div>}
<button onClick={go} style={{…btn(),width:“100%”,padding:12,fontSize:13}}>
SIGN IN
</button>
<div style={{marginTop:10,fontSize:10,color:C.border,textAlign:“center”}}>
tim@ettr.com or bruce@ettr.com · pw: ettr2024
</div>
</div>
</div>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({user,loads,petty,users,isCarrier,setPage}){
const my = isCarrier ? loads.filter(l=>!l.deleted)
: loads.filter(l=>!l.deleted&&l.driverId===user.id);
const open = my.filter(l=>l.stage!==“paid”);
const gross = my.reduce((s,l)=>s+l.grossRate,0);
const outstanding = my.filter(l=>l.stage===“invoiced”).reduce((s,l)=>s+l.grossRate,0);
const pcOwed = petty.filter(p=>!p.deleted&&p.status===“unpaid”).reduce((s,p)=>s+p.amount,0);
const needAction = my.filter(l=>l.stage===“dispatched”&&l.driverId===user.id);

return(
<div>
<div style={{marginBottom:24}}>
<div style={{fontSize:24,fontWeight:900,color:”#fff”}}>
Good day, {user.name.split(” “)[0]} 👋
</div>
<div style={{fontSize:11,color:C.dim}}>{new Date().toLocaleDateString(“en-US”,{weekday:“long”,year:“numeric”,month:“long”,day:“numeric”})}</div>
</div>

```
  {needAction.length>0&&(
    <div style={{...card({borderColor:"#f59e0b",background:"#78350f10",marginBottom:20})}}>
      <div style={{fontSize:12,color:"#fbbf24",fontWeight:900,marginBottom:8}}>
        ⚡ YOU HAVE {needAction.length} LOAD{needAction.length>1?"S":""} WAITING FOR YOUR ACCEPTANCE
      </div>
      {needAction.map(l=>(
        <div key={l.id} style={{fontSize:13,color:C.text,marginBottom:4}}>
          📦 {brokerName(l)} · {l.origin} → {l.destination} · {fmt(l.grossRate)}
        </div>
      ))}
      <button onClick={()=>setPage("loads")} style={{...btn("#f59e0b","#000"),marginTop:10}}>
        → Go to My Loads
      </button>
    </div>
  )}

  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:28}}>
    {[
      {l:"GROSS REVENUE",   v:fmt(gross),      c:C.accent,  sub:`${my.length} total loads`,  p:"loads"},
      {l:"OPEN LOADS",      v:open.length,     c:C.yellow,  sub:"In progress",               p:"loads"},
      {l:"OUTSTANDING",     v:fmt(outstanding), c:"#ec4899", sub:"Invoiced, not paid",        p:"loads"},
      {l:"PETTY CASH OWED", v:fmt(pcOwed),     c:C.red,     sub:"To Bruce",                  p:"petty"},
    ].map(s=>(
      <div key={s.l} onClick={()=>setPage(s.p)}
        style={card({cursor:"pointer",borderColor:`${s.c}30`,transition:"border-color .2s"})}>
        <div style={{fontSize:9,color:C.dim,letterSpacing:1.5,marginBottom:6}}>{s.l}</div>
        <div style={{fontSize:24,fontWeight:900,color:s.c}}>{s.v}</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>{s.sub}</div>
      </div>
    ))}
  </div>

  <div style={card()}>
    <div style={{fontSize:11,color:C.accent,fontWeight:900,letterSpacing:1.5,marginBottom:14}}>
      RECENT LOADS
    </div>
    {my.length===0&&(
      <div style={{color:C.border,textAlign:"center",padding:40}}>
        No loads yet —{" "}
        <button onClick={()=>setPage("loads")} style={{...btn(),padding:"6px 14px"}}>
          Start First Load
        </button>
      </div>
    )}
    {my.slice(0,5).map(load=>{
      const st = STAGES.find(s=>s.key===load.stage)||STAGES[0];
      const drv = users.find(u=>u.id===load.driverId);
      return(
        <div key={load.id} onClick={()=>setPage("loads")}
          style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"11px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
          <div>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
              <span style={{background:`${st.color}20`,color:st.color,
                border:`1px solid ${st.color}40`,borderRadius:4,
                padding:"2px 8px",fontSize:10,fontWeight:800}}>
                {st.icon} {st.label}
              </span>
            </div>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>
              {load.origin} → {load.destination}
            </div>
            <div style={{fontSize:11,color:C.dim}}>
              {brokerName(load)} · {drv?.name}
            </div>
          </div>
          <div style={{fontSize:18,fontWeight:900,color:C.text}}>{fmt(load.grossRate)}</div>
        </div>
      );
    })}
  </div>
</div>
```

);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADS — MASTER CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
function Loads({user,users,setUsers,loads,setLoads,shippers,setShippers,isCarrier,setPage}){
const [view,setView] = useState(“list”); // list | new | detail
const [sel,setSel] = useState(null);
const [stageFilter,setStageFilter] = useState(“all”);
const fileRefs = useRef({});

// ── helpers ──
const updateLoad = (id,changes) => {
setLoads(prev => {
const next = prev.map(l=>l.id===id?{…l,…changes}:l);
if(sel?.id===id) setSel(next.find(l=>l.id===id));
return next;
});
};

const advanceLoad = (id, targetKey) => {
const load = loads.find(l=>l.id===id);
if(!load) return;
const next = targetKey || nextStage(load.stage);
updateLoad(id,{
stage:next,
stageHistory:{…load.stageHistory,[next]:today()}
});
};

const uploadDoc = (lid, docKey, file) => {
if(!file) return;
const url = URL.createObjectURL(file);
updateLoad(lid,{
docs:{…loads.find(l=>l.id===lid)?.docs,[docKey]:url},
docNames:{…loads.find(l=>l.id===lid)?.docNames,[docKey]:file.name}
});
};

const visible = loads.filter(l=>{
if(l.deleted) return false;
if(!isCarrier && l.driverId!==user.id) return false;
if(stageFilter!==“all” && l.stage!==stageFilter) return false;
return true;
});

if(view===“new”) return(
<NewLoad users={users} user={user} isCarrier={isCarrier}
shippers={shippers} setShippers={setShippers}
onSave={load=>{setLoads(p=>[load,…p]);setSel(load);setView(“detail”);}}
onCancel={()=>setView(“list”)} setPage={setPage}/>
);

if(view===“detail”&&sel) return(
<LoadDetail load={sel} users={users} user={user} isCarrier={isCarrier}
shippers={shippers} setShippers={setShippers}
onUpdate={updateLoad} onAdvance={advanceLoad}
uploadDoc={uploadDoc} fileRefs={fileRefs}
onBack={()=>setView(“list”)} setPage={setPage}/>
);

// ── LOAD LIST ──
const all = loads.filter(l=>!l.deleted);
const totalGross = all.reduce((s,l)=>s+l.grossRate,0);
const totalPaid = all.filter(l=>l.stage===“paid”).reduce((s,l)=>s+(l.paidAmount||l.grossRate),0);
const totalOS = all.filter(l=>l.stage===“invoiced”).reduce((s,l)=>s+l.grossRate,0);

return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,
marginBottom:16,flexWrap:“wrap”,gap:10}}>
<div>
<div style={{fontSize:22,fontWeight:900,color:”#fff”}}>
{isCarrier?“All Loads”:“My Loads”}
</div>
<div style={{fontSize:11,color:C.dim}}>{visible.length} load(s)</div>
</div>
<button onClick={()=>setView(“new”)} style={{…btn(),fontSize:13,padding:“11px 24px”}}>
+ NEW LOAD
</button>
</div>

```
  {isCarrier&&(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:18}}>
      {[{l:"TOTAL GROSS",v:fmt(totalGross),c:C.accent},
        {l:"OUTSTANDING",v:fmt(totalOS),c:C.yellow},
        {l:"COLLECTED",v:fmt(totalPaid),c:C.green}]
        .map(s=>(
          <div key={s.l} style={card()}>
            <div style={{fontSize:9,color:C.dim,letterSpacing:1.5,marginBottom:4}}>{s.l}</div>
            <div style={{fontSize:20,fontWeight:900,color:s.c}}>{s.v}</div>
          </div>
        ))}
    </div>
  )}

  {/* Stage filter tabs */}
  <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
    <button onClick={()=>setStageFilter("all")}
      style={{...btn(stageFilter==="all"?C.accent:C.card1,"#fff"),
        padding:"5px 12px",fontSize:10}}>All</button>
    {STAGES.map(s=>(
      <button key={s.key} onClick={()=>setStageFilter(s.key)}
        style={{padding:"5px 10px",borderRadius:6,border:"none",
          cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700,
          background:stageFilter===s.key?s.color:C.card1,color:"#fff"}}>
        {s.icon} {s.label}
      </button>
    ))}
  </div>

  {/* Load cards */}
  <div style={{display:"flex",flexDirection:"column",gap:10}}>
    {visible.length===0&&(
      <div style={{...card({textAlign:"center",padding:50,color:C.border})}}>
        No loads. Click + NEW LOAD to create your first load.
      </div>
    )}
    {visible.map(load=>{
      const st = STAGES.find(s=>s.key===load.stage)||STAGES[0];
      const drv = users.find(u=>u.id===load.driverId);
      const si = stageIdx(load.stage);
      const {pct,carrierCut,driverNet} = calcLoad(load,users);
      return(
        <div key={load.id} onClick={()=>{setSel(load);setView("detail");}}
          style={card({cursor:"pointer",borderColor:`${st.color}50`,
            transition:"border-color .2s"})}>
          {/* Progress dots */}
          <div style={{display:"flex",gap:3,marginBottom:10}}>
            {STAGES.map((s,i)=>(
              <div key={s.key} title={s.label}
                style={{flex:1,height:4,borderRadius:2,
                  background:i<si?"#22c55e":i===si?st.color:C.card2}}/>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",
            alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{background:`${st.color}20`,color:st.color,
                  border:`1px solid ${st.color}50`,borderRadius:5,
                  padding:"3px 10px",fontSize:10,fontWeight:800}}>
                  {st.icon} {st.label}
                </span>
                <span style={{fontSize:11,color:C.dim}}>{load.loadNumber}</span>
                <span style={{fontSize:11,color:C.dim}}>{brokerName(load)}</span>
                {load.comcheck&&(
                  <span style={{fontSize:10,color:"#fbbf24",
                    background:"#78350f20",border:"1px solid #78350f50",
                    borderRadius:4,padding:"1px 7px"}}>⛽ COMCHECK</span>
                )}
              </div>
              <div style={{fontSize:16,fontWeight:800,color:C.text}}>
                {load.origin} → {load.destination}
              </div>
              <div style={{fontSize:11,color:C.dim}}>
                {drv?.name} · PU: {load.pickupDate} · DEL: {load.deliveryDate}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:22,fontWeight:900,color:C.text}}>
                {fmt(load.grossRate)}
              </div>
              {isCarrier&&(
                <>
                  <div style={{fontSize:11,color:"#a78bfa"}}>
                    Carrier: {fmt(carrierCut)} ({pct}%)
                  </div>
                  <div style={{fontSize:11,color:C.green}}>
                    Driver: {fmt(driverNet)}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    })}
  </div>
</div>
```

);
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW LOAD — upload rate con first
// ─────────────────────────────────────────────────────────────────────────────
function NewLoad({users,user,isCarrier,shippers,setShippers,onSave,onCancel,setPage}){
const fileRef = useRef(null);  // for any file (PDF, image, screenshot)
const camRef  = useRef(null);  // camera capture only
const [rcFile,setRcFile] = useState(null);
const [rcUrl,setRcUrl] = useState(null);
const [mode,setMode] = useState(“upload”); // upload | manual
const [err,setErr] = useState(””);
const [form,setForm] = useState({
driverId: isCarrier ? “tim” : user.id,
broker:“CNA Transportation”, brokerCustom:””,
brokerContact:””, loadNumber:””, origin:””, destination:””,
shipper:””, receiver:””, commodity:“General Freight”,
pickupDate:””, deliveryDate:””, grossRate:””,
hasComcheck:false, ccNum:””, ccAmt:””, ccDate:today(), notes:””
});

const handleFile = f => {
if(!f) return;
setRcFile(f);
if(f.type.startsWith(“image/”)) setRcUrl(URL.createObjectURL(f));
else setRcUrl(null);
};

const save = () => {
if(!form.loadNumber||!form.grossRate||!form.origin||!form.destination){
setErr(“Load #, gross rate, pickup, and delivery are required.”);
return;
}
const load = {
id:`load-${Date.now()}`,
driverId:form.driverId,
broker:form.broker, brokerCustom:form.brokerCustom,
brokerContact:form.brokerContact,
loadNumber:form.loadNumber, origin:form.origin,
destination:form.destination, shipper:form.shipper,
receiver:form.receiver, commodity:form.commodity,
pickupDate:form.pickupDate, deliveryDate:form.deliveryDate,
grossRate:parseFloat(form.grossRate)||0,
stage:“rate_con”,
comcheck:form.hasComcheck
?{number:form.ccNum,amount:parseFloat(form.ccAmt)||0,dateIssued:form.ccDate}
:null,
docs:{ rateCon:rcUrl, bolUnsigned:null, bolSigned:null,
lumper:null, pod:null, invoice:null },
docNames:{ rateCon:rcFile?.name||null, bolUnsigned:null, bolSigned:null,
lumper:null, pod:null, invoice:null },
lumperAmount:0, detentionAmount:0, expenses:[],
stageHistory:{rate_con:today()},
paidAmount:null, notes:form.notes, deleted:false
};
// save shipper to database if new
if(form.shipper && !shippers.includes(form.shipper)){
setShippers(p=>[…p,form.shipper]);
}
onSave(load);
};

const F = ({l,k,type=“text”,ph,full}) => (
<div style={full?{gridColumn:“span 2”}:{}}>
<span style={lbl}>{l}</span>
<input type={type} placeholder={ph} value={form[k]||””}
onChange={e=>setForm({…form,[k]:e.target.value})} style={inp}/>
</div>
);

const isCustom = form.broker===“Custom (type below)”;

return(
<div style={{maxWidth:700}}>
{/* Header */}
<div style={{display:“flex”,justifyContent:“space-between”,
alignItems:“center”,marginBottom:20,flexWrap:“wrap”,gap:8}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”}}>📋 New Load</div>
<button onClick={onCancel} style={ghost}>← Back to Loads</button>
</div>

```
  {err&&(
    <div style={{background:"#7f1d1d20",border:"1px solid #ef444440",
      borderRadius:8,padding:"10px 14px",color:"#fca5a5",
      fontSize:12,marginBottom:14}}>{err}</div>
  )}

  {/* ── STEP 1: RATE CON — import from email, photo, or file ── */}
  <div style={card({marginBottom:16,borderColor:C.accent,background:"#0a1929"})}>
    <div style={{fontSize:13,fontWeight:900,color:C.accent,letterSpacing:1,marginBottom:10}}>
      STEP 1 — IMPORT RATE CONFIRMATION
    </div>

    {/* How-to instructions */}
    <div style={{background:"#0f2744",borderRadius:10,padding:16,marginBottom:18,
      border:`1px solid #1e3a5f`}}>
      <div style={{fontSize:11,color:"#93c5fd",fontWeight:900,marginBottom:10,letterSpacing:1}}>
        HOW TO GET YOUR RATE CON INTO THE APP:
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[
          { icon:"📧", title:"From Email (most common)",
            steps:["Open your email app","Find the rate con email from the broker",
                   "Tap the PDF attachment — it downloads to your phone",
                   "Come back here and tap 'Import File' below","Pick that PDF — done"] },
          { icon:"📷", title:"Photo of a Printed Rate Con",
            steps:["Have the paper rate con in front of you",
                   "Tap 'Take Photo' below","Point camera at it — done"] },
          { icon:"🖼️", title:"Screenshot of the Email",
            steps:["Take a screenshot of the rate con in your email",
                   "Tap 'Import File' below","Pick the screenshot from your photos"] },
        ].map(m=>(
          <div key={m.title} style={{background:"#0c1f38",borderRadius:8,padding:12}}>
            <div style={{fontSize:12,fontWeight:800,color:"#e2e8f0",marginBottom:6}}>
              {m.icon} {m.title}
            </div>
            <ol style={{margin:0,paddingLeft:18}}>
              {m.steps.map((s,i)=>(
                <li key={i} style={{fontSize:11,color:C.dim,marginBottom:2}}>{s}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>

    {/* TWO separate inputs: one for files/PDFs, one for camera */}
    {/* File input — accepts everything including PDF from email */}
    <input type="file" accept="*/*"
      ref={fileRef}
      onChange={e=>handleFile(e.target.files[0])}
      style={{display:"none"}}/>
    {/* Camera-only input */}
    <input type="file" accept="image/*" capture="environment"
      ref={camRef}
      onChange={e=>handleFile(e.target.files[0])}
      style={{display:"none"}}/>

    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
      <button onClick={()=>fileRef.current?.click()}
        style={{...btn("#1d4ed8","#fff"),fontSize:13,padding:"14px 22px",
          border:"2px solid #3b82f6",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:20}}>📎</span>
        <div style={{textAlign:"left"}}>
          <div>Import File / PDF</div>
          <div style={{fontSize:10,fontWeight:400,opacity:0.8}}>
            From your downloads, email, or files app
          </div>
        </div>
      </button>

      <button onClick={()=>camRef.current?.click()}
        style={{...btn("#0f766e","#fff"),fontSize:13,padding:"14px 22px",
          border:"2px solid #14b8a6",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:20}}>📷</span>
        <div style={{textAlign:"left"}}>
          <div>Take a Photo</div>
          <div style={{fontSize:10,fontWeight:400,opacity:0.8}}>
            Of a printed rate con
          </div>
        </div>
      </button>
    </div>

    {/* File preview */}
    {rcFile?(
      <div style={{background:"#0f2744",borderRadius:10,padding:14,
        border:`1px solid ${C.green}50`}}>
        <div style={{fontSize:13,color:C.green,fontWeight:800,marginBottom:8}}>
          ✓ RATE CON IMPORTED: {rcFile.name}
        </div>
        {rcUrl&&(
          <img src={rcUrl} alt="Rate Con Preview"
            style={{width:"100%",maxHeight:280,objectFit:"contain",
              borderRadius:8,border:`1px solid ${C.border}`,marginBottom:8}}/>
        )}
        {!rcUrl&&(
          <div style={{fontSize:11,color:C.dim}}>
            📄 PDF imported — fill in the load details below from this rate con.
          </div>
        )}
        <button onClick={()=>{setRcFile(null);setRcUrl(null);}}
          style={{...ghost,fontSize:11,marginTop:8}}>✕ Remove — pick different file</button>
      </div>
    ):(
      <div style={{textAlign:"center",padding:"20px 0",
        border:`2px dashed ${C.border}`,borderRadius:10,color:C.border,fontSize:12}}>
        No file imported yet — use the buttons above
      </div>
    )}

    <div style={{marginTop:12,textAlign:"right"}}>
      <button onClick={()=>setMode(mode==="manual"?"upload":"manual")}
        style={{background:"none",border:"none",color:C.dim,cursor:"pointer",
          fontSize:11,fontFamily:"inherit"}}>
        {mode==="manual"?"↑ Back to file import":"⌨ Skip — I'll enter details manually instead"}
      </button>
    </div>
  </div>

  {/* ── STEP 2: LOAD DETAILS ── */}
  <div style={card()}>
    <div style={{fontSize:11,fontWeight:900,color:C.accent,letterSpacing:1,marginBottom:14}}>
      STEP 2 — LOAD DETAILS
      {rcFile&&<span style={{color:C.green,marginLeft:8}}>
        (Confirm details from rate con above)
      </span>}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      {isCarrier&&(
        <div>
          <span style={lbl}>Assign Driver</span>
          <select value={form.driverId}
            onChange={e=>setForm({...form,driverId:e.target.value})} style={inp}>
            {users.filter(u=>!u.deleted).map(u=>(
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <span style={lbl}>Broker</span>
        <select value={form.broker}
          onChange={e=>setForm({...form,broker:e.target.value})} style={inp}>
          {BROKERS.map(b=><option key={b}>{b}</option>)}
          <option value="Custom (type below)">Custom (type below)</option>
        </select>
      </div>

      {isCustom&&(
        <div>
          <span style={lbl}>Broker Name (custom)</span>
          <input value={form.brokerCustom}
            onChange={e=>setForm({...form,brokerCustom:e.target.value})}
            style={inp} placeholder="Type broker name — saved for reuse"/>
        </div>
      )}

      <F l="Load / Reference #" k="loadNumber" ph="From rate con"/>
      <F l="Broker Billing Email" k="brokerContact" type="email" ph="billing@broker.com"/>
      <F l="Pickup Location" k="origin" ph="City, State"/>
      <F l="Delivery Location" k="destination" ph="City, State"/>
      <F l="Shipper Name & Location" k="shipper" ph="ABC Warehouse, Chicago IL" full/>
      <F l="Receiver Name & Location" k="receiver" ph="XYZ Distribution, Memphis TN" full/>
      <F l="Commodity" k="commodity" ph="General Freight"/>
      <F l="Pickup Date" k="pickupDate" type="date"/>
      <F l="Delivery Date" k="deliveryDate" type="date"/>
      <F l="Gross Rate ($)" k="grossRate" type="number" ph="0.00"/>
      <F l="Notes" k="notes" ph="Optional" full/>
    </div>

    {/* ComCheck */}
    <div style={{marginTop:16,background:C.bg,borderRadius:10,
      padding:14,border:`1px solid ${C.border}`}}>
      <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
        <input type="checkbox" checked={form.hasComcheck}
          onChange={e=>setForm({...form,hasComcheck:e.target.checked})}/>
        <span style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>
          ⛽ ComCheck / Fuel Advance on This Load
        </span>
      </label>
      {form.hasComcheck&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
          gap:10,marginTop:12}}>
          {[{l:"ComCheck #",k:"ccNum",ph:"CC-XXXXX"},
            {l:"Amount ($)",k:"ccAmt",type:"number"},
            {l:"Date Issued",k:"ccDate",type:"date"}].map(f=>(
            <div key={f.k}>
              <span style={lbl}>{f.l}</span>
              <input type={f.type||"text"} placeholder={f.ph}
                value={form[f.k]||""}
                onChange={e=>setForm({...form,[f.k]:e.target.value})}
                style={{...inp,color:"#fbbf24",border:"1px solid #78350f80"}}/>
            </div>
          ))}
        </div>
      )}
    </div>

    <div style={{display:"flex",gap:10,marginTop:18}}>
      <button onClick={save}
        style={{...btn(C.green),fontSize:13,padding:"12px 26px"}}>
        ✓ CREATE LOAD
      </button>
      <button onClick={onCancel} style={ghost}>Cancel</button>
    </div>
  </div>
</div>
```

);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD DETAIL — THE FULL WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────
function LoadDetail({load,users,user,isCarrier,shippers,setShippers,
onUpdate,onAdvance,uploadDoc,fileRefs,onBack,setPage}){

const [showInvoice,setShowInvoice] = useState(false);
const [showPay,setShowPay] = useState(false);
const [showEmail,setShowEmail] = useState(false);
const [payAmt,setPayAmt] = useState(load.paidAmount||load.grossRate||””);
const [newExp,setNewExp] = useState({desc:””,amount:””});

const driver = users.find(u=>u.id===load.driverId);
const si = stageIdx(load.stage);
const st = STAGES[si]||STAGES[0];
const sc = st.color;
const isFirst = si===0;
const isLast = si===STAGE_KEYS.length-1;

// Who can act on current stage?
const canAct = st.who===“both”
|| (st.who===“carrier”&&isCarrier)
|| (st.who===“driver”&&load.driverId===user.id);

const {pct,carrierCut,driverNet,comcheck,invoiceTotal,expenses,driverProfit}
= calcLoad(load,users);

const set = (f,v) => onUpdate(load.id,{[f]:v});
const setCC = (f,v) => onUpdate(load.id,{comcheck:{…load.comcheck,[f]:v}});

const addExp = () => {
if(!newExp.desc||!newExp.amount) return;
onUpdate(load.id,{expenses:[…(load.expenses||[]),
{id:Date.now(),desc:newExp.desc,amount:parseFloat(newExp.amount)}]});
setNewExp({desc:””,amount:””});
};

const handleAdvance = () => {
if(load.stage===“invoiced”){ setShowPay(true); return; }
if(load.stage===“delivered”||load.stage===“billing”){
setShowInvoice(true); return;
}
onAdvance(load.id);
};

const handleGoBack = () => {
const prev = prevStage(load.stage);
onAdvance(load.id, prev);
};

const confirmPaid = () => {
onUpdate(load.id,{
stage:“paid”,
paidAmount:parseFloat(payAmt),
stageHistory:{…load.stageHistory,paid:today()}
});
setShowPay(false);
};

const openEmail = (type) => {
const subj = `ETTR Invoice — Load ${load.loadNumber} — ${load.origin} to ${load.destination}`;
const body = `Please find attached billing for Load #${load.loadNumber}.\n\nPickup: ${load.origin}\nDelivery: ${load.destination}\nDelivery Date: ${load.deliveryDate}\nTrucking: ${fmt(load.grossRate)}\nLumper: ${fmt(load.lumperAmount||0)}\nDetention: ${fmt(load.detentionAmount||0)}\nTotal Due: ${fmt((load.grossRate||0)+(load.lumperAmount||0)+(load.detentionAmount||0))}\n\nAttached: ETTR Invoice, Rate Confirmation, Signed BOL, POD, Receipts\n\nThank you,\nBruce Edgerton\nEdgerton Truck & Trailer Repair\n715-509-0114\nMC#699644`;
const to = load.brokerContact||””;
if(type===“gmail”) window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`);
else if(type===“zoho”) window.open(`https://mail.zoho.com/zm/#compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subj)}`);
else window.location.href=`mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
onUpdate(load.id,{stage:“invoiced”,stageHistory:{…load.stageHistory,invoiced:today()}});
setShowEmail(false);
setShowInvoice(false);
};

const Sec = ({t,children,bc}) => (
<div style={card({marginBottom:14,borderColor:bc||C.border})}>
<div style={{fontSize:10,color:C.accent,fontWeight:900,
letterSpacing:1.5,marginBottom:14}}>{t}</div>
{children}
</div>
);

const Row = ({l,v,vc,big}) => (
<div style={{display:“flex”,justifyContent:“space-between”,
alignItems:“center”,marginBottom:8}}>
<span style={{fontSize:big?12:11,color:C.dim}}>{l}</span>
<span style={{fontSize:big?18:13,fontWeight:big?900:700,color:vc||C.text}}>{v}</span>
</div>
);

const DocBox = ({docKey,label,required}) => {
const hasDoc = load.docNames?.[docKey];
const hasImg = load.docs?.[docKey];
if(!fileRefs.current[load.id]) fileRefs.current[load.id]={};
return(
<div style={{background:C.bg,borderRadius:10,padding:14,
border:`1px solid ${hasDoc?C.green+"40":C.border}`}}>
<div style={{...lbl,color:required&&!hasDoc?C.yellow:C.dim}}>{label}{required&&!hasDoc?” ⚠”:””}</div>
{hasDoc&&hasImg&&hasImg.startsWith(“blob:”)&&(
<img src={hasImg} alt={label}
style={{width:“100%”,maxHeight:100,objectFit:“contain”,
borderRadius:6,marginBottom:8}}/>
)}
<div style={{fontSize:12,color:hasDoc?C.green:C.muted,marginBottom:8}}>
{hasDoc?`✓ ${load.docNames[docKey]}`:“Not uploaded”}
</div>
<input type=“file” accept=“image/*,application/pdf” capture=“environment”
ref={el=>{fileRefs.current[load.id][docKey]=el;}}
onChange={e=>uploadDoc(load.id,docKey,e.target.files[0])}
style={{display:“none”}}/>
<button onClick={()=>fileRefs.current[load.id][docKey]?.click()}
style={{…ghost,fontSize:11,padding:“7px 12px”}}>
📷 {hasDoc?“Replace”:“Upload / Photo”}
</button>
</div>
);
};

return(
<div>
{/* Invoice modal */}
{showInvoice&&(
<ETTRInvoice load={load} users={users}
onClose={()=>setShowInvoice(false)}
onEmail={()=>setShowEmail(true)}
onMarkInvoiced={()=>{
onUpdate(load.id,{stage:“invoiced”,
stageHistory:{…load.stageHistory,invoiced:today()}});
setShowInvoice(false);
}}/>
)}

```
  {/* Email modal */}
  {showEmail&&(
    <div style={{position:"fixed",inset:0,background:"#000c",zIndex:999,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={card({maxWidth:400,width:"90%",borderColor:"#ec4899"})}>
        <div style={{fontSize:14,fontWeight:900,color:"#fff",marginBottom:6}}>
          📤 Send Billing Package
        </div>
        <div style={{fontSize:11,color:C.dim,marginBottom:20}}>
          Opens your email app with the billing package pre-filled. Attach your docs manually or from the document section below.
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={()=>openEmail("gmail")} style={btn("#ea4335")}>
            📧 Open in Gmail
          </button>
          <button onClick={()=>openEmail("zoho")} style={btn("#e04a28")}>
            📧 Open in Zoho Mail
          </button>
          <button onClick={()=>openEmail("default")} style={btn(C.card2,"#fff")}>
            📧 Open in Device Mail App
          </button>
          <button onClick={()=>setShowEmail(false)} style={ghost}>Cancel</button>
        </div>
      </div>
    </div>
  )}

  {/* Top nav */}
  <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
    <button onClick={onBack} style={ghost}>← Back to Loads</button>
    <span style={{color:C.border}}>|</span>
    <span style={{fontSize:12,color:C.dim}}>
      {brokerName(load)} · {load.loadNumber}
    </span>
  </div>

  {/* ── STAGE BAR ── */}
  <div style={{background:`${sc}12`,border:`2px solid ${sc}50`,
    borderRadius:12,padding:20,marginBottom:18}}>

    {/* Progress track */}
    <div style={{display:"flex",gap:0,marginBottom:16,overflowX:"auto"}}>
      {STAGES.map((s,i)=>{
        const done = i<si;
        const cur = i===si;
        const fut = i>si;
        return(
          <div key={s.key} style={{display:"flex",alignItems:"center",flex:1,minWidth:0}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",flex:"0 0 auto"}}>
              <div style={{width:32,height:32,borderRadius:"50%",
                background:done?C.green:cur?s.color:C.card2,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:15,border:`2px solid ${done?C.green:cur?s.color:C.border}`,
                transition:"all .3s"}}>
                {done?"✓":s.icon}
              </div>
              <div style={{fontSize:8,color:done?C.green:cur?s.color:C.border,
                textAlign:"center",marginTop:3,maxWidth:60,
                lineHeight:1.2,letterSpacing:0.5}}>
                {s.label}
              </div>
            </div>
            {i<STAGES.length-1&&(
              <div style={{flex:1,height:2,
                background:done?C.green:C.card2,margin:"0 2px",
                marginBottom:16,transition:"background .3s"}}/>
            )}
          </div>
        );
      })}
    </div>

    {/* Current stage info */}
    <div style={{fontSize:18,fontWeight:900,color:sc,marginBottom:4}}>
      {st.icon} {st.label}
    </div>
    <div style={{fontSize:12,color:C.dim,marginBottom:16}}>{st.desc}</div>

    {/* ── BACK / FORWARD BUTTONS — always visible ── */}
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      {!isFirst&&(
        <button onClick={handleGoBack}
          style={{...btn(C.card2,"#94a3b8"),border:`1px solid ${C.border}`}}>
          ← Go Back a Step
        </button>
      )}

      {!isLast&&canAct&&!showPay&&(
        <button onClick={handleAdvance}
          style={{...btn(sc),fontSize:13,padding:"12px 28px",
            boxShadow:`0 0 20px ${sc}50`}}>
          {st.action} →
        </button>
      )}

      {!isLast&&!canAct&&(
        <span style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>
          Waiting on {st.who==="driver"?"driver":"carrier"} action
        </span>
      )}

      {showPay&&(
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:"#94a3b8"}}>Amount received ($):</span>
          <input type="number" value={payAmt}
            onChange={e=>setPayAmt(e.target.value)}
            style={{...inp,width:130,border:`1px solid ${C.green}`}}/>
          <button onClick={confirmPaid} style={btn(C.green)}>✓ Confirm Paid</button>
          <button onClick={()=>setShowPay(false)} style={ghost}>Cancel</button>
        </div>
      )}

      {isLast&&(
        <div style={{fontSize:14,color:C.green,fontWeight:900}}>
          ✓ LOAD COMPLETE — PAID {load.paidAmount?fmt(load.paidAmount):""}
        </div>
      )}
    </div>

    {/* Stage history */}
    <div style={{marginTop:14,display:"flex",gap:8,flexWrap:"wrap"}}>
      {STAGES.map(s=>{
        const d = load.stageHistory?.[s.key];
        if(!d) return null;
        return(
          <span key={s.key} style={{fontSize:10,color:C.dim,
            background:C.card2,borderRadius:4,padding:"2px 8px"}}>
            {s.icon} {d}
          </span>
        );
      })}
    </div>
  </div>

  {/* ── STAGE-SPECIFIC DOCUMENT UPLOADS ── */}
  {(load.stage==="rate_con"||load.stage==="accepted")&&(
    <Sec t="📋 RATE CONFIRMATION DOCUMENTS" bc="#3b82f640">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <DocBox docKey="rateCon" label="Rate Con — Original (upload or photo)" required/>
        {load.stage==="accepted"&&(
          <DocBox docKey="rateConSigned" label="Rate Con — Signed/Accepted copy"/>
        )}
      </div>
      {load.stage==="rate_con"&&(
        <div style={{marginTop:14}}>
          <div style={{fontSize:11,color:C.dim,marginBottom:10}}>
            After uploading the rate con, confirm acceptance and the app will generate an email to the broker.
          </div>
          <button onClick={()=>setShowEmail(true)}
            style={{...btn("#06b6d4"),marginRight:8}}>
            ✉️ Confirm Acceptance & Email Broker
          </button>
        </div>
      )}
    </Sec>
  )}

  {(load.stage==="at_pickup"||load.stage==="in_transit")&&(
    <Sec t="🏭 PICKUP DOCUMENTS — BOL FROM SHIPPER" bc="#f59e0b40">
      <div style={{fontSize:11,color:C.dim,marginBottom:12}}>
        Get the BOL from the shipper. Upload unsigned first, then upload signed after shipper signs.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <DocBox docKey="bolUnsigned" label="BOL — Unsigned (get from shipper)"/>
        <DocBox docKey="bolSigned" label="BOL — Signed by Shipper" required/>
      </div>
    </Sec>
  )}

  {(load.stage==="delivered"||load.stage==="billing")&&(
    <Sec t="📦 DELIVERY DOCUMENTS — RECEIVER SIGNED" bc="#84cc1640">
      <div style={{fontSize:11,color:C.dim,marginBottom:12}}>
        Upload signed BOL from receiver, POD, and any lumper or incidental receipts.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <DocBox docKey="pod" label="POD — Proof of Delivery (receiver signed)" required/>
        <DocBox docKey="lumper" label="Lumper / Unload Receipt (if applicable)"/>
      </div>
    </Sec>
  )}

  {/* ── BILLING SECTION — available to both from delivered onwards ── */}
  {(stageIdx(load.stage)>=stageIdx("delivered"))&&(
    <Sec t="🧾 BILLING PACKAGE — SEND TO BROKER" bc="#ec489940">
      <div style={{fontSize:11,color:C.dim,marginBottom:14}}>
        Both Tim and Bruce can submit billing. The package includes the ETTR invoice, rate con, signed BOL, POD, and all receipts.
      </div>

      {/* Doc checklist */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        {[{k:"rateCon",l:"Rate Con"},{k:"bolSigned",l:"Signed BOL"},
          {k:"pod",l:"POD"},{k:"lumper",l:"Lumper Rcpt"},{k:"invoice",l:"ETTR Invoice"}]
          .map(d=>{
            const has = load.docNames?.[d.k];
            return(
              <div key={d.k} style={{display:"flex",alignItems:"center",gap:6,
                background:C.card2,borderRadius:7,padding:"8px 10px",
                border:`1px solid ${has?C.green+"40":C.border}`}}>
                <span>{has?"✅":"⬜"}</span>
                <span style={{fontSize:10,color:has?C.green:C.muted,fontWeight:700}}>
                  {d.l}
                </span>
              </div>
            );
          })}
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={()=>setShowInvoice(true)} style={btn("#7c3aed")}>
          🧾 Preview ETTR Invoice
        </button>
        <button onClick={()=>{window.print();}} style={btn(C.card2,"#94a3b8")}>
          🖨️ Print Package
        </button>
        <button onClick={()=>setShowEmail(true)} style={btn("#ec4899")}>
          📤 Email to Broker
        </button>
      </div>
    </Sec>
  )}

  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
    {/* Left col */}
    <div>
      <Sec t="📍 LOAD DETAILS">
        {[
          {l:"Load #",       k:"loadNumber", ed:isCarrier},
          {l:"Broker",       k:"broker",      ed:false, v:brokerName(load)},
          {l:"Driver",       k:"driver",      ed:false, v:driver?.name},
          {l:"Pickup",       k:"origin",      ed:isCarrier},
          {l:"Delivery",     k:"destination", ed:isCarrier},
          {l:"Shipper",      k:"shipper",     ed:true},
          {l:"Receiver",     k:"receiver",    ed:true},
          {l:"Commodity",    k:"commodity",   ed:true},
          {l:"Pickup Date",  k:"pickupDate",  ed:true, type:"date"},
          {l:"Delivery Date",k:"deliveryDate",ed:true, type:"date"},
          {l:"Broker Email", k:"brokerContact",ed:isCarrier,type:"email"},
        ].map(f=>(
          <div key={f.k} style={{marginBottom:10}}>
            <span style={lbl}>{f.l}</span>
            {(f.ed!==false)
              ?<input type={f.type||"text"} value={f.v!==undefined?f.v:(load[f.k]||"")}
                 onChange={e=>set(f.k,e.target.value)} style={inp}
                 readOnly={f.ed===false}/>
              :<div style={{fontSize:13,color:C.text,fontWeight:600,
                  padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                {f.v||load[f.k]||"—"}
              </div>
            }
          </div>
        ))}
        {isCarrier&&(
          <div style={{marginTop:8}}>
            <span style={lbl}>Reassign Driver</span>
            <select value={load.driverId}
              onChange={e=>set("driverId",e.target.value)} style={inp}>
              {users.filter(u=>!u.deleted).map(u=>(
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
      </Sec>

      {/* ComCheck */}
      <Sec t="⛽ COMCHECK / FUEL ADVANCE">
        {load.comcheck?(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><span style={lbl}>ComCheck #</span>
              <input value={load.comcheck.number||""} onChange={e=>setCC("number",e.target.value)}
                style={{...inp,color:"#fbbf24"}}/></div>
            <div><span style={lbl}>Amount ($)</span>
              <input type="number" value={load.comcheck.amount||""}
                onChange={e=>setCC("amount",parseFloat(e.target.value))}
                style={{...inp,color:"#fbbf24"}}/></div>
            <div><span style={lbl}>Date Issued</span>
              <input type="date" value={load.comcheck.dateIssued||""}
                onChange={e=>setCC("dateIssued",e.target.value)}
                style={{...inp,color:"#fbbf24"}}/></div>
          </div>
        ):(
          <div>
            <div style={{color:C.muted,fontSize:12,marginBottom:10}}>No ComCheck on this load.</div>
            <button onClick={()=>set("comcheck",{number:"",amount:0,dateIssued:today()})}
              style={btn("#78350f","#fbbf24")}>+ Add ComCheck</button>
          </div>
        )}
      </Sec>
    </div>

    {/* Right col */}
    <div>
      {/* Financials */}
      <Sec t="💵 FINANCIALS — TRANSPARENT">
        <Row l="Gross Rate (Rate Con)" v={fmt(load.grossRate)} vc={C.text} big/>
        <Row l={`Carrier Commission (${pct}%)`} v={`− ${fmt(carrierCut)}`} vc="#a78bfa"/>
        <Row l={`Driver Net — ${driver?.name?.split(" ")[0]}`} v={fmt(driverNet)} vc={C.accent}/>
        {load.comcheck&&<Row l="ComCheck Advance" v={`− ${fmt(comcheck)}`} vc="#fbbf24"/>}
        {isCarrier&&<Row l="Broker Invoice Total" v={fmt(invoiceTotal)} vc="#ec4899"/>}

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,marginTop:8}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[{l:"Trucking ($)",k:"grossRate"},{l:"Lumper ($)",k:"lumperAmount"},
              {l:"Detention ($)",k:"detentionAmount"}].map(f=>(
              <div key={f.k}>
                <span style={lbl}>{f.l}</span>
                <input type="number" value={load[f.k]||""}
                  onChange={e=>set(f.k,parseFloat(e.target.value)||0)} style={inp}/>
              </div>
            ))}
          </div>
          <Row l="Driver Actual Profit" v={fmt(driverProfit)} vc={C.green} big/>
        </div>

        {load.stage==="paid"&&load.paidAmount&&(
          <div style={{marginTop:10,background:"#052e1620",border:`1px solid ${C.green}30`,
            borderRadius:8,padding:12}}>
            <span style={lbl}>Payment Received</span>
            <div style={{fontSize:22,fontWeight:900,color:C.green}}>{fmt(load.paidAmount)}</div>
          </div>
        )}
      </Sec>

      {/* Expenses */}
      <Sec t="🧾 LOAD EXPENSES (driver — no fuel)">
        {(load.expenses||[]).map(exp=>(
          <div key={exp.id} style={{display:"flex",justifyContent:"space-between",
            alignItems:"center",background:C.bg,borderRadius:7,
            padding:"8px 12px",marginBottom:6}}>
            <span style={{fontSize:12}}>{exp.desc}</span>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{color:"#f87171",fontWeight:700}}>{fmt(exp.amount)}</span>
              <button onClick={()=>onUpdate(load.id,
                {expenses:load.expenses.filter(e=>e.id!==exp.id)})}
                style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}>✕
              </button>
            </div>
          </div>
        ))}
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <input placeholder="Scale ticket, lumper, etc. (not fuel)"
            value={newExp.desc}
            onChange={e=>setNewExp({...newExp,desc:e.target.value})}
            style={{...inp,flex:1}}/>
          <input type="number" placeholder="$" value={newExp.amount}
            onChange={e=>setNewExp({...newExp,amount:e.target.value})}
            style={{...inp,width:80}}/>
          <button onClick={addExp} style={btn()}>+</button>
        </div>
      </Sec>
    </div>
  </div>

  {/* All documents repo */}
  <Sec t="📁 ALL LOAD DOCUMENTS">
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
      <DocBox docKey="rateCon"    label="Rate Confirmation"/>
      <DocBox docKey="bolUnsigned" label="BOL — Unsigned"/>
      <DocBox docKey="bolSigned"  label="BOL — Signed"/>
      <DocBox docKey="lumper"     label="Lumper Receipt"/>
      <DocBox docKey="pod"        label="POD — Proof of Delivery"/>
      <DocBox docKey="invoice"    label="ETTR Invoice"/>
    </div>
  </Sec>

  {/* Notes */}
  <Sec t="📝 NOTES">
    <textarea value={load.notes||""} onChange={e=>set("notes",e.target.value)}
      style={{...inp,minHeight:80,resize:"vertical"}}
      placeholder="Load notes, special instructions, etc."/>
  </Sec>

  {/* Remove load — carrier only, double confirm */}
  {isCarrier&&(
    <RemoveLoad loadId={load.id} onRemove={()=>{
      onUpdate(load.id,{deleted:true});
      onBack();
    }}/>
  )}
</div>
```

);
}

function RemoveLoad({loadId,onRemove}){
const [step,setStep]=useState(0);
return(
<div style={{textAlign:“right”,marginTop:16}}>
{step===0&&<button onClick={()=>setStep(1)} style={ghost}>🗑 Remove Load</button>}
{step===1&&(
<div style={{display:“flex”,gap:10,justifyContent:“flex-end”,alignItems:“center”}}>
<span style={{fontSize:12,color:C.red}}>Are you sure? This cannot be undone.</span>
<button onClick={onRemove}
style={btn(C.red)}>⚠️ Yes, Remove</button>
<button onClick={()=>setStep(0)} style={ghost}>Cancel</button>
</div>
)}
</div>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// ETTR INVOICE — matches your actual invoice doc
// ─────────────────────────────────────────────────────────────────────────────
function ETTRInvoice({load,users,onClose,onEmail,onMarkInvoiced}){
const brok = brokerName(load);
const trucking = load.grossRate||0;
const lumper = load.lumperAmount||0;
const detention = load.detentionAmount||0;
const total = trucking+lumper+detention;

return(
<div style={{position:“fixed”,inset:0,background:”#000d”,zIndex:1000,
display:“flex”,alignItems:“center”,justifyContent:“center”,
padding:20,overflowY:“auto”}}>
<div style={{background:”#fff”,borderRadius:12,width:“100%”,
maxWidth:600,color:”#111”,fontFamily:“Georgia,serif”,padding:44}}>

```
    <div style={{textAlign:"center",marginBottom:20,
      borderBottom:"1px solid #ccc",paddingBottom:16}}>
      <div style={{fontSize:18,fontWeight:700,letterSpacing:1}}>
        Edgerton Truck & Trailer Repair
      </div>
    </div>

    <div style={{display:"flex",justifyContent:"space-between",
      marginBottom:24,flexWrap:"wrap",gap:16}}>
      <div style={{fontSize:13,lineHeight:1.9}}>
        <div style={{fontWeight:700}}>Bruce Edgerton</div>
        <div>N4202 Hill Rd</div>
        <div>Bonduel WI 54107</div>
        <div>MC#699644</div>
        <div style={{marginTop:6}}>bruce.edgerton@yahoo.com</div>
        <div>715-509-0114</div>
      </div>
      <div style={{fontSize:13,lineHeight:2.2}}>
        {[{l:"Date Sent:",    v:today()},
          {l:"Load #",        v:load.loadNumber},
          {l:"Pick up:",      v:load.origin},
          {l:"Delivery:",     v:load.destination},
          {l:"Del. Date:",    v:load.deliveryDate}
        ].map(r=>(
          <div key={r.l} style={{display:"flex",gap:12}}>
            <span style={{color:"#666",minWidth:80}}>{r.l}</span>
            <span style={{borderBottom:"1px solid #000",minWidth:140}}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>

    <div style={{marginBottom:20}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontSize:13,color:"#666"}}>Bill to:</span>
        <span style={{borderBottom:"1px solid #000",minWidth:200,
          fontSize:14,fontWeight:700,paddingLeft:4}}>{brok}</span>
      </div>
    </div>

    <div style={{fontSize:13,color:"#444",marginBottom:16}}>
      Please remit payment amount for transport services
    </div>

    <div style={{fontSize:14,lineHeight:2.4}}>
      {[{l:"Trucking:",  v:trucking},
        {l:"Pallets:",   v:0},
        {l:"Lumpers:",   v:lumper},
        {l:"Detention:", v:detention}
      ].map(r=>(
        <div key={r.l} style={{display:"flex",gap:12,alignItems:"center"}}>
          <span style={{width:110,color:"#666"}}>{r.l}</span>
          <span style={{borderBottom:"1px solid #ccc",minWidth:140,fontWeight:r.v?700:400}}>
            {r.v?fmt(r.v):""}
          </span>
        </div>
      ))}
      <div style={{display:"flex",gap:12,marginTop:8,
        borderTop:"2px solid #000",paddingTop:8}}>
        <span style={{width:110,fontWeight:700}}>Total:</span>
        <span style={{minWidth:140,fontWeight:900,fontSize:18}}>{fmt(total)}</span>
      </div>
    </div>

    {/* Doc list */}
    <div style={{marginTop:24,background:"#f8f9fa",borderRadius:8,
      padding:12,fontSize:11,color:"#666"}}>
      <div style={{fontWeight:700,marginBottom:6}}>ATTACHED DOCUMENTS:</div>
      {[["Rate Confirmation",load.docNames?.rateCon],
        ["Signed BOL",       load.docNames?.bolSigned],
        ["Proof of Delivery",load.docNames?.pod],
        ["Lumper Receipt",   load.docNames?.lumper]
      ].filter(d=>d[1]).map(d=>(
        <div key={d[0]}>✓ {d[0]}: {d[1]}</div>
      ))}
    </div>

    <div style={{marginTop:28,textAlign:"right"}}>
      <div style={{fontSize:13,marginBottom:4}}>Thank You</div>
      <div style={{fontFamily:"cursive",fontSize:22}}>Bruce Edgerton</div>
    </div>

    <div style={{display:"flex",gap:10,marginTop:24,
      justifyContent:"center",flexWrap:"wrap"}}>
      <button onClick={onEmail}
        style={{...btn("#ec4899"),fontFamily:"'Courier New',monospace"}}>
        📤 Email to Broker
      </button>
      <button onClick={()=>{onMarkInvoiced();onClose();}}
        style={{...btn(C.green),fontFamily:"'Courier New',monospace"}}>
        ✓ Mark Invoiced
      </button>
      <button onClick={()=>{window.print();}}
        style={{...btn(C.card1,"#94a3b8"),fontFamily:"'Courier New',monospace"}}>
        🖨️ Print
      </button>
      <button onClick={onClose}
        style={{...ghost,fontFamily:"'Courier New',monospace"}}>Close</button>
    </div>
  </div>
</div>
```

);
}

// ─────────────────────────────────────────────────────────────────────────────
// PETTY CASH
// RULES:
//  - Uploading a receipt / invoice does NOT mark anything paid — it is a supporting doc only
//  - Mark Paid is a separate button — either Tim OR Bruce can click it
//  - When adding a new expense, you can attach the invoice/bill right at entry time
//  - Camera and file picker are two separate buttons so camera actually opens
// ─────────────────────────────────────────────────────────────────────────────
function PettyCash({user,petty,setPetty,isCarrier,setPage}){
const [showAdd,setShowAdd]=useState(false);
const [ne,setNe]=useState({
date:today(),description:””,vendor:””,amount:””,
category:“Repairs & Maintenance”,paidBy:“Bruce”,notes:””,
attachUrl:null,attachName:null
});
const [del,setDel]=useState({id:null,step:0});
const [viewModal,setViewModal]=useState(null);

// ONE file ref and ONE camera ref per entry, plus refs for the “add new” form
const fileRefs = useRef({});  // file picker refs per entry id
const camRefs  = useRef({});  // camera refs per entry id
const newFileRef = useRef(null);
const newCamRef  = useRef(null);

const active = petty.filter(p=>!p.deleted);
const owed   = active.filter(p=>p.status===“unpaid”).reduce((s,p)=>s+p.amount,0);
const paid   = active.filter(p=>p.status===“paid”).reduce((s,p)=>s+p.amount,0);

// ── Add new entry ──
const handleNewAttach = file => {
if(!file) return;
const url = URL.createObjectURL(file);
setNe(prev=>({…prev,attachUrl:url,attachName:file.name}));
};

const addEntry = () => {
if(!ne.description||!ne.amount||isNaN(parseFloat(ne.amount))) return;
setPetty(prev=>[…prev,{
id:`pc-${Date.now()}`,
date:ne.date, description:ne.description, vendor:ne.vendor,
amount:parseFloat(ne.amount), category:ne.category,
paidBy:ne.paidBy, notes:ne.notes,
// attachUrl/attachName = the invoice/bill Bruce paid (supporting doc for the EXPENSE)
attachUrl:ne.attachUrl, attachName:ne.attachName,
// receiptUrl/receiptName = proof of repayment (added later when Tim pays Bruce back)
receiptUrl:null, receiptName:null,
status:“unpaid”, paidDate:null, paidBy2:null,
deleted:false
}]);
setNe({date:today(),description:””,vendor:””,amount:””,
category:“Repairs & Maintenance”,paidBy:“Bruce”,notes:””,
attachUrl:null,attachName:null});
setShowAdd(false);
};

// ── Attach supporting doc to existing entry (does NOT mark paid) ──
const attachDoc = (id, file) => {
if(!file) return;
const url = URL.createObjectURL(file);
setPetty(prev=>prev.map(p=>p.id===id
?{…p,receiptUrl:url,receiptName:file.name}
:p
));
// Note: status is NOT changed here — attaching a doc is just documentation
};

// ── Mark paid — separate explicit action by either user ──
const markPaid   = id => setPetty(prev=>prev.map(p=>p.id===id
?{…p,status:“paid”,paidDate:today(),paidBy2:user.name} :p));
const markUnpaid = id => setPetty(prev=>prev.map(p=>p.id===id
?{…p,status:“unpaid”,paidDate:null,paidBy2:null} :p));

// ── Soft delete ──
const softDel = id => {
if(del.id===id&&del.step===1){
setPetty(prev=>prev.map(p=>p.id===id?{…p,deleted:true}:p));
setDel({id:null,step:0});
} else {
setDel({id,step:1});
}
};

const DocBtns = ({entryId,fileRef,camRef,onFile}) => (
<>
{/* Hidden file input — opens files app / downloads */}
<input type=“file” accept=”*/*”
ref={fileRef}
onChange={e=>onFile(e.target.files[0])}
style={{display:“none”}}/>
{/* Hidden camera input */}
<input type=“file” accept=“image/*” capture=“environment”
ref={camRef}
onChange={e=>onFile(e.target.files[0])}
style={{display:“none”}}/>
<button onClick={()=>fileRef.current?.click()}
style={{…ghost,fontSize:11,padding:“7px 12px”,
display:“flex”,alignItems:“center”,gap:5}}>
<span>📎</span> Import File
</button>
<button onClick={()=>camRef.current?.click()}
style={{…ghost,fontSize:11,padding:“7px 12px”,
display:“flex”,alignItems:“center”,gap:5}}>
<span>📷</span> Take Photo
</button>
</>
);

return(
<div>
{/* Header */}
<div style={{display:“flex”,justifyContent:“space-between”,
alignItems:“center”,marginBottom:20,flexWrap:“wrap”,gap:8}}>
<div style={{fontSize:22,fontWeight:900,color:”#fff”}}>💼 Petty Cash</div>
<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>
{showAdd?“✕ Cancel”:”+ Log Expense”}
</button>
</div>

```
  {/* Totals */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:20}}>
    {[{l:"TOTAL OWED TO BRUCE",v:fmt(owed),c:C.red},
      {l:"PAID BACK",v:fmt(paid),c:C.green},
      {l:"OPEN ITEMS",v:active.filter(p=>p.status==="unpaid").length,c:C.yellow}]
      .map(s=>(
        <div key={s.l} style={card()}>
          <div style={{fontSize:9,color:C.dim,letterSpacing:1.5,marginBottom:4}}>{s.l}</div>
          <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
        </div>
      ))}
  </div>

  {/* ── ADD NEW ENTRY FORM ── */}
  {showAdd&&(
    <div style={card({marginBottom:20,borderColor:C.accent,background:"#0a1929"})}>
      <div style={{fontSize:11,color:C.accent,fontWeight:900,letterSpacing:1,marginBottom:14}}>
        LOG EXPENSE — Bruce paid for something Tim owes back
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div>
          <span style={lbl}>DATE PAID</span>
          <input type="date" value={ne.date}
            onChange={e=>setNe({...ne,date:e.target.value})} style={inp}/>
        </div>
        <div>
          <span style={lbl}>AMOUNT ($)</span>
          <input type="number" placeholder="0.00" value={ne.amount}
            onChange={e=>setNe({...ne,amount:e.target.value})} style={inp}/>
        </div>
        <div style={{gridColumn:"span 2"}}>
          <span style={lbl}>DESCRIPTION — what was it for?</span>
          <input placeholder="e.g. Truck repair at Mike's Inc, tires, supplies..."
            value={ne.description}
            onChange={e=>setNe({...ne,description:e.target.value})} style={inp}/>
        </div>
        <div>
          <span style={lbl}>VENDOR / WHERE</span>
          <input placeholder="Shop name, store, etc."
            value={ne.vendor}
            onChange={e=>setNe({...ne,vendor:e.target.value})} style={inp}/>
        </div>
        <div>
          <span style={lbl}>CATEGORY</span>
          <select value={ne.category}
            onChange={e=>setNe({...ne,category:e.target.value})} style={inp}>
            {PETTY_CATS.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <span style={lbl}>PAID BY</span>
          <select value={ne.paidBy}
            onChange={e=>setNe({...ne,paidBy:e.target.value})} style={inp}>
            <option>Bruce</option>
            <option>Tim</option>
          </select>
        </div>
        <div>
          <span style={lbl}>NOTES (optional)</span>
          <input value={ne.notes}
            onChange={e=>setNe({...ne,notes:e.target.value})} style={inp}/>
        </div>
      </div>

      {/* Attach the invoice/bill for this expense */}
      <div style={{background:C.bg,borderRadius:10,padding:14,
        border:`1px solid ${C.border}`,marginBottom:14}}>
        <div style={{fontSize:11,color:C.dim,fontWeight:800,marginBottom:4,letterSpacing:1}}>
          ATTACH INVOICE OR BILL (optional but recommended)
        </div>
        <div style={{fontSize:11,color:C.muted,marginBottom:10}}>
          Upload the receipt, invoice, or bill Bruce paid. This is the supporting document for this expense — it does NOT mark anything paid.
        </div>
        {ne.attachName&&(
          <div style={{fontSize:12,color:"#93c5fd",fontWeight:700,marginBottom:8}}>
            📎 {ne.attachName}
            <button onClick={()=>setNe({...ne,attachUrl:null,attachName:null})}
              style={{background:"none",border:"none",color:C.dim,
                cursor:"pointer",marginLeft:8,fontSize:11}}>✕</button>
          </div>
        )}
        {ne.attachUrl&&ne.attachUrl.startsWith("blob:")&&(
          <img src={ne.attachUrl} alt="Invoice preview"
            style={{width:"100%",maxHeight:160,objectFit:"contain",
              borderRadius:8,marginBottom:10,border:`1px solid ${C.border}`}}/>
        )}
        {/* Separate file and camera inputs for the new entry form */}
        <input type="file" accept="*/*"
          ref={newFileRef}
          onChange={e=>handleNewAttach(e.target.files[0])}
          style={{display:"none"}}/>
        <input type="file" accept="image/*" capture="environment"
          ref={newCamRef}
          onChange={e=>handleNewAttach(e.target.files[0])}
          style={{display:"none"}}/>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>newFileRef.current?.click()}
            style={{...ghost,fontSize:11,display:"flex",alignItems:"center",gap:5}}>
            <span>📎</span> Import File / PDF
          </button>
          <button onClick={()=>newCamRef.current?.click()}
            style={{...ghost,fontSize:11,display:"flex",alignItems:"center",gap:5}}>
            <span>📷</span> Take Photo
          </button>
        </div>
      </div>

      <button onClick={addEntry} style={btn(C.green)}>
        ✓ Save Expense
      </button>
    </div>
  )}

  {/* ── ENTRY LIST ── */}
  <div style={{display:"flex",flexDirection:"column",gap:12}}>
    {active.length===0&&(
      <div style={{...card({textAlign:"center",color:C.border,padding:40})}}>
        No petty cash entries yet.
      </div>
    )}
    {active.map(entry=>{
      const isPaid = entry.status==="paid";
      if(!fileRefs.current[entry.id]) fileRefs.current[entry.id]=null;
      if(!camRefs.current[entry.id])  camRefs.current[entry.id]=null;
      return(
        <div key={entry.id}
          style={card({borderColor:isPaid?"#22c55e30":"#ef444430"})}>

          {/* Top row: status + amounts */}
          <div style={{display:"flex",justifyContent:"space-between",
            flexWrap:"wrap",gap:8,marginBottom:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",
                marginBottom:6,alignItems:"center"}}>
                <span style={{
                  background:isPaid?"#22c55e20":"#ef444420",
                  color:isPaid?C.green:C.red,
                  border:`1px solid ${isPaid?"#22c55e40":"#ef444440"}`,
                  borderRadius:5,padding:"3px 10px",
                  fontSize:11,fontWeight:900,letterSpacing:0.5}}>
                  {isPaid?"✓ PAID":"⚠ OWED"}
                </span>
                <span style={{fontSize:10,color:C.dim}}>{entry.date}</span>
                <span style={{fontSize:10,background:"#1e40af20",color:"#93c5fd",
                  border:"1px solid #1e40af30",borderRadius:4,padding:"1px 7px"}}>
                  {entry.category}
                </span>
                <span style={{fontSize:10,color:C.dim}}>
                  Paid by: <strong style={{color:C.text}}>{entry.paidBy}</strong>
                </span>
              </div>
              <div style={{fontSize:16,fontWeight:800,color:C.text}}>
                {entry.description}
              </div>
              {entry.vendor&&(
                <div style={{fontSize:12,color:C.dim}}>📍 {entry.vendor}</div>
              )}
              {entry.notes&&(
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{entry.notes}</div>
              )}
              {isPaid&&entry.paidDate&&(
                <div style={{fontSize:11,color:C.green,marginTop:4}}>
                  ✓ Marked paid {entry.paidDate}
                  {entry.paidBy2&&` by ${entry.paidBy2}`}
                </div>
              )}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:26,fontWeight:900,
                color:isPaid?C.green:C.red}}>
                {fmt(entry.amount)}
              </div>
            </div>
          </div>

          {/* Supporting documents section */}
          <div style={{background:C.bg,borderRadius:10,padding:14,
            border:`1px solid ${C.border}`,marginBottom:12}}>
            <div style={{fontSize:10,color:C.dim,fontWeight:800,
              letterSpacing:1,marginBottom:10}}>SUPPORTING DOCUMENTS</div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {/* Original invoice/bill (attached when expense was created) */}
              <div style={{background:C.card2,borderRadius:8,padding:10}}>
                <div style={{fontSize:10,color:C.dim,marginBottom:6,fontWeight:700}}>
                  ORIGINAL INVOICE / BILL
                </div>
                {entry.attachName?(
                  <div>
                    <div style={{fontSize:11,color:"#93c5fd",marginBottom:6}}>
                      📎 {entry.attachName}
                    </div>
                    {entry.attachUrl&&(
                      <button onClick={()=>setViewModal({url:entry.attachUrl,title:entry.description+" — Invoice"})}
                        style={{...ghost,fontSize:10,padding:"5px 10px"}}>
                        👁 View
                      </button>
                    )}
                  </div>
                ):(
                  <div style={{fontSize:11,color:C.border}}>Not attached</div>
                )}
              </div>

              {/* Payment receipt (proof Tim paid Bruce back) */}
              <div style={{background:C.card2,borderRadius:8,padding:10}}>
                <div style={{fontSize:10,color:C.dim,marginBottom:6,fontWeight:700}}>
                  PAYMENT RECEIPT / PROOF PAID
                </div>
                {entry.receiptName?(
                  <div>
                    <div style={{fontSize:11,color:"#93c5fd",marginBottom:6}}>
                      📎 {entry.receiptName}
                    </div>
                    {entry.receiptUrl&&(
                      <button onClick={()=>setViewModal({url:entry.receiptUrl,title:entry.description+" — Receipt"})}
                        style={{...ghost,fontSize:10,padding:"5px 10px"}}>
                        👁 View
                      </button>
                    )}
                  </div>
                ):(
                  <div style={{fontSize:11,color:C.border,marginBottom:6}}>
                    Not uploaded yet
                  </div>
                )}
                {/* Upload receipt — does NOT mark paid */}
                <input type="file" accept="*/*"
                  ref={el=>fileRefs.current[entry.id]=el}
                  onChange={e=>attachDoc(entry.id,e.target.files[0])}
                  style={{display:"none"}}/>
                <input type="file" accept="image/*" capture="environment"
                  ref={el=>camRefs.current[entry.id]=el}
                  onChange={e=>attachDoc(entry.id,e.target.files[0])}
                  style={{display:"none"}}/>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                  <button onClick={()=>fileRefs.current[entry.id]?.click()}
                    style={{...ghost,fontSize:10,padding:"5px 10px",
                      display:"flex",alignItems:"center",gap:4}}>
                    <span>📎</span> File
                  </button>
                  <button onClick={()=>camRefs.current[entry.id]?.click()}
                    style={{...ghost,fontSize:10,padding:"5px 10px",
                      display:"flex",alignItems:"center",gap:4}}>
                    <span>📷</span> Photo
                  </button>
                </div>
                <div style={{fontSize:9,color:C.border,marginTop:4,fontStyle:"italic"}}>
                  Uploading does NOT mark paid
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {/* MARK PAID — explicit button, either Tim or Bruce */}
            {!isPaid&&(
              <button onClick={()=>markPaid(entry.id)}
                style={{...btn(C.green),fontSize:12,padding:"9px 18px"}}>
                ✓ Mark Paid
              </button>
            )}
            {isPaid&&(
              <button onClick={()=>markUnpaid(entry.id)}
                style={{...ghost,fontSize:11}}>
                ↩ Unmark Paid
              </button>
            )}
            {/* Remove — double confirm */}
            <button onClick={()=>softDel(entry.id)}
              style={{
                background:del.id===entry.id?"#7f1d1d20":"transparent",
                color:del.id===entry.id?"#fca5a5":C.muted,
                border:`1px solid ${del.id===entry.id?"#ef444450":C.border}`,
                borderRadius:7,padding:"7px 12px",cursor:"pointer",
                fontFamily:"inherit",fontSize:11,fontWeight:700}}>
              {del.id===entry.id?"⚠️ Confirm Remove":"🗑 Remove"}
            </button>
            {del.id===entry.id&&(
              <button onClick={()=>setDel({id:null,step:0})} style={ghost}>
                Cancel
              </button>
            )}
          </div>
        </div>
      );
    })}
  </div>

  {/* View doc modal */}
  {viewModal&&(
    <div onClick={()=>setViewModal(null)}
      style={{position:"fixed",inset:0,background:"#000d",
        display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
      <div onClick={e=>e.stopPropagation()}
        style={card({maxWidth:640,width:"90%",maxHeight:"90vh",overflowY:"auto"})}>
        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:800,color:"#93c5fd"}}>
            {viewModal.title}
          </div>
          <button onClick={()=>setViewModal(null)}
            style={{background:"none",border:"none",
              color:C.dim,cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <img src={viewModal.url} alt="Document"
          style={{width:"100%",borderRadius:8,
            maxHeight:500,objectFit:"contain"}}/>
      </div>
    </div>
  )}
</div>
```

);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUEL LOG
// ─────────────────────────────────────────────────────────────────────────────
function FuelLog({user,trucks,setPage}){
const [entries,setEntries]=useState([]);
const [showAdd,setShowAdd]=useState(false);
const [nf,setNf]=useState({date:today(),state:“IL”,gallons:””,ppg:””,location:””,notes:””});
const STATES=[“AL”,“AK”,“AZ”,“AR”,“CA”,“CO”,“CT”,“DE”,“FL”,“GA”,“HI”,“ID”,“IL”,“IN”,“IA”,“KS”,“KY”,“LA”,“ME”,“MD”,“MA”,“MI”,“MN”,“MS”,“MO”,“MT”,“NE”,“NV”,“NH”,“NJ”,“NM”,“NY”,“NC”,“ND”,“OH”,“OK”,“OR”,“PA”,“RI”,“SC”,“SD”,“TN”,“TX”,“UT”,“VT”,“VA”,“WA”,“WV”,“WI”,“WY”];
const add=()=>{setEntries([…entries,{id:`f-${Date.now()}`,…nf,gallons:parseFloat(nf.gallons),ppg:parseFloat(nf.ppg),total:parseFloat(nf.gallons)*parseFloat(nf.ppg)}]);setShowAdd(false);};
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20,flexWrap:“wrap”,gap:8}}>
<div>
<div style={{fontSize:22,fontWeight:900,color:”#fff”}}>⛽ Fuel Log</div>
<a href="https://www.nastc.com/fuel-network/" target="_blank" rel="noreferrer"
style={{fontSize:11,color:C.accent}}>NASTC Fuel Network ↗</a>
</div>
<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>{showAdd?“✕ Cancel”:”+ Log Fuel”}</button>
</div>
{showAdd&&(
<div style={card({marginBottom:18,borderColor:C.accent})}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
<div><span style={lbl}>DATE</span><input type=“date” value={nf.date} onChange={e=>setNf({…nf,date:e.target.value})} style={inp}/></div>
<div><span style={lbl}>STATE (IFTA)</span><select value={nf.state} onChange={e=>setNf({…nf,state:e.target.value})} style={inp}>{STATES.map(s=><option key={s}>{s}</option>)}</select></div>
<div><span style={lbl}>GALLONS</span><input type=“number” value={nf.gallons} onChange={e=>setNf({…nf,gallons:e.target.value})} style={inp}/></div>
<div><span style={lbl}>PRICE/GAL ($)</span><input type=“number” value={nf.ppg} onChange={e=>setNf({…nf,ppg:e.target.value})} style={inp}/></div>
<div><span style={lbl}>LOCATION / TRUCK STOP</span><input value={nf.location} onChange={e=>setNf({…nf,location:e.target.value})} style={inp}/></div>
<div><span style={lbl}>NOTES</span><input value={nf.notes} onChange={e=>setNf({…nf,notes:e.target.value})} style={inp}/></div>
</div>
{nf.gallons&&nf.ppg&&<div style={{marginTop:10,fontSize:13,color:C.accent,fontWeight:700}}>Total: {fmt(parseFloat(nf.gallons)*parseFloat(nf.ppg))}</div>}
<button onClick={add} style={{...btn(),marginTop:12}}>✓ Save</button>
</div>
)}
<div style={{…card({textAlign:“center”,color:C.border,marginBottom:14})}}>
FleetOne fuel card integration — connect in Admin → Integrations to auto-import transactions.
</div>
{entries.map(e=>(
<div key={e.id} style={card({marginBottom:10})}>
<div style={{display:“flex”,justifyContent:“space-between”}}>
<div><div style={{fontSize:14,fontWeight:800,color:C.text}}>{e.state} — {e.gallons} gal @ ${e.ppg}/gal</div><div style={{fontSize:11,color:C.dim}}>{e.date}{e.location?` · ${e.location}`:””}</div></div>
<div style={{fontSize:18,fontWeight:900,color:C.accent}}>{fmt(e.total)}</div>
</div>
</div>
))}
</div>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUCK PROFILE
// ─────────────────────────────────────────────────────────────────────────────
function TruckProfile({user,trucks,setTrucks,setPage}){
const myT=trucks.find(t=>t.driverId===user.id)||trucks[0];
const [form,setForm]=useState({…myT});
const [saved,setSaved]=useState(false);
const save=()=>{setTrucks(trucks.map(t=>t.id===form.id?{…form}:t));setSaved(true);setTimeout(()=>setSaved(false),2000);};
const F=({l,k,type=“text”})=><div><span style={lbl}>{l}</span><input type={type} value={form[k]||””} onChange={e=>setForm({…form,[k]:e.target.value})} style={inp}/></div>;
return(
<div style={{maxWidth:720}}>
<div style={{fontSize:22,fontWeight:900,color:”#fff”,marginBottom:20}}>🚛 My Truck</div>
<div style={card()}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:14}}>
<F l="MAKE" k="make"/><F l="MODEL" k="model"/>
<F l="YEAR" k="year" type="number"/><F l="COLOR" k="color"/>
<F l="UNIT #" k="unit"/><F l="VIN" k="vin"/>
<F l="LICENSE PLATE" k="plate"/><F l="STATE REG" k="state"/>
<F l="MILEAGE" k="mileage" type="number"/><F l="ELD PROVIDER" k="eld"/>
</div>
<button onClick={save} style={{...btn(),marginTop:18}}>
{saved?“✓ Saved!”:“Save Truck”}
</button>
</div>
</div>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAILERS
// ─────────────────────────────────────────────────────────────────────────────
function Trailers({user,trailers,setTrailers,isCarrier,setPage}){
const [showAdd,setShowAdd]=useState(false);
const [nt,setNt]=useState({unit:””,make:””,year:””,vin:””,plate:””,type:“Dry Van”,notes:””});
const add=()=>{setTrailers([…trailers,{id:`tr-${Date.now()}`,…nt,deleted:false}]);setNt({unit:””,make:””,year:””,vin:””,plate:””,type:“Dry Van”,notes:””});setShowAdd(false);};
const active=trailers.filter(t=>!t.deleted);
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20,flexWrap:“wrap”,gap:8}}>
<div style={{fontSize:22,fontWeight:900,color:”#fff”}}>🔲 Trailers</div>
{isCarrier&&<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>{showAdd?“✕ Cancel”:”+ Add Trailer”}</button>}
</div>
{showAdd&&(
<div style={card({marginBottom:18,borderColor:C.accent})}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
{[{l:“UNIT #”,k:“unit”},{l:“MAKE”,k:“make”},{l:“YEAR”,k:“year”,type:“number”},{l:“VIN”,k:“vin”},{l:“PLATE”,k:“plate”},{l:“NOTES”,k:“notes”}].map(f=>(
<div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} value={nt[f.k]} onChange={e=>setNt({…nt,[f.k]:e.target.value})} style={inp}/></div>
))}
<div><span style={lbl}>TYPE</span><select value={nt.type} onChange={e=>setNt({…nt,type:e.target.value})} style={inp}>{[“Dry Van”,“Reefer”,“Flatbed”,“Step Deck”,“Lowboy”,“Tanker”,“Other”].map(t=><option key={t}>{t}</option>)}</select></div>
</div>
<button onClick={add} style={{...btn(),marginTop:14}}>✓ Save</button>
</div>
)}
{active.length===0&&<div style={{…card({textAlign:“center”,color:C.border,padding:40})}}>No trailers yet.</div>}
{active.map(t=>(
<div key={t.id} style={card({marginBottom:10})}>
<div style={{fontSize:14,fontWeight:800,color:C.text}}>{t.unit?`${t.unit} — `:””}{t.make} {t.year}</div>
<div style={{fontSize:11,color:C.dim}}>{t.type} · VIN: {t.vin||”—”} · Plate: {t.plate||”—”}</div>
{t.notes&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>{t.notes}</div>}
</div>
))}
</div>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE RECORDS
// ─────────────────────────────────────────────────────────────────────────────
function Service({user,serviceRecords=[],setServiceRecords,trucks,isCarrier,setPage}){
const [showAdd,setShowAdd]=useState(false);
const [nr,setNr]=useState({date:today(),truckId:trucks[0]?.id||””,type:“Oil Change”,vendor:””,cost:””,mileage:””,notes:””,nextDueDate:””,nextDueMileage:””});
const add=()=>{setServiceRecords([…serviceRecords,{id:`svc-${Date.now()}`,…nr,cost:parseFloat(nr.cost)||0,deleted:false}]);setShowAdd(false);};
const SVCS=[“Oil Change”,“Tire Rotation”,“Brake Service”,“PM Inspection”,“DOT Inspection”,“Alignment”,“Engine Repair”,“Transmission”,“Electrical”,“Other”];
const active=(serviceRecords||[]).filter(r=>!r.deleted&&(isCarrier||trucks.find(t=>t.id===r.truckId)?.driverId===user.id));
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20,flexWrap:“wrap”,gap:8}}>
<div style={{fontSize:22,fontWeight:900,color:”#fff”}}>🔧 Service Records</div>
<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>{showAdd?“✕ Cancel”:”+ Add Record”}</button>
</div>
{showAdd&&(
<div style={card({marginBottom:18,borderColor:C.accent})}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
<div><span style={lbl}>TRUCK</span><select value={nr.truckId} onChange={e=>setNr({…nr,truckId:e.target.value})} style={inp}>{trucks.map(t=><option key={t.id} value={t.id}>{t.unit||t.make} {t.model}</option>)}</select></div>
<div><span style={lbl}>TYPE</span><select value={nr.type} onChange={e=>setNr({…nr,type:e.target.value})} style={inp}>{SVCS.map(s=><option key={s}>{s}</option>)}</select></div>
{[{l:“DATE”,k:“date”,type:“date”},{l:“VENDOR”,k:“vendor”},{l:“COST ($)”,k:“cost”,type:“number”},{l:“MILEAGE”,k:“mileage”,type:“number”},{l:“NEXT DUE DATE”,k:“nextDueDate”,type:“date”},{l:“NEXT DUE MILES”,k:“nextDueMileage”,type:“number”},{l:“NOTES”,k:“notes”}].map(f=>(
<div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} value={nr[f.k]} onChange={e=>setNr({…nr,[f.k]:e.target.value})} style={inp}/></div>
))}
</div>
<button onClick={add} style={{...btn(),marginTop:14}}>✓ Save</button>
</div>
)}
{active.length===0&&<div style={{…card({textAlign:“center”,color:C.border,padding:40})}}>No service records.</div>}
{active.map(rec=>{
const truck=trucks.find(t=>t.id===rec.truckId);
return(
<div key={rec.id} style={card({marginBottom:10})}>
<div style={{display:“flex”,justifyContent:“space-between”}}>
<div>
<div style={{fontSize:14,fontWeight:800,color:C.text}}>{rec.type}</div>
<div style={{fontSize:11,color:C.dim}}>{truck?.unit||truck?.make} · {rec.date} · {rec.vendor}</div>
{rec.notes&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{rec.notes}</div>}
</div>
<div style={{textAlign:“right”}}>
<div style={{fontSize:16,fontWeight:800,color:C.text}}>{fmt(rec.cost)}</div>
{rec.nextDueDate&&<div style={{fontSize:10,color:C.yellow}}>Next: {rec.nextDueDate}</div>}
</div>
</div>
</div>
);
})}
</div>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────
function Docs({user,documents=[],setDocuments,isCarrier,setPage}){
const [showAdd,setShowAdd]=useState(false);
const [nd,setNd]=useState({name:””,type:“CDL”,expiry:””,notes:””});
const add=()=>{setDocuments([…documents,{id:`doc-${Date.now()}`,…nd,uploadDate:today(),driverId:user.id,deleted:false}]);setShowAdd(false);};
const DTYPES=[“CDL”,“Medical Examiner Certificate”,“Form 2290 (HVUT)”,“IFTA License”,“Operating Authority”,“COI (Insurance)”,“W-9”,“Annual Inspection Report”,“Plate Registration”,“Other”];
const active=(documents||[]).filter(d=>!d.deleted&&(isCarrier||d.driverId===user.id));
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20,flexWrap:“wrap”,gap:8}}>
<div style={{fontSize:22,fontWeight:900,color:”#fff”}}>📄 Documents</div>
<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>{showAdd?“✕ Cancel”:”+ Add Document”}</button>
</div>
{showAdd&&(
<div style={card({marginBottom:18,borderColor:C.accent})}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
<div><span style={lbl}>TYPE</span><select value={nd.type} onChange={e=>setNd({…nd,type:e.target.value})} style={inp}>{DTYPES.map(d=><option key={d}>{d}</option>)}</select></div>
<div><span style={lbl}>NAME</span><input value={nd.name} onChange={e=>setNd({…nd,name:e.target.value})} style={inp}/></div>
<div><span style={lbl}>EXPIRY DATE</span><input type=“date” value={nd.expiry} onChange={e=>setNd({…nd,expiry:e.target.value})} style={inp}/></div>
<div><span style={lbl}>NOTES</span><input value={nd.notes} onChange={e=>setNd({…nd,notes:e.target.value})} style={inp}/></div>
</div>
<button onClick={add} style={{...btn(),marginTop:14}}>✓ Save</button>
</div>
)}
{active.length===0&&<div style={{…card({textAlign:“center”,color:C.border,padding:40})}}>No documents yet.</div>}
{active.map(doc=>{
const expiring=doc.expiry&&new Date(doc.expiry)<new Date(Date.now()+30*86400000);
return(
<div key={doc.id} style={card({marginBottom:10,borderColor:expiring?”#f59e0b40”:C.border})}>
<div style={{display:“flex”,justifyContent:“space-between”}}>
<div>
<div style={{fontSize:14,fontWeight:800,color:C.text}}>{doc.name||doc.type}</div>
<div style={{fontSize:11,color:C.dim}}>{doc.type} · Added: {doc.uploadDate}</div>
{doc.notes&&<div style={{fontSize:11,color:C.muted}}>{doc.notes}</div>}
</div>
{doc.expiry&&<div style={{textAlign:“right”}}>
<div style={{fontSize:11,color:expiring?C.yellow:C.dim}}>Expires: {doc.expiry}</div>
{expiring&&<div style={{fontSize:10,color:C.yellow}}>⚠ Expiring soon</div>}
</div>}
</div>
</div>
);
})}
</div>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────────────────────
function Reports({user,loads,petty,serviceRecords=[],users,isCarrier,setPage}){
const [dFilter,setDFilter]=useState(“all”);
const my=isCarrier
?(dFilter===“all”?loads:loads.filter(l=>l.driverId===dFilter)).filter(l=>!l.deleted)
:loads.filter(l=>!l.deleted&&l.driverId===user.id);
const gross=my.reduce((s,l)=>s+l.grossRate,0);
const {carrierCut,driverNet}=my.reduce((s,l)=>{const c=calcLoad(l,users);return{carrierCut:s.carrierCut+c.carrierCut,driverNet:s.driverNet+c.driverNet};},{carrierCut:0,driverNet:0});
const collected=my.filter(l=>l.stage===“paid”).reduce((s,l)=>s+(l.paidAmount||l.grossRate),0);
const os=my.filter(l=>l.stage===“invoiced”).reduce((s,l)=>s+l.grossRate,0);
const pcOwed=petty.filter(p=>!p.deleted&&p.status===“unpaid”).reduce((s,p)=>s+p.amount,0);
const svc=(serviceRecords||[]).filter(r=>!r.deleted).reduce((s,r)=>s+(r.cost||0),0);
return(
<div>
<div style={{fontSize:22,fontWeight:900,color:”#fff”,marginBottom:20}}>📊 Reports</div>
{isCarrier&&(
<div style={{marginBottom:16}}>
<span style={lbl}>Filter by Driver</span>
<select value={dFilter} onChange={e=>setDFilter(e.target.value)} style={{…inp,width:“auto”}}>
<option value="all">All Drivers</option>
{users.filter(u=>!u.deleted).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
</select>
</div>
)}
<div style={{display:“grid”,gridTemplateColumns:“repeat(3,1fr)”,gap:14,marginBottom:20}}>
{[{l:“GROSS REVENUE”,v:fmt(gross),c:C.accent},
…(isCarrier?[{l:“CARRIER CUT”,v:fmt(carrierCut),c:”#a78bfa”}]:[]),
{l:“DRIVER NET”,v:fmt(driverNet),c:C.green},
{l:“COLLECTED”,v:fmt(collected),c:C.green},
{l:“OUTSTANDING”,v:fmt(os),c:C.yellow},
{l:“TOTAL LOADS”,v:my.length,c:C.accent},
{l:“PETTY CASH OWED”,v:fmt(pcOwed),c:C.red},
{l:“MAINTENANCE”,v:fmt(svc),c:”#f87171”},
{l:“LOADS PAID”,v:my.filter(l=>l.stage===“paid”).length,c:C.green}]
.map(s=>(
<div key={s.l} style={card()}>
<div style={{fontSize:9,color:C.dim,letterSpacing:1.5,marginBottom:4}}>{s.l}</div>
<div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
</div>
))}
</div>
{isCarrier&&(
<div style={card()}>
<div style={{fontSize:10,color:C.accent,fontWeight:900,letterSpacing:1.5,marginBottom:14}}>PER-DRIVER BREAKDOWN</div>
{users.filter(u=>!u.deleted).map(drv=>{
const dl=loads.filter(l=>!l.deleted&&l.driverId===drv.id);
const dg=dl.reduce((s,l)=>s+l.grossRate,0);
const dc=dl.reduce((s,l)=>s+calcLoad(l,users).carrierCut,0);
const dn=dl.reduce((s,l)=>s+calcLoad(l,users).driverNet,0);
return(
<div key={drv.id} style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,padding:“12px 0”,borderBottom:`1px solid ${C.border}`}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:C.text}}>{drv.name}</div>
<div style={{fontSize:11,color:C.dim}}>{dl.length} loads · {drv.commissionPct}% commission</div>
</div>
<div style={{display:“flex”,gap:24,textAlign:“right”}}>
{[{l:“GROSS”,v:fmt(dg),c:C.accent},{l:“CARRIER CUT”,v:fmt(dc),c:”#a78bfa”},{l:“DRIVER NET”,v:fmt(dn),c:C.green}].map(x=>(
<div key={x.l}><div style={{fontSize:9,color:C.dim}}>{x.l}</div><div style={{fontSize:14,fontWeight:800,color:x.c}}>{x.v}</div></div>
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

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────
function Profile({user,users,setUsers,setPage}){
const [form,setForm]=useState({…user});
const [saved,setSaved]=useState(false);
const save=()=>{setUsers(users.map(u=>u.id===user.id?{…u,…form}:u));setSaved(true);setTimeout(()=>setSaved(false),2000);};
const F=({l,k,type=“text”})=><div><span style={lbl}>{l}</span><input type={type} value={form[k]||””} onChange={e=>setForm({…form,[k]:e.target.value})} style={inp}/></div>;
return(
<div style={{maxWidth:680}}>
<div style={{fontSize:22,fontWeight:900,color:”#fff”,marginBottom:20}}>👤 My Profile</div>
<div style={card()}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:14}}>
<F l="FULL NAME" k="name"/><F l="EMAIL" k="email" type="email"/>
<F l="PHONE" k="phone"/><F l="ADDRESS" k="address"/>
<F l="CDL NUMBER" k="cdl"/><F l="CDL EXPIRY" k="cdlExpiry" type="date"/>
<F l="MED CARD EXPIRY" k="medExpiry" type="date"/>
<F l="EMERGENCY CONTACT" k="emergencyContact"/>
<F l="EMERGENCY PHONE" k="emergencyPhone"/>
</div>
<button onClick={save} style={{...btn(),marginTop:18}}>{saved?“✓ Saved!”:“Save Profile”}</button>
</div>
</div>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
function Admin({user,users,setUsers,trucks,setTrucks,setPage}){
const [showAdd,setShowAdd]=useState(false);
const [nu,setNu]=useState({name:””,email:””,phone:””,password:“ettr2024”,role:ROLES.DRIVER,carrierRole:“Driver”,commissionPct:20});
const add=()=>{if(!nu.name||!nu.email)return;setUsers([…users,{id:`usr-${Date.now()}`,…nu,truckId:null,cdl:””,cdlExpiry:””,medExpiry:””,deleted:false}]);setShowAdd(false);};
return(
<div>
<div style={{fontSize:22,fontWeight:900,color:”#fff”,marginBottom:20}}>🛡️ Carrier Admin</div>
<div style={card({marginBottom:16})}>
<div style={{fontSize:10,color:C.accent,fontWeight:900,letterSpacing:1.5,marginBottom:14}}>USERS & DRIVERS</div>
{users.filter(u=>!u.deleted).map(u=>(
<div key={u.id} style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,padding:“10px 0”,borderBottom:`1px solid ${C.border}`}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:C.text}}>{u.name}</div>
<div style={{fontSize:11,color:C.dim}}>{u.email} · {u.carrierRole} · {u.commissionPct}% commission</div>
</div>
<span style={{fontSize:10,background:”#1e40af20”,color:”#93c5fd”,border:“1px solid #1e40af30”,borderRadius:4,padding:“2px 8px”}}>{u.role}</span>
</div>
))}
<button onClick={()=>setShowAdd(!showAdd)} style={{…btn(),marginTop:16}}>{showAdd?“✕ Cancel”:”+ Add Driver”}</button>
{showAdd&&(
<div style={{marginTop:16,display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
{[{l:“NAME”,k:“name”},{l:“EMAIL”,k:“email”,type:“email”},{l:“PHONE”,k:“phone”},{l:“PASSWORD”,k:“password”},{l:“CARRIER ROLE”,k:“carrierRole”}].map(f=>(
<div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} value={nu[f.k]||””} onChange={e=>setNu({…nu,[f.k]:e.target.value})} style={inp}/></div>
))}
<div><span style={lbl}>COMMISSION %</span><input type=“number” min=“0” max=“50” value={nu.commissionPct} onChange={e=>setNu({…nu,commissionPct:parseFloat(e.target.value)||0})} style={inp}/></div>
<button onClick={add} style={{…btn(),marginTop:10,gridColumn:“span 2”}}>✓ Save Driver</button>
</div>
)}
</div>
<div style={card()}>
<div style={{fontSize:10,color:C.accent,fontWeight:900,letterSpacing:1.5,marginBottom:10}}>INTEGRATIONS</div>
{[{n:“FleetOne / WEX Fuel Card”,d:“Auto-import fuel transactions for IFTA reporting”,s:“Not Connected”},
{n:“Zoho Mail API”,d:“Send carrier invoices directly from the app”,s:“Not Connected”},
{n:“BlueInk Tech ELD”,d:“Driver HOS log integration”,s:“Active”}]
.map(i=>(
<div key={i.n} style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,background:C.bg,borderRadius:8,padding:“12px 14px”,marginBottom:8}}>
<div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{i.n}</div><div style={{fontSize:11,color:C.dim}}>{i.d}</div></div>
<span style={{fontSize:10,background:i.s===“Active”?”#22c55e20”:C.card2,color:i.s===“Active”?C.green:C.dim,border:`1px solid ${i.s==="Active"?"#22c55e40":C.border}`,borderRadius:4,padding:“2px 10px”,fontWeight:700}}>{i.s}</span>
</div>
))}
</div>
</div>
);
}
