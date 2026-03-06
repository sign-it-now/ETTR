import { useState, useRef } from “react”;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ROLES = { DEVELOPER:“developer”, CARRIER_ADMIN:“carrier_admin”, DRIVER:“driver” };

const LOAD_STAGES = [
{ key:“rate_con_requested”, label:“Rate Con Requested”, icon:“📋”, actor:“both”,    confirmLabel:“Upload & Submit Rate Con”,      nextLabel:“Submit Rate Con”        },
{ key:“rate_con_accepted”,  label:“Rate Con Accepted”,  icon:“✅”, actor:“both”,    confirmLabel:“Accept Rate Confirmation”,       nextLabel:“Accept Rate Con”        },
{ key:“dispatched”,         label:“Dispatched”,         icon:“📡”, actor:“carrier”, confirmLabel:“Dispatch to Driver”,             nextLabel:“Dispatch”               },
{ key:“driver_accepted”,    label:“Driver Accepted”,    icon:“🤝”, actor:“driver”,  confirmLabel:“I Accept This Load”,             nextLabel:“Accept Dispatch”        },
{ key:“at_pickup”,          label:“At Pickup / Loading”,icon:“🏭”, actor:“driver”,  confirmLabel:“Confirm Arrived at Shipper”,     nextLabel:“I’m at Pickup”          },
{ key:“in_transit”,         label:“In Transit”,         icon:“🚛”, actor:“driver”,  confirmLabel:“Confirm Load Picked Up”,         nextLabel:“Load Picked Up”         },
{ key:“delivered”,          label:“Delivered”,          icon:“📦”, actor:“driver”,  confirmLabel:“Confirm Delivery Complete”,      nextLabel:“Mark Delivered”         },
{ key:“billing”,            label:“Billing”,            icon:“🧾”, actor:“both”,    confirmLabel:“Submit Billing Package”,         nextLabel:“Submit for Billing”     },
{ key:“invoiced”,           label:“Invoiced”,           icon:“📤”, actor:“carrier”, confirmLabel:“Mark Invoice Sent to Broker”,   nextLabel:“Mark Invoiced”          },
{ key:“paid”,               label:“Paid”,               icon:“💰”, actor:“carrier”, confirmLabel:“Record Payment Received”,       nextLabel:“Mark Paid”              },
];

const STAGE_KEYS = LOAD_STAGES.map(s=>s.key);

const STAGE_COLORS = {
rate_con_requested:”#3b82f6”, rate_con_accepted:”#06b6d4”, dispatched:”#8b5cf6”,
driver_accepted:”#a78bfa”,   at_pickup:”#f59e0b”,          in_transit:”#f97316”,
delivered:”#84cc16”,         billing:”#ec4899”,             invoiced:”#f43f5e”,
paid:”#22c55e”,
};

const DOC_SLOTS = [
{ key:“rateCon”,      label:“Rate Confirmation (Original)”, stages:[“rate_con_requested”,“rate_con_accepted”] },
{ key:“rateConSigned”,label:“Rate Con — Signed / Accepted”, stages:[“rate_con_accepted”,“dispatched”]        },
{ key:“bolUnsigned”,  label:“BOL — Unsigned (at Pickup)”,   stages:[“at_pickup”,“in_transit”]               },
{ key:“bolSigned”,    label:“BOL — Signed (Proof of PU)”,   stages:[“in_transit”,“delivered”]               },
{ key:“pod”,          label:“POD — Proof of Delivery”,      stages:[“delivered”,“billing”]                  },
{ key:“lumper”,       label:“Lumper / Unload Receipt”,      stages:[“delivered”,“billing”]                  },
{ key:“invoice”,      label:“ETTR Invoice (Generated)”,     stages:[“billing”,“invoiced”]                   },
];

const BROKERS_PRESET = [
“CNA Transportation”,“Echo Global Logistics”,“Coyote Logistics”,
“CH Robinson”,“Landstar”,“TQL”,“Convoy”,“Worldwide Express”,
];

const PETTY_CATS = [“Repairs & Maintenance”,“Fuel”,“Tires”,“Permits & Fees”,“Supplies”,“Lodging”,“Meals”,“Other”];

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_USERS = [
{ id:“tim_smith”, name:“Tim Smith”, email:“tim@ettr.com”, phone:“618-974-8695”,
password:“ettr2024”, role:ROLES.DEVELOPER, carrierRole:“Lease Operator / Owner-Operator”,
cdl:””, cdlState:“IL”, cdlExpiry:””, medCardExpiry:””, truckId:“pete_777”,
commissionPct:20, deleted:false },
{ id:“bruce_edgerton”, name:“Bruce Edgerton”, email:“bruce@ettr.com”, phone:“715-509-0114”,
password:“ettr2024”, role:ROLES.CARRIER_ADMIN, carrierRole:“Carrier / Owner-Operator”,
cdl:””, cdlState:“WI”, cdlExpiry:””, medCardExpiry:””, truckId:“kw_bruce”,
commissionPct:0, deleted:false },
];

const SEED_TRUCKS = [
{ id:“pete_777”, driverId:“tim_smith”, make:“Peterbilt”, model:“579”, year:2013,
color:“White”, unit:”#777”, vin:“1XP-BDP9X-3-ED234685”, mileage:996058.7,
licensePlate:””, stateReg:“IL”, eldProvider:“BlueInk Tech”,
tires:{brand:””,size:””,frontTread:””,rearTread:””,lastReplaced:””},
brakes:{type:“Air Drum”,brand:””,lastInspected:””,lastReplaced:””},
reefer:{hasReefer:false}, notes:”” },
{ id:“kw_bruce”, driverId:“bruce_edgerton”, make:“Kenworth”, model:“T680”, year:null,
color:“Blue”, unit:””, vin:””, mileage:0, licensePlate:””, stateReg:“WI”, eldProvider:””,
tires:{brand:””,size:””,frontTread:””,rearTread:””,lastReplaced:””},
brakes:{type:“Air Drum”,brand:””,lastInspected:””,lastReplaced:””},
reefer:{hasReefer:false}, notes:”” },
];

const SEED_PETTY = [
{ id:“pc_mike001”,
description:“Mike\u2019s Inc \u2013 Truck #777 Major Repair (Invoice #097919)”,
vendor:“Mike\u2019s Inc \u2013 South Roxana, IL”, amount:15477.45,
date:“2026-01-30”, category:“Repairs & Maintenance”, paidBy:“Bruce”,
status:“unpaid”, receiptUrl:null, receiptName:null, paidDate:null,
notes:“DOT inspection, kingpins, radiator, air springs, shocks, torque rods, trans cooler, exhaust bellow, power steering res, wheel seals, brake shoes/drums. Unit now passes DOT.”,
deleted:false },
];

const SEED_LOADS = [
{ id:“load-seed-001”, driverId:“tim_smith”,
broker:“CNA Transportation”, brokerCustom:””,
brokerContact:“dispatch@cnatrans.com”,
loadNumber:“CNA-2026-0041”,
origin:“Chicago, IL”, destination:“Memphis, TN”, commodity:“General Freight”,
pickupDate:“2026-02-10”, deliveryDate:“2026-02-11”,
grossRate:2400, stage:“paid”,
comcheck:{number:“CC-88821”,amount:300,dateIssued:“2026-02-10”,issuedTo:“tim_smith”},
docs:{
rateCon:{name:“RateCon_CNA0041.pdf”,url:null},
rateConSigned:{name:“RateCon_accepted.pdf”,url:null},
bolUnsigned:{name:null,url:null},
bolSigned:{name:“BOL_signed.jpg”,url:null},
pod:{name:“POD_CNA0041.jpg”,url:null},
lumper:{name:null,url:null},
invoice:{name:“ETTR_Invoice_001.pdf”,url:null},
},
lumperAmount:0, palletAmount:0, detentionAmount:0, expenses:[],
stageHistory:{ rate_con_requested:“2026-02-09”, rate_con_accepted:“2026-02-09”,
dispatched:“2026-02-09”, driver_accepted:“2026-02-09”, at_pickup:“2026-02-10”,
in_transit:“2026-02-10”, delivered:“2026-02-11”, billing:“2026-02-12”,
invoiced:“2026-02-12”, paid:“2026-02-19” },
paidAmount:2100, notes:“First load of the year.”, deleted:false },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = n => Number(n||0).toLocaleString(“en-US”,{style:“currency”,currency:“USD”});
const today = () => new Date().toISOString().split(“T”)[0];
const stageIdx = key => STAGE_KEYS.indexOf(key);
const brokerDisplay = load => (load.brokerCustom&&load.brokerCustom.trim()) ? load.brokerCustom : load.broker;

const calcLoad = (load, users) => {
const driver = users.find(u=>u.id===load.driverId);
const commPct = driver ? driver.commissionPct : 0;
const carrierCut = (load.grossRate*commPct)/100;
const driverNet = load.grossRate - carrierCut;
const comcheckAmt = load.comcheck ? Number(load.comcheck.amount) : 0;
const invoiceTotal = load.grossRate - comcheckAmt;
const totalExpenses = (load.expenses||[]).reduce((s,e)=>s+Number(e.amount),0);
const driverProfit = driverNet - totalExpenses - Number(load.lumperAmount||0) - Number(load.palletAmount||0) - Number(load.detentionAmount||0);
return {commPct,carrierCut,driverNet,comcheckAmt,invoiceTotal,totalExpenses,driverProfit};
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const card = (x={}) => ({background:”#1e293b”,border:“1px solid #334155”,borderRadius:12,padding:20,…x});
const lbl = {fontSize:10,color:”#64748b”,letterSpacing:1.5,marginBottom:4,display:“block”};
const inp = {width:“100%”,background:”#0f172a”,border:“1px solid #334155”,borderRadius:8,padding:“9px 12px”,color:”#e2e8f0”,fontFamily:“inherit”,fontSize:13,boxSizing:“border-box”};
const btn = (bg=”#1e40af”,col=”#fff”,x={}) => ({background:bg,color:col,border:“none”,borderRadius:8,padding:“9px 18px”,cursor:“pointer”,fontFamily:“inherit”,fontWeight:800,fontSize:12,…x});
const ghost = {background:“none”,border:“1px solid #334155”,color:”#64748b”,borderRadius:8,padding:“9px 14px”,cursor:“pointer”,fontFamily:“inherit”,fontSize:12};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function ETTRApp() {
const [currentUser,setCurrentUser] = useState(null);
const [page,setPage] = useState(“dashboard”);
const [collapsed,setCollapsed] = useState(false);
const [users,setUsers] = useState(SEED_USERS);
const [trucks,setTrucks] = useState(SEED_TRUCKS);
const [trailers,setTrailers] = useState([]);
const [serviceRecords,setServiceRecords] = useState([]);
const [documents,setDocuments] = useState([]);
const [pettyCash,setPettyCash] = useState(SEED_PETTY);
const [loads,setLoads] = useState(SEED_LOADS);

if(!currentUser) return <Login users={users} onLogin={u=>{setCurrentUser(u);setPage(“dashboard”);}}/>;

const live = users.find(u=>u.id===currentUser.id)||currentUser;
const isCarrier = live.role===ROLES.CARRIER_ADMIN||live.role===ROLES.DEVELOPER;
const sw = collapsed ? 60 : 220;

const pp = {currentUser:live,users,setUsers,trucks,setTrucks,trailers,setTrailers,
serviceRecords,setServiceRecords,documents,setDocuments,pettyCash,setPettyCash,
loads,setLoads,isCarrier};

const NAV=[
{k:“dashboard”,i:“🏠”,l:“Dashboard”},
{k:“loads”,i:“📦”,l:“Loads”},
{k:“petty_cash”,i:“💵”,l:“Petty Cash”},
{k:“fuel”,i:“⛽”,l:“Fuel Log”},
{k:“truck”,i:“🚛”,l:“My Truck”},
{k:“trailers”,i:“🔲”,l:“Trailers”},
{k:“service”,i:“🔧”,l:“Service”},
{k:“documents”,i:“📄”,l:“Documents”},
{k:“reports”,i:“📊”,l:“Reports”},
{k:“profile”,i:“👤”,l:“Profile”},
…(isCarrier?[{k:“admin”,i:“🛡️”,l:“Admin”}]:[]),
];

const render=()=>{
switch(page){
case”dashboard”:  return <Dashboard {…pp} setPage={setPage}/>;
case”loads”:      return <LoadsModule {…pp}/>;
case”petty_cash”: return <PettyCash {…pp}/>;
case”fuel”:       return <FuelLog {…pp}/>;
case”truck”:      return <TruckProfile {…pp}/>;
case”trailers”:   return <Trailers {…pp}/>;
case”service”:    return <ServiceRecs {…pp}/>;
case”documents”:  return <DocsModule {…pp}/>;
case”reports”:    return <Reports {…pp}/>;
case”profile”:    return <Profile {…pp}/>;
case”admin”:      return isCarrier?<Admin {…pp}/>:<Dashboard {…pp} setPage={setPage}/>;
default:          return <Dashboard {…pp} setPage={setPage}/>;
}
};

return(
<div style={{minHeight:“100vh”,background:”#0a0f1e”,color:”#e2e8f0”,fontFamily:”‘Courier New’,monospace”,display:“flex”}}>
<div style={{width:sw,background:”#0f172a”,borderRight:“1px solid #1e293b”,display:“flex”,flexDirection:“column”,flexShrink:0,transition:“width 0.2s”}}>
<div style={{padding:“16px 14px”,borderBottom:“1px solid #1e293b”,display:“flex”,alignItems:“center”,justifyContent:“space-between”}}>
{!collapsed&&<div><div style={{fontSize:14,fontWeight:900,color:”#60a5fa”}}>ETTR</div><div style={{fontSize:8,color:”#334155”,letterSpacing:1}}>DOT 1978980</div></div>}
<button onClick={()=>setCollapsed(!collapsed)} style={{background:“none”,border:“none”,color:”#475569”,cursor:“pointer”,fontSize:18}}>☰</button>
</div>
{!collapsed&&<div style={{padding:“10px 14px”,borderBottom:“1px solid #1e293b”}}>
<div style={{fontSize:11,fontWeight:800,color:”#f1f5f9”}}>{live.name}</div>
<div style={{fontSize:10,color:”#475569”}}>{live.carrierRole}</div>
</div>}
<nav style={{flex:1,paddingTop:8}}>
{NAV.map(n=>(
<button key={n.k} onClick={()=>setPage(n.k)} style={{width:“100%”,textAlign:“left”,padding:collapsed?“11px 18px”:“10px 16px”,border:“none”,cursor:“pointer”,fontFamily:“inherit”,fontSize:11,fontWeight:700,display:“flex”,alignItems:“center”,gap:10,
background:page===n.k?”#1e293b”:“transparent”,color:page===n.k?”#60a5fa”:”#475569”,
borderLeft:page===n.k?“3px solid #3b82f6”:“3px solid transparent”}}>
<span>{n.i}</span>{!collapsed&&n.l}
</button>
))}
</nav>
<button onClick={()=>setCurrentUser(null)} style={{margin:12,background:”#1e293b”,border:“1px solid #334155”,color:”#475569”,borderRadius:8,padding:10,cursor:“pointer”,fontFamily:“inherit”,fontSize:11,display:“flex”,alignItems:“center”,gap:8,justifyContent:collapsed?“center”:“flex-start”}}>
🚪{!collapsed&&” Sign Out”}
</button>
</div>
<main style={{flex:1,padding:24,overflowY:“auto”}}><div style={{maxWidth:1100}}>{render()}</div></main>
</div>
);
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({users,onLogin}){
const[email,setEmail]=useState(””);const[pw,setPw]=useState(””);const[show,setShow]=useState(false);const[err,setErr]=useState(””);
const go=()=>{const u=users.find(x=>!x.deleted&&x.email===email.trim()&&x.password===pw);u?onLogin(u):setErr(“Invalid email or password.”);};
return(
<div style={{minHeight:“100vh”,background:”#0a0f1e”,display:“flex”,alignItems:“center”,justifyContent:“center”,fontFamily:”‘Courier New’,monospace”}}>
<div style={card({width:360,borderColor:”#1e40af”})}>
<div style={{textAlign:“center”,marginBottom:28}}><div style={{fontSize:36,marginBottom:4}}>🚛</div><div style={{fontSize:20,fontWeight:900,color:”#fff”,letterSpacing:1}}>ETTR FLEET</div><div style={{fontSize:10,color:”#60a5fa”,letterSpacing:2}}>EDGERTON TRUCK & TRAILER REPAIR</div><div style={{fontSize:9,color:”#334155”,marginTop:2}}>DOT 1978980 · MC#699644 · Bonduel, WI</div></div>
<span style={lbl}>EMAIL</span><input type=“email” value={email} onChange={e=>setEmail(e.target.value)} style={{…inp,marginBottom:12}} placeholder=“you@ettr.com”/>
<div style={{position:“relative”,marginBottom:16}}><span style={lbl}>PASSWORD</span><input type={show?“text”:“password”} value={pw} onChange={e=>setPw(e.target.value)} style={inp} onKeyDown={e=>e.key===“Enter”&&go()}/><button onClick={()=>setShow(!show)} style={{position:“absolute”,right:10,top:28,background:“none”,border:“none”,color:”#475569”,cursor:“pointer”}}>{show?“🙈”:“👁”}</button></div>
{err&&<div style={{color:”#ef4444”,fontSize:12,marginBottom:10}}>{err}</div>}
<button onClick={go} style={{…btn(),width:“100%”,padding:“11px”,fontSize:13}}>SIGN IN</button>
<div style={{marginTop:12,fontSize:10,color:”#334155”,textAlign:“center”}}>tim@ettr.com or bruce@ettr.com · pw: ettr2024</div>
</div>
</div>
);
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({currentUser,loads,pettyCash,users,isCarrier,setPage}){
const my=isCarrier?loads.filter(l=>!l.deleted):loads.filter(l=>!l.deleted&&l.driverId===currentUser.id);
const gross=my.reduce((s,l)=>s+l.grossRate,0);
const outstanding=my.filter(l=>l.stage===“invoiced”).reduce((s,l)=>s+l.grossRate,0);
const pcOwed=pettyCash.filter(p=>!p.deleted&&p.status===“unpaid”).reduce((s,p)=>s+p.amount,0);
const needsAction=my.filter(l=>l.stage===“dispatched”&&l.driverId===currentUser.id);
const open=my.filter(l=>l.stage!==“paid”);
return(
<div>
<div style={{marginBottom:24}}><div style={{fontSize:22,fontWeight:900,color:”#fff”}}>Welcome, {currentUser.name.split(” “)[0]}</div><div style={{fontSize:11,color:”#475569”}}>ETTR Fleet · {new Date().toLocaleDateString()}</div></div>
{needsAction.length>0&&(
<div style={{…card({borderColor:”#f59e0b40”,background:”#78350f10”,marginBottom:20})}}>
<div style={{fontSize:12,color:”#fbbf24”,fontWeight:800,marginBottom:8}}>⚡ ACTION REQUIRED — LOADS AWAITING YOUR ACCEPTANCE</div>
{needsAction.map(l=><div key={l.id} style={{fontSize:13,color:”#f1f5f9”,marginBottom:4}}>📦 {brokerDisplay(l)} · {l.origin} → {l.destination} · {fmt(l.grossRate)}</div>)}
<button onClick={()=>setPage(“loads”)} style={{…btn(”#f59e0b”,”#000”),marginTop:10}}>→ VIEW & ACCEPT</button>
</div>
)}
<div style={{display:“grid”,gridTemplateColumns:“repeat(4,1fr)”,gap:14,marginBottom:28}}>
{[{l:“GROSS REVENUE”,v:fmt(gross),c:”#60a5fa”,sub:`${my.length} loads`},{l:“OPEN LOADS”,v:open.length,c:”#f59e0b”,sub:“In progress”},{l:“OUTSTANDING”,v:fmt(outstanding),c:”#ec4899”,sub:“Invoiced/unpaid”},{l:“PETTY CASH OWED”,v:fmt(pcOwed),c:”#ef4444”,sub:“To Bruce”}]
.map(c=><div key={c.l} onClick={()=>setPage(c.l===“PETTY CASH OWED”?“petty_cash”:“loads”)} style={{…card({cursor:“pointer”,borderColor:`${c.c}30`})}}>
<div style={{fontSize:9,color:”#64748b”,letterSpacing:1.5,marginBottom:6}}>{c.l}</div>
<div style={{fontSize:22,fontWeight:900,color:c.c}}>{c.v}</div>
<div style={{fontSize:11,color:”#475569”,marginTop:2}}>{c.sub}</div>
</div>)}
</div>
<div style={card()}>
<div style={{fontSize:12,color:”#60a5fa”,fontWeight:800,letterSpacing:1,marginBottom:14}}>RECENT LOADS</div>
{my.slice(0,5).map(load=>{
const st=LOAD_STAGES.find(s=>s.key===load.stage)||LOAD_STAGES[0];
const sc=STAGE_COLORS[load.stage]||”#64748b”;
const driver=users.find(u=>u.id===load.driverId);
return(
<div key={load.id} onClick={()=>setPage(“loads”)} style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,padding:“10px 0”,borderBottom:“1px solid #1e293b”,cursor:“pointer”}}>
<div>
<div style={{display:“flex”,alignItems:“center”,gap:8,marginBottom:3}}>
<span style={{background:`${sc}20`,color:sc,border:`1px solid ${sc}40`,borderRadius:4,padding:“1px 8px”,fontSize:10,fontWeight:800}}>{st.icon} {st.label}</span>
</div>
<div style={{fontSize:13,fontWeight:700,color:”#f1f5f9”}}>{load.origin} → {load.destination}</div>
<div style={{fontSize:11,color:”#475569”}}>{brokerDisplay(load)} · {driver?.name}</div>
</div>
<div style={{textAlign:“right”}}><div style={{fontSize:16,fontWeight:800,color:”#f1f5f9”}}>{fmt(load.grossRate)}</div></div>
</div>
);
})}
{my.length===0&&<div style={{color:”#334155”,fontSize:12}}>No loads yet. Go to Loads to create your first load.</div>}
</div>
</div>
);
}

// ─── LOADS MODULE — MASTER CONTROLLER ─────────────────────────────────────────
function LoadsModule({currentUser,users,setUsers,loads,setLoads,trucks,isCarrier}){
const[view,setView]=useState(“list”);
const[sel,setSel]=useState(null);
const[filterStage,setFilterStage]=useState(“all”);
const[delConfirm,setDelConfirm]=useState({id:null,step:0});
const fileRefs=useRef({});

const visible=loads.filter(l=>{
if(l.deleted)return false;
if(!isCarrier&&l.driverId!==currentUser.id)return false;
if(filterStage!==“all”&&l.stage!==filterStage)return false;
return true;
});

const updateLoad=(id,changes)=>{
const updated=loads.map(l=>l.id===id?{…l,…changes}:l);
setLoads(updated);
if(sel?.id===id)setSel(updated.find(l=>l.id===id));
};

const advanceStage=(id,targetStage)=>{
const load=loads.find(l=>l.id===id);
if(!load)return;
const next=targetStage||STAGE_KEYS[stageIdx(load.stage)+1];
const history={…load.stageHistory,[next]:today()};
updateLoad(id,{stage:next,stageHistory:history});
};

const uploadDoc=(lid,docKey,file)=>{
if(!file)return;
const url=URL.createObjectURL(file);
const load=loads.find(l=>l.id===lid);
if(!load)return;
updateLoad(lid,{docs:{…load.docs,[docKey]:{name:file.name,url}}});
};

const softDelete=(id)=>{
if(delConfirm.id===id&&delConfirm.step===1){setLoads(loads.map(l=>l.id===id?{…l,deleted:true}:l));setDelConfirm({id:null,step:0});setView(“list”);setSel(null);}
else setDelConfirm({id,step:1});
};

// Summary strip
const all=loads.filter(l=>!l.deleted);
const totalGross=all.reduce((s,l)=>s+l.grossRate,0);
const totalCut=all.reduce((s,l)=>s+calcLoad(l,users).carrierCut,0);
const totalCollected=all.filter(l=>l.stage===“paid”).reduce((s,l)=>s+(l.paidAmount||l.grossRate),0);
const totalOS=all.filter(l=>l.stage===“invoiced”).reduce((s,l)=>s+l.grossRate,0);

if(view===“new”) return <NewLoad users={users} currentUser={currentUser} isCarrier={isCarrier} onSave={load=>{setLoads([load,…loads]);setView(“list”);}} onCancel={()=>setView(“list”)}/>;
if(view===“detail”&&sel) return <LoadDetail load={sel} users={users} currentUser={currentUser} isCarrier={isCarrier} onUpdate={updateLoad} onAdvance={advanceStage} onDelete={softDelete} delConfirm={delConfirm} setDelConfirm={setDelConfirm} uploadDoc={uploadDoc} fileRefs={fileRefs} onBack={()=>setView(“list”)}/>;
if(view===“commSettings”&&isCarrier) return <CommissionSettings users={users} setUsers={setUsers} onBack={()=>setView(“list”)}/>;
if(view===“masterInvoice”&&isCarrier) return <MasterInvoiceList loads={loads} users={users} onBack={()=>setView(“list”)} onOpen={load=>{setSel(load);setView(“detail”);}}/>;

return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:16,flexWrap:“wrap”,gap:10}}>
<div><div style={{fontSize:20,fontWeight:900,color:”#fff”}}>{isCarrier?“All Loads — ETTR”:` My Loads — ${currentUser.name}`}</div><div style={{fontSize:11,color:”#475569”}}>{visible.length} load(s)</div></div>
<div style={{display:“flex”,gap:8,flexWrap:“wrap”}}>
<button onClick={()=>setView(“new”)} style={btn()}>+ NEW LOAD</button>
{isCarrier&&<button onClick={()=>setView(“commSettings”)} style={btn(”#334155”,”#94a3b8”)}>⚙️ Commission</button>}
{isCarrier&&<button onClick={()=>setView(“masterInvoice”)} style={btn(”#7c3aed”,”#fff”)}>📋 Invoice List</button>}
</div>
</div>

```
  {isCarrier&&(
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
      {[{l:"TOTAL GROSS",v:fmt(totalGross),c:"#60a5fa"},{l:"CARRIER CUT",v:fmt(totalCut),c:"#a78bfa"},{l:"COLLECTED",v:fmt(totalCollected),c:"#22c55e"},{l:"OUTSTANDING",v:fmt(totalOS),c:"#f59e0b"}]
        .map(c=><div key={c.l} style={card()}><div style={{fontSize:9,color:"#64748b",letterSpacing:1.5,marginBottom:4}}>{c.l}</div><div style={{fontSize:18,fontWeight:900,color:c.c}}>{c.v}</div></div>)}
    </div>
  )}

  <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
    <button onClick={()=>setFilterStage("all")} style={{...btn(filterStage==="all"?"#1e40af":"#1e293b","#fff"),padding:"5px 12px",fontSize:11}}>All</button>
    {LOAD_STAGES.map(s=><button key={s.key} onClick={()=>setFilterStage(s.key)} style={{padding:"5px 10px",borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700,background:filterStage===s.key?(STAGE_COLORS[s.key]||"#1e40af"):"#1e293b",color:"#fff"}}>{s.icon} {s.short}</button>)}
  </div>

  <div style={{display:"flex",flexDirection:"column",gap:10}}>
    {visible.length===0&&<div style={{...card(),textAlign:"center",color:"#334155",padding:50}}>No loads. Click + NEW LOAD to create your first load.</div>}
    {visible.map(load=>{
      const driver=users.find(u=>u.id===load.driverId);
      const {commPct,carrierCut,driverNet}=calcLoad(load,users);
      const sc=STAGE_COLORS[load.stage]||"#64748b";
      const st=LOAD_STAGES.find(s=>s.key===load.stage);
      const sidx=stageIdx(load.stage);
      return(
        <div key={load.id} onClick={()=>{setSel(load);setView("detail");}} style={{...card({borderColor:`${sc}40`,cursor:"pointer"})}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
            <div style={{flex:1}}>
              {/* Stage progress dots */}
              <div style={{display:"flex",gap:3,marginBottom:8,flexWrap:"wrap"}}>
                {LOAD_STAGES.map((s,i)=>(
                  <div key={s.key} title={s.label} style={{width:8,height:8,borderRadius:"50%",background:i<=sidx?(STAGE_COLORS[s.key]||"#64748b"):"#1e293b",border:`1px solid ${i<=sidx?(STAGE_COLORS[s.key]||"#64748b"):"#334155"}`}}/>
                ))}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                <span style={{background:`${sc}20`,color:sc,border:`1px solid ${sc}50`,borderRadius:5,padding:"2px 9px",fontSize:10,fontWeight:800}}>{st?.icon} {st?.label}</span>
                <span style={{fontSize:11,color:"#475569"}}>{load.loadNumber}</span>
                <span style={{fontSize:11,color:"#475569"}}>{brokerDisplay(load)}</span>
                {load.comcheck&&<span style={{fontSize:10,background:"#78350f20",color:"#fbbf24",border:"1px solid #78350f50",borderRadius:4,padding:"1px 7px"}}>⛽ COMCHECK</span>}
              </div>
              <div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>{load.origin} → {load.destination}</div>
              <div style={{fontSize:11,color:"#475569"}}>{driver?.name} · PU: {load.pickupDate} · DEL: {load.deliveryDate}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:22,fontWeight:900,color:"#f1f5f9"}}>{fmt(load.grossRate)}</div>
              <div style={{fontSize:11,color:"#a78bfa"}}>Carrier: {fmt(carrierCut)} ({commPct}%)</div>
              <div style={{fontSize:11,color:"#22c55e"}}>Driver net: {fmt(driverNet)}</div>
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

// ─── NEW LOAD FORM ────────────────────────────────────────────────────────────
function NewLoad({users,currentUser,isCarrier,onSave,onCancel}){
const drivers=users.filter(u=>!u.deleted);
const[form,setForm]=useState({
driverId:isCarrier?“tim_smith”:currentUser.id,
broker:“CNA Transportation”,brokerCustom:””,brokerContact:””,
loadNumber:””,origin:””,destination:””,commodity:“General Freight”,
pickupDate:””,deliveryDate:””,grossRate:””,
hasComcheck:false,ccNum:””,ccAmt:””,ccDate:today(),
lumperAmount:0,palletAmount:0,detentionAmount:0,notes:””
});
const[err,setErr]=useState(””);
const fileRef=useRef(null);
const[rateConPreview,setRateConPreview]=useState(null);
const[rateConName,setRateConName]=useState(null);

const handleRateCon=(file)=>{
if(!file)return;
setRateConName(file.name);
if(file.type.startsWith(“image/”)){setRateConPreview(URL.createObjectURL(file));}
else setRateConPreview(null);
};

const handle=()=>{
if(!form.loadNumber||!form.grossRate||!form.origin||!form.destination){setErr(“Load #, rate, origin, destination required.”);return;}
const load={
id:`load-${Date.now()}`,driverId:form.driverId,
broker:form.broker,brokerCustom:form.brokerCustom,brokerContact:form.brokerContact,
loadNumber:form.loadNumber,origin:form.origin,destination:form.destination,
commodity:form.commodity,pickupDate:form.pickupDate,deliveryDate:form.deliveryDate,
grossRate:parseFloat(form.grossRate),stage:“rate_con_requested”,
comcheck:form.hasComcheck?{number:form.ccNum,amount:parseFloat(form.ccAmt)||0,dateIssued:form.ccDate,issuedTo:form.driverId}:null,
docs:{
rateCon:{name:rateConName,url:rateConPreview},
rateConSigned:{name:null,url:null},bolUnsigned:{name:null,url:null},
bolSigned:{name:null,url:null},pod:{name:null,url:null},
lumper:{name:null,url:null},invoice:{name:null,url:null},
},
expenses:[],lumperAmount:parseFloat(form.lumperAmount)||0,
palletAmount:parseFloat(form.palletAmount)||0,
detentionAmount:parseFloat(form.detentionAmount)||0,
stageHistory:{rate_con_requested:today()},
paidAmount:null,notes:form.notes,deleted:false
};
onSave(load);
};

const F=({l,k,type=“text”,ph})=><div><span style={lbl}>{l}</span><input type={type} placeholder={ph} value={form[k]||””} onChange={e=>setForm({…form,[k]:e.target.value})} style={inp}/></div>;

const isCustomBroker=form.broker===“Custom (type below)”;

return(
<div style={{maxWidth:700}}>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”}}>+ New Load</div>
<button onClick={onCancel} style={ghost}>← Back</button>
</div>
{err&&<div style={{background:”#7f1d1d20”,border:“1px solid #ef444440”,borderRadius:8,padding:“10px 14px”,color:”#fca5a5”,fontSize:12,marginBottom:14}}>{err}</div>}

```
  {/* Rate Con Upload — first thing */}
  <div style={{...card({marginBottom:16,borderColor:"#3b82f640"})}}>
    <div style={{fontSize:10,color:"#3b82f6",fontWeight:800,letterSpacing:1.5,marginBottom:10}}>📋 STEP 1 — UPLOAD RATE CONFIRMATION (optional but recommended)</div>
    <div style={{fontSize:11,color:"#475569",marginBottom:12}}>Upload a photo or file of the rate con to auto-start the process. You can still fill in details manually below.</div>
    <input type="file" accept="image/*,application/pdf" capture="environment" ref={fileRef} onChange={e=>handleRateCon(e.target.files[0])} style={{display:"none"}}/>
    <button onClick={()=>fileRef.current?.click()} style={{...btn("#334155","#93c5fd"),border:"1px solid #1e40af"}}>📷 Upload / Photo Rate Con</button>
    {rateConName&&<div style={{fontSize:12,color:"#22c55e",marginTop:8}}>✓ {rateConName}</div>}
    {rateConPreview&&<img src={rateConPreview} alt="Rate Con Preview" style={{marginTop:10,width:"100%",maxHeight:200,objectFit:"contain",borderRadius:8,border:"1px solid #334155"}}/>}
  </div>

  <div style={card()}>
    <div style={{fontSize:10,color:"#60a5fa",fontWeight:800,letterSpacing:1.5,marginBottom:14}}>📝 STEP 2 — LOAD DETAILS</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      {isCarrier&&<div><span style={lbl}>DRIVER</span><select value={form.driverId} onChange={e=>setForm({...form,driverId:e.target.value})} style={inp}>{drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>}
      <div>
        <span style={lbl}>BROKER</span>
        <select value={form.broker} onChange={e=>setForm({...form,broker:e.target.value})} style={inp}>
          {BROKERS_PRESET.map(b=><option key={b}>{b}</option>)}
          <option value="Custom (type below)">Custom (type below)</option>
        </select>
      </div>
      {isCustomBroker&&<div><span style={lbl}>BROKER NAME (custom)</span><input value={form.brokerCustom||""} onChange={e=>setForm({...form,brokerCustom:e.target.value})} style={inp} placeholder="Enter broker name"/></div>}
      <F l="LOAD / REFERENCE #" k="loadNumber" ph="Load number from rate con"/>
      <F l="BROKER BILLING EMAIL" k="brokerContact" type="email" ph="billing@broker.com"/>
      <F l="PICKUP LOCATION (City, State)" k="origin" ph="Mars Hill, ME"/>
      <F l="DELIVERY LOCATION (City, State)" k="destination" ph="South Plainfield, NJ"/>
      <F l="COMMODITY" k="commodity" ph="General Freight"/>
      <F l="PICKUP DATE" k="pickupDate" type="date"/>
      <F l="DELIVERY DATE" k="deliveryDate" type="date"/>
      <F l="GROSS RATE — Rate Confirmation ($)" k="grossRate" type="number" ph="0.00"/>
      <F l="NOTES" k="notes" ph="Optional"/>
    </div>

    {/* ComCheck */}
    <div style={{marginTop:16,background:"#0f172a",borderRadius:10,padding:14,border:"1px solid #334155"}}>
      <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:form.hasComcheck?12:0}}>
        <input type="checkbox" checked={form.hasComcheck} onChange={e=>setForm({...form,hasComcheck:e.target.checked})}/>
        <span style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>⛽ ComCheck / Fuel Advance on This Load</span>
      </label>
      {form.hasComcheck&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        <div><span style={lbl}>COMCHECK #</span><input value={form.ccNum||""} onChange={e=>setForm({...form,ccNum:e.target.value})} style={{...inp,color:"#fbbf24",border:"1px solid #78350f80"}} placeholder="CC-XXXXX"/></div>
        <div><span style={lbl}>AMOUNT ($)</span><input type="number" value={form.ccAmt||""} onChange={e=>setForm({...form,ccAmt:e.target.value})} style={{...inp,color:"#fbbf24",border:"1px solid #78350f80"}}/></div>
        <div><span style={lbl}>DATE ISSUED</span><input type="date" value={form.ccDate} onChange={e=>setForm({...form,ccDate:e.target.value})} style={{...inp,color:"#fbbf24",border:"1px solid #78350f80"}}/></div>
      </div>}
    </div>

    <div style={{display:"flex",gap:10,marginTop:18}}>
      <button onClick={handle} style={btn()}>✓ CREATE LOAD</button>
      <button onClick={onCancel} style={ghost}>Cancel</button>
    </div>
  </div>
</div>
```

);
}

// ─── LOAD DETAIL — 10-STAGE PIPELINE ─────────────────────────────────────────
function LoadDetail({load,users,currentUser,isCarrier,onUpdate,onAdvance,onDelete,delConfirm,setDelConfirm,uploadDoc,fileRefs,onBack}){
const[showInvoice,setShowInvoice]=useState(false);
const[showPay,setShowPay]=useState(false);
const[payAmt,setPayAmt]=useState(load.paidAmount||load.grossRate||””);
const[newExp,setNewExp]=useState({desc:””,amount:””});
const[showEmailOptions,setShowEmailOptions]=useState(false);

const driver=users.find(u=>u.id===load.driverId);
const{commPct,carrierCut,driverNet,comcheckAmt,invoiceTotal,totalExpenses,driverProfit}=calcLoad(load,users);
const sc=STAGE_COLORS[load.stage]||”#64748b”;
const currentStage=LOAD_STAGES.find(s=>s.key===load.stage);
const sidx=stageIdx(load.stage);
const canAct=(isCarrier)||(currentStage?.actor===“driver”&&load.driverId===currentUser.id)||(currentStage?.actor===“both”);
const isLastStage=sidx===STAGE_KEYS.length-1;

const set=(f,v)=>onUpdate(load.id,{[f]:v});
const setCC=(f,v)=>onUpdate(load.id,{comcheck:{…(load.comcheck||{}),[f]:v}});

const addExp=()=>{if(!newExp.desc||!newExp.amount)return;onUpdate(load.id,{expenses:[…(load.expenses||[]),{id:Date.now(),desc:newExp.desc,amount:parseFloat(newExp.amount)}]});setNewExp({desc:””,amount:””});};

const handleAdvance=()=>{
if(load.stage===“invoiced”){setShowPay(true);return;}
if(load.stage===“billing”){setShowInvoice(true);return;}
onAdvance(load.id);
};

const confirmPaid=()=>{onUpdate(load.id,{stage:“paid”,paidAmount:parseFloat(payAmt),stageHistory:{…load.stageHistory,paid:today()}});setShowPay(false);};

// Email package helper
const openEmail=(type)=>{
const broker=brokerDisplay(load);
const subject=`ETTR Invoice — Load ${load.loadNumber} — ${load.origin} to ${load.destination}`;
const body=`Please find attached our invoice for Load #${load.loadNumber}.\n\nPickup: ${load.origin}\nDelivery: ${load.destination}\nDelivery Date: ${load.deliveryDate}\nAmount Due: ${fmt(load.grossRate)}\n\nThank you,\nBruce Edgerton\nEdgerton Truck & Trailer Repair\n715-509-0114`;
const email=load.brokerContact||””;
const mailto=`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
if(type===“gmail”) window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
else if(type===“zoho”) window.open(`https://mail.zoho.com/zm/#compose?to=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}`);
else window.open(mailto);
onUpdate(load.id,{stage:“invoiced”,stageHistory:{…load.stageHistory,invoiced:today()}});
setShowEmailOptions(false);
};

const Sec=({title,children})=><div style={{...card({marginBottom:14})}}><div style={{fontSize:10,color:”#60a5fa”,fontWeight:800,letterSpacing:1.5,marginBottom:14}}>{title}</div>{children}</div>;
const Fld=({l,value,editable,onChange,type=“text”})=><div style={{marginBottom:10}}><span style={lbl}>{l}</span>{editable?<input type={type} value={value||””} onChange={e=>onChange(e.target.value)} style={inp}/>:<div style={{fontSize:13,color:”#f1f5f9”,fontWeight:600}}>{value||”—”}</div>}</div>;
const FR=({l,value,color,big})=><div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:8}}><span style={{fontSize:big?12:11,color:”#64748b”}}>{l}</span><span style={{fontSize:big?18:14,fontWeight:big?900:700,color}}>{value}</span></div>;

return(
<div>
{showInvoice&&<ETTRInvoice load={load} driver={driver} users={users} onClose={()=>{setShowInvoice(false);}} onSend={()=>{setShowEmailOptions(true);setShowInvoice(false);}} onMarkInvoiced={()=>{onUpdate(load.id,{stage:“invoiced”,stageHistory:{…load.stageHistory,invoiced:today()}});setShowInvoice(false);}}/>}

```
  <button onClick={onBack} style={{...ghost,marginBottom:16}}>← Back to Loads</button>

  {/* Stage status bar */}
  <div style={{background:`${sc}15`,border:`1px solid ${sc}40`,borderRadius:10,padding:"14px 18px",marginBottom:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontSize:16,fontWeight:900,color:sc}}>{currentStage?.icon} {currentStage?.label}</div>
        <div style={{fontSize:11,color:"#475569"}}>{load.loadNumber} · {brokerDisplay(load)}</div>
      </div>
      {/* Progress bar */}
      <div style={{display:"flex",gap:2,alignItems:"center"}}>
        {LOAD_STAGES.map((s,i)=>(
          <div key={s.key} style={{display:"flex",alignItems:"center",gap:2}}>
            <div title={s.label} style={{width:i===sidx?28:10,height:10,borderRadius:5,background:i<sidx?"#22c55e":i===sidx?(STAGE_COLORS[s.key]||"#64748b"):"#1e293b",transition:"all 0.3s",border:`1px solid ${i<=sidx?(STAGE_COLORS[s.key]||"#22c55e"):"#334155"}`}}/>
          </div>
        ))}
      </div>
    </div>

    {/* Action button for current stage */}
    {canAct&&!isLastStage&&(
      <div style={{marginTop:14}}>
        {showPay?(
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:"#94a3b8"}}>Amount received from broker:</span>
            <input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} style={{...inp,width:140,border:"1px solid #22c55e"}} placeholder="Amount"/>
            <button onClick={confirmPaid} style={btn("#22c55e")}>✓ CONFIRM PAYMENT</button>
            <button onClick={()=>setShowPay(false)} style={ghost}>Cancel</button>
          </div>
        ):showEmailOptions?(
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:12,color:"#94a3b8"}}>Send invoice via:</span>
            <button onClick={()=>openEmail("gmail")} style={btn("#ea4335")}>📧 Gmail</button>
            <button onClick={()=>openEmail("zoho")} style={btn("#e04a28")}>📧 Zoho Mail</button>
            <button onClick={()=>openEmail("default")} style={btn("#334155","#94a3b8")}>📧 Default Mail App</button>
            <button onClick={()=>setShowEmailOptions(false)} style={ghost}>Cancel</button>
          </div>
        ):(
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={handleAdvance} style={{...btn(sc),fontSize:13,padding:"10px 22px"}}>
              {currentStage?.confirmLabel} →
            </button>
            {load.stage==="rate_con_accepted"&&isCarrier&&<span style={{fontSize:11,color:"#475569",alignSelf:"center"}}>Assign driver then dispatch</span>}
          </div>
        )}
      </div>
    )}
    {load.stage==="paid"&&<div style={{marginTop:10,fontSize:13,color:"#22c55e",fontWeight:800}}>✓ LOAD COMPLETE · PAID {load.paidAt||""}</div>}
  </div>

  {/* Stage history timeline */}
  <Sec title="📅 STAGE HISTORY">
    <div style={{display:"flex",gap:0,overflowX:"auto",paddingBottom:8}}>
      {LOAD_STAGES.map((s,i)=>{
        const done=load.stageHistory?.[s.key];
        const active=load.stage===s.key;
        return(
          <div key={s.key} style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:80,opacity:done?1:0.3}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:done?(STAGE_COLORS[s.key]||"#334155"):"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,border:`2px solid ${active?sc:"#334155"}`}}>{s.icon}</div>
            {i<LOAD_STAGES.length-1&&<div style={{width:"100%",height:2,background:done?"#22c55e":"#1e293b",margin:"0 -16px"}}/>}
            <div style={{fontSize:9,color:done?"#94a3b8":"#334155",textAlign:"center",marginTop:4,letterSpacing:0.5}}>{s.short}</div>
            {done&&<div style={{fontSize:8,color:"#475569",textAlign:"center"}}>{done}</div>}
          </div>
        );
      })}
    </div>
  </Sec>

  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
    {/* Left */}
    <div>
      <Sec title="📍 LOAD DETAILS">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld l="LOAD NUMBER" value={load.loadNumber} editable={isCarrier} onChange={v=>set("loadNumber",v)}/>
          <Fld l="BROKER" value={brokerDisplay(load)}/>
          <Fld l="DRIVER" value={driver?.name}/>
          <Fld l="COMMODITY" value={load.commodity} editable onChange={v=>set("commodity",v)}/>
          <Fld l="PICKUP LOCATION" value={load.origin} editable={isCarrier} onChange={v=>set("origin",v)}/>
          <Fld l="DELIVERY LOCATION" value={load.destination} editable={isCarrier} onChange={v=>set("destination",v)}/>
          <Fld l="PICKUP DATE" value={load.pickupDate} editable type="date" onChange={v=>set("pickupDate",v)}/>
          <Fld l="DELIVERY DATE" value={load.deliveryDate} editable type="date" onChange={v=>set("deliveryDate",v)}/>
          <Fld l="BROKER BILLING EMAIL" value={load.brokerContact} editable={isCarrier} onChange={v=>set("brokerContact",v)}/>
          <Fld l="NOTES" value={load.notes} editable onChange={v=>set("notes",v)}/>
        </div>
        {isCarrier&&(
          <div style={{marginTop:10}}>
            <span style={lbl}>ASSIGN DRIVER</span>
            <select value={load.driverId} onChange={e=>set("driverId",e.target.value)} style={inp}>
              {users.filter(u=>!u.deleted).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}
      </Sec>

      {/* ComCheck */}
      <Sec title="⛽ COMCHECK / FUEL ADVANCE">
        {load.comcheck?(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld l="COMCHECK #" value={load.comcheck.number} editable onChange={v=>setCC("number",v)}/>
            <Fld l="AMOUNT ($)" value={load.comcheck.amount} editable type="number" onChange={v=>setCC("amount",parseFloat(v))}/>
            <Fld l="DATE ISSUED" value={load.comcheck.dateIssued} editable type="date" onChange={v=>setCC("dateIssued",v)}/>
            <Fld l="ISSUED TO" value={users.find(u=>u.id===load.comcheck?.issuedTo)?.name}/>
          </div>
        ):(
          <div><div style={{color:"#475569",fontSize:12,marginBottom:10}}>No ComCheck on this load.</div>
          <button onClick={()=>set("comcheck",{number:"",amount:0,dateIssued:today(),issuedTo:load.driverId})} style={{...btn("#78350f","#fbbf24"),border:"1px solid #78350f80"}}>+ ADD COMCHECK</button></div>
        )}
      </Sec>
    </div>

    {/* Right */}
    <div>
      {/* Financial — FULLY TRANSPARENT */}
      <Sec title="💵 FINANCIAL BREAKDOWN — TRANSPARENT TO ALL">
        <FR l="GROSS RATE (Rate Confirmation)" value={fmt(load.grossRate)} color="#f1f5f9" big/>
        <FR l={`CARRIER COMMISSION — Bruce (${commPct}%)`} value={`− ${fmt(carrierCut)}`} color="#a78bfa"/>
        <FR l={`DRIVER NET — ${driver?.name}`} value={fmt(driverNet)} color="#60a5fa"/>
        {load.comcheck&&<FR l="COMCHECK ADVANCE" value={`− ${fmt(comcheckAmt)}`} color="#fbbf24"/>}
        {isCarrier&&<FR l="BROKER INVOICE TOTAL" value={fmt(invoiceTotal)} color="#ec4899"/>}
        {Number(load.palletAmount)>0&&<FR l="PALLETS" value={fmt(load.palletAmount)} color="#f87171"/>}
        {Number(load.lumperAmount)>0&&<FR l="LUMPERS" value={fmt(load.lumperAmount)} color="#f87171"/>}
        {Number(load.detentionAmount)>0&&<FR l="DETENTION" value={fmt(load.detentionAmount)} color="#f87171"/>}
        {totalExpenses>0&&<FR l="OTHER EXPENSES" value={`− ${fmt(totalExpenses)}`} color="#f87171"/>}
        <div style={{borderTop:"1px solid #334155",paddingTop:10,marginTop:6}}>
          <FR l="DRIVER ACTUAL PROFIT" value={fmt(driverProfit)} color="#22c55e" big/>
        </div>
        {load.stage==="paid"&&load.paidAmount&&(
          <div style={{marginTop:10,background:"#052e1620",border:"1px solid #22c55e30",borderRadius:8,padding:12}}>
            <span style={lbl}>PAYMENT RECEIVED</span>
            <div style={{fontSize:20,fontWeight:900,color:"#22c55e"}}>{fmt(load.paidAmount)}</div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:14}}>
          {[{l:"TRUCKING ($)",k:"grossRate"},{l:"PALLETS ($)",k:"palletAmount"},{l:"LUMPERS ($)",k:"lumperAmount"},{l:"DETENTION ($)",k:"detentionAmount"}]
            .map(f=><div key={f.k}><span style={lbl}>{f.l}</span><input type="number" value={load[f.k]||""} onChange={e=>set(f.k,parseFloat(e.target.value)||0)} style={inp}/></div>)}
        </div>
      </Sec>

      {/* Expenses */}
      <Sec title="🧾 LOAD EXPENSES">
        {(load.expenses||[]).map(exp=>(
          <div key={exp.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0f172a",borderRadius:7,padding:"8px 12px",marginBottom:6}}>
            <span style={{fontSize:12}}>{exp.desc}</span>
            <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{color:"#f87171",fontWeight:700}}>{fmt(exp.amount)}</span><button onClick={()=>onUpdate(load.id,{expenses:load.expenses.filter(e=>e.id!==exp.id)})} style={{background:"none",border:"none",color:"#475569",cursor:"pointer"}}>✕</button></div>
          </div>
        ))}
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <input placeholder="Expense description" value={newExp.desc} onChange={e=>setNewExp({...newExp,desc:e.target.value})} style={{...inp,flex:1}}/>
          <input type="number" placeholder="$" value={newExp.amount} onChange={e=>setNewExp({...newExp,amount:e.target.value})} style={{...inp,width:80}}/>
          <button onClick={addExp} style={btn()}>+ ADD</button>
        </div>
      </Sec>
    </div>
  </div>

  {/* Document Repository */}
  <Sec title="📁 DOCUMENT REPOSITORY — ALL LOAD DOCUMENTS">
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
      {DOC_SLOTS.map(slot=>{
        const doc=load.docs?.[slot.key];
        const hasDoc=doc?.name;
        return(
          <div key={slot.key} style={{background:"#0f172a",borderRadius:10,padding:14,border:`1px solid ${hasDoc?"#22c55e30":"#334155"}`}}>
            <div style={lbl}>{slot.label}</div>
            {hasDoc&&doc.url&&doc.url.startsWith("blob:")&&<img src={doc.url} alt={slot.label} style={{width:"100%",maxHeight:120,objectFit:"contain",borderRadius:6,marginBottom:8,border:"1px solid #334155"}}/>}
            {hasDoc?<div style={{fontSize:12,color:"#22c55e",marginBottom:8}}>✓ {doc.name}</div>:<div style={{fontSize:12,color:"#475569",marginBottom:8}}>Not uploaded</div>}
            <input type="file" accept="image/*,application/pdf" capture="environment"
              ref={el=>{if(!fileRefs.current[load.id])fileRefs.current[load.id]={};fileRefs.current[load.id][slot.key]=el;}}
              onChange={e=>uploadDoc(load.id,slot.key,e.target.files[0])} style={{display:"none"}}/>
            <button onClick={()=>fileRefs.current[load.id]?.[slot.key]?.click()} style={{...ghost,fontSize:11}}>
              📷 {hasDoc?"Replace":"Upload / Photo"}
            </button>
          </div>
        );
      })}
    </div>

    {/* Generate invoice button */}
    <div style={{marginTop:16,background:"#0f172a",border:"1px solid #7c3aed40",borderRadius:10,padding:14}}>
      <div style={{fontSize:10,color:"#a78bfa",fontWeight:800,letterSpacing:1.5,marginBottom:8}}>🧾 ETTR INVOICE — BILLING PACKAGE</div>
      <div style={{fontSize:11,color:"#475569",marginBottom:10}}>Generate the ETTR invoice and bundle it with BOL, POD, rate con, and receipts for broker submission.</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={()=>setShowInvoice(true)} style={btn("#7c3aed")}>🧾 GENERATE / PREVIEW INVOICE</button>
        <button onClick={()=>{window.print();}} style={btn("#334155","#94a3b8")}>🖨️ Print Package</button>
        <button onClick={()=>setShowEmailOptions(true)} style={btn("#ec4899")}>📤 Email to Broker</button>
      </div>
      {showEmailOptions&&<div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={()=>openEmail("gmail")} style={btn("#ea4335")}>Gmail</button>
        <button onClick={()=>openEmail("zoho")} style={btn("#e04a28")}>Zoho Mail</button>
        <button onClick={()=>openEmail("default")} style={btn("#334155","#94a3b8")}>Device Mail App</button>
        <button onClick={()=>setShowEmailOptions(false)} style={ghost}>✕</button>
      </div>}
    </div>
  </Sec>

  {/* Soft delete */}
  {isCarrier&&<div style={{textAlign:"right",marginTop:8}}>
    <button onClick={()=>onDelete(load.id)} style={{background:delConfirm.id===load.id?"#7f1d1d":"#1e293b",color:delConfirm.id===load.id?"#fca5a5":"#475569",border:`1px solid ${delConfirm.id===load.id?"#ef444460":"#334155"}`,borderRadius:7,padding:"7px 16px",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700}}>
      {delConfirm.id===load.id?"⚠️ CONFIRM REMOVE LOAD?":"🗑 Remove Load"}
    </button>
    {delConfirm.id===load.id&&<button onClick={()=>setDelConfirm({id:null,step:0})} style={{...ghost,marginLeft:8}}>Cancel</button>}
  </div>}
</div>
```

);
}

// ─── ETTR INVOICE GENERATOR ───────────────────────────────────────────────────
function ETTRInvoice({load,driver,users,onClose,onSend,onMarkInvoiced}){
const broker=brokerDisplay(load);
const trucking=load.grossRate||0;
const pallets=load.palletAmount||0;
const lumpers=load.lumperAmount||0;
const detention=load.detentionAmount||0;
const total=trucking+pallets+lumpers+detention;

return(
<div style={{position:“fixed”,inset:0,background:”#000000dd”,zIndex:1000,display:“flex”,alignItems:“center”,justifyContent:“center”,padding:20,overflowY:“auto”}}>
<div style={{background:”#fff”,borderRadius:12,width:“100%”,maxWidth:600,color:”#111”,fontFamily:“Georgia,serif”,padding:40}}>

```
    {/* ETTR Invoice — matches your actual doc */}
    <div style={{textAlign:"center",marginBottom:24,borderBottom:"1px solid #ccc",paddingBottom:16}}>
      <div style={{fontSize:18,fontWeight:700,letterSpacing:1}}>Edgerton Truck & Trailer Repair</div>
    </div>

    <div style={{display:"flex",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:16}}>
      <div style={{fontSize:13,lineHeight:1.8}}>
        <div>Bruce Edgerton</div>
        <div>N4202 Hill Rd</div>
        <div>Bonduel WI 54107</div>
        <div>MC#699644</div>
        <div style={{marginTop:6}}>Email: bruce.edgerton@yahoo.com</div>
        <div>Phone: 715-509-0114</div>
      </div>
      <div style={{fontSize:13,lineHeight:2}}>
        <div style={{display:"flex",gap:12}}><span style={{color:"#666"}}>Date Sent:</span><span style={{borderBottom:"1px solid #000",minWidth:120}}>{today()}</span></div>
        <div style={{display:"flex",gap:12}}><span style={{color:"#666"}}>Load#</span><span style={{borderBottom:"1px solid #000",minWidth:120}}>{load.loadNumber}</span></div>
        <div style={{display:"flex",gap:12}}><span style={{color:"#666"}}>Pick up Location:</span><span style={{borderBottom:"1px solid #000",minWidth:120}}>{load.origin}</span></div>
        <div style={{display:"flex",gap:12}}><span style={{color:"#666"}}>Delivery Location:</span><span style={{borderBottom:"1px solid #000",minWidth:120}}>{load.destination}</span></div>
        <div style={{display:"flex",gap:12}}><span style={{color:"#666"}}>Delivery Date:</span><span style={{borderBottom:"1px solid #000",minWidth:120}}>{load.deliveryDate}</span></div>
      </div>
    </div>

    <div style={{marginBottom:20}}>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,color:"#666"}}>Bill to:</span>
        <span style={{borderBottom:"1px solid #000",minWidth:200,fontSize:14,fontWeight:700,paddingLeft:4}}>{broker}</span>
      </div>
    </div>

    <div style={{marginBottom:20,fontSize:13,color:"#444"}}>Please remit payment amount for transport services</div>

    <div style={{fontSize:13,lineHeight:2.2}}>
      {[{l:"Trucking:",v:trucking},{l:"Pallets:",v:pallets},{l:"Lumpers:",v:lumpers},{l:"Detention:",v:detention}].map(r=>(
        <div key={r.l} style={{display:"flex",gap:12,alignItems:"center"}}>
          <span style={{width:100,color:"#666"}}>{r.l}</span>
          <span style={{borderBottom:"1px solid #000",minWidth:140,fontWeight:r.v?700:400}}>{r.v?fmt(r.v):""}</span>
        </div>
      ))}
      <div style={{display:"flex",gap:12,alignItems:"center",marginTop:8,borderTop:"1px solid #000",paddingTop:8}}>
        <span style={{width:100,fontWeight:700}}>Total:</span>
        <span style={{borderBottom:"2px solid #000",minWidth:140,fontWeight:900,fontSize:16}}>{fmt(total)}</span>
      </div>
    </div>

    <div style={{marginTop:32,textAlign:"right",fontFamily:"cursive",fontSize:18}}>
      <div style={{fontSize:13,fontFamily:"Georgia,serif",marginBottom:4}}>Thank You</div>
      <div>Bruce Edgerton</div>
    </div>

    {/* Attached docs note */}
    <div style={{marginTop:20,padding:12,background:"#f8f9fa",borderRadius:8,fontSize:11,color:"#666"}}>
      <div style={{fontWeight:700,marginBottom:4}}>DOCUMENTS ATTACHED TO THIS PACKAGE:</div>
      {[["Rate Confirmation",load.docs?.rateCon?.name],["Rate Con Signed",load.docs?.rateConSigned?.name],["BOL Signed",load.docs?.bolSigned?.name],["POD",load.docs?.pod?.name],["Lumper Receipt",load.docs?.lumper?.name]]
        .filter(d=>d[1]).map(d=><div key={d[0]}>✓ {d[0]}: {d[1]}</div>)}
    </div>

    <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"center",flexWrap:"wrap"}}>
      <button onClick={onSend} style={{...btn("#ec4899"),fontFamily:"'Courier New',monospace"}}>📤 Email to Broker</button>
      <button onClick={()=>{onMarkInvoiced();onClose();}} style={{...btn("#22c55e"),fontFamily:"'Courier New',monospace"}}>✓ Mark as Invoiced</button>
      <button onClick={()=>{window.print();}} style={{...btn("#334155","#94a3b8"),fontFamily:"'Courier New',monospace"}}>🖨️ Print</button>
      <button onClick={onClose} style={{...ghost,fontFamily:"'Courier New',monospace"}}>Close</button>
    </div>
  </div>
</div>
```

);
}

// ─── MASTER INVOICE LIST ──────────────────────────────────────────────────────
function MasterInvoiceList({loads,users,onBack,onOpen}){
const invoiced=loads.filter(l=>!l.deleted&&[“invoiced”,“paid”].includes(l.stage));
const totalInvoiced=invoiced.reduce((s,l)=>s+l.grossRate,0);
const totalPaid=invoiced.filter(l=>l.stage===“paid”).reduce((s,l)=>s+(l.paidAmount||l.grossRate),0);
const outstanding=invoiced.filter(l=>l.stage===“invoiced”).reduce((s,l)=>s+l.grossRate,0);
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”}}>📋 Master Invoice List</div>
<button onClick={onBack} style={ghost}>← Back</button>
</div>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr 1fr”,gap:14,marginBottom:20}}>
{[{l:“TOTAL INVOICED”,v:fmt(totalInvoiced),c:”#60a5fa”},{l:“COLLECTED / PAID”,v:fmt(totalPaid),c:”#22c55e”},{l:“OUTSTANDING”,v:fmt(outstanding),c:”#ef4444”}]
.map(c=><div key={c.l} style={card()}><div style={{fontSize:9,color:”#64748b”,letterSpacing:1.5,marginBottom:4}}>{c.l}</div><div style={{fontSize:20,fontWeight:900,color:c.c}}>{c.v}</div></div>)}
</div>
<div style={{...card(),marginBottom:8}}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr 1fr 1fr 1fr”,gap:8,fontSize:9,color:”#64748b”,letterSpacing:1.5,marginBottom:10,borderBottom:“1px solid #334155”,paddingBottom:8}}>
<span>LOAD #</span><span>BROKER</span><span>ROUTE</span><span>AMOUNT</span><span>STATUS</span>
</div>
{invoiced.length===0&&<div style={{color:”#334155”,fontSize:12,textAlign:“center”,padding:30}}>No invoiced loads yet.</div>}
{invoiced.map(load=>(
<div key={load.id} onClick={()=>onOpen(load)} style={{display:“grid”,gridTemplateColumns:“1fr 1fr 1fr 1fr 1fr”,gap:8,padding:“10px 0”,borderBottom:“1px solid #1e293b”,cursor:“pointer”,alignItems:“center”}}>
<span style={{fontSize:12,color:”#93c5fd”}}>{load.loadNumber}</span>
<span style={{fontSize:12,color:”#f1f5f9”}}>{brokerDisplay(load)}</span>
<span style={{fontSize:11,color:”#475569”}}>{load.origin.split(”,”)[0]} → {load.destination.split(”,”)[0]}</span>
<span style={{fontSize:13,fontWeight:800,color:”#f1f5f9”}}>{fmt(load.grossRate)}</span>
<span style={{fontSize:10,fontWeight:800,color:load.stage===“paid”?”#22c55e”:”#f59e0b”}}>{load.stage===“paid”?“✓ PAID”:“⏳ OUTSTANDING”}</span>
</div>
))}
</div>
</div>
);
}

// ─── COMMISSION SETTINGS ──────────────────────────────────────────────────────
function CommissionSettings({users,setUsers,onBack}){
const drivers=users.filter(u=>u.role!==ROLES.CARRIER_ADMIN&&!u.deleted);
const upd=(id,p)=>setUsers(users.map(u=>u.id===id?{…u,commissionPct:p}:u));
return(
<div style={{maxWidth:520}}>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”}}>⚙️ Commission Settings</div>
<button onClick={onBack} style={ghost}>← Back</button>
</div>
<div style={{…card({marginBottom:14}),fontSize:11,color:”#475569”}}>Both Bruce and every driver always see the full gross rate on every load. The commission is taken from the top before the driver net is calculated. Only Bruce can change these rates.</div>
{drivers.map(driver=>{
const p=driver.commissionPct||0;
return(
<div key={driver.id} style={card({marginBottom:14})}>
<div style={{fontSize:14,fontWeight:800,color:”#f1f5f9”,marginBottom:4}}>{driver.name}</div>
<div style={{fontSize:11,color:”#475569”,marginBottom:14}}>{driver.carrierRole}</div>
<div style={{display:“flex”,gap:8,flexWrap:“wrap”,marginBottom:12}}>
{[5,10,15,20].map(pp=>(
<button key={pp} onClick={()=>upd(driver.id,pp)} style={{padding:“8px 18px”,borderRadius:8,border:“none”,cursor:“pointer”,fontFamily:“inherit”,fontWeight:800,fontSize:13,background:p===pp?”#1e40af”:”#0f172a”,color:p===pp?”#fff”:”#475569”,boxShadow:p===pp?“0 0 12px #1e40af60”:“none”}}>{pp}%</button>
))}
</div>
<div style={{display:“flex”,gap:8,alignItems:“center”,marginBottom:14}}>
<span style={{fontSize:11,color:”#475569”}}>Custom %:</span>
<input type=“number” min=“0” max=“50” value={p} onChange={e=>upd(driver.id,parseFloat(e.target.value)||0)} style={{…inp,width:70}}/>
</div>
<div style={{background:”#0f172a”,borderRadius:8,padding:12}}>
<div style={{fontSize:10,color:”#475569”,letterSpacing:1.5,marginBottom:6}}>EXAMPLE — $2,000 LOAD</div>
<div style={{fontSize:13,color:”#a78bfa”}}>Bruce keeps: {fmt((2000*p)/100)}</div>
<div style={{fontSize:13,color:”#22c55e”}}>{driver.name.split(” “)[0]} nets: {fmt(2000-(2000*p)/100)}</div>
</div>
</div>
);
})}
</div>
);
}

// ─── PETTY CASH ───────────────────────────────────────────────────────────────
function PettyCash({currentUser,pettyCash,setPettyCash,isCarrier}){
const[showAdd,setShowAdd]=useState(false);
const[ne,setNe]=useState({date:today(),description:””,vendor:””,amount:””,category:“Repairs & Maintenance”,notes:””});
const[delC,setDelC]=useState({id:null,step:0});
const[rcModal,setRcModal]=useState(null);
const fRefs=useRef({});
const active=pettyCash.filter(p=>!p.deleted);
const owed=active.filter(p=>p.status===“unpaid”).reduce((s,p)=>s+p.amount,0);
const paid=active.filter(p=>p.status===“paid”).reduce((s,p)=>s+p.amount,0);
const add=()=>{if(!ne.description||!ne.amount||isNaN(parseFloat(ne.amount)))return;setPettyCash([…pettyCash,{id:`pc-${Date.now()}`,…ne,amount:parseFloat(ne.amount),paidBy:“Bruce”,status:“unpaid”,receiptUrl:null,receiptName:null,paidDate:null,deleted:false}]);setNe({date:today(),description:””,vendor:””,amount:””,category:“Repairs & Maintenance”,notes:””});setShowAdd(false);};
const markPaid=id=>setPettyCash(pettyCash.map(p=>p.id===id?{…p,status:“paid”,paidDate:today()}:p));
const markUnpaid=id=>setPettyCash(pettyCash.map(p=>p.id===id?{…p,status:“unpaid”,paidDate:null}:p));
const handleRec=(id,file)=>{if(!file)return;const url=URL.createObjectURL(file);setPettyCash(pettyCash.map(p=>p.id===id?{…p,receiptUrl:url,receiptName:file.name}:p));};
const softDel=id=>{if(delC.id===id&&delC.step===1){setPettyCash(pettyCash.map(p=>p.id===id?{…p,deleted:true}:p));setDelC({id:null,step:0});}else setDelC({id,step:1});};
return(
<div>
<div style={{fontSize:20,fontWeight:900,color:”#fff”,marginBottom:20}}>💼 Petty Cash Ledger</div>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr 1fr”,gap:14,marginBottom:24}}>
{[{l:“OWED TO BRUCE”,v:fmt(owed),c:”#ef4444”},{l:“TOTAL PAID BACK”,v:fmt(paid),c:”#22c55e”},{l:“OPEN ITEMS”,v:active.filter(p=>p.status===“unpaid”).length,c:”#f59e0b”}]
.map(c=><div key={c.l} style={card()}><div style={{fontSize:9,color:”#64748b”,letterSpacing:1.5,marginBottom:4}}>{c.l}</div><div style={{fontSize:22,fontWeight:900,color:c.c}}>{c.v}</div></div>)}
</div>
<button onClick={()=>setShowAdd(!showAdd)} style={{…btn(),marginBottom:16}}>{showAdd?“✕ Cancel”:”+ Add Expense Bruce Covered”}</button>
{showAdd&&<div style={{…card({marginBottom:18,borderColor:”#1e40af”})}}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
{[{l:“DATE”,k:“date”,type:“date”},{l:“AMOUNT ($)”,k:“amount”,type:“number”,ph:“0.00”},{l:“DESCRIPTION”,k:“description”,ph:“What was it for?”},{l:“VENDOR / WHERE”,k:“vendor”,ph:“Shop, city”}]
.map(f=><div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} placeholder={f.ph} value={ne[f.k]||””} onChange={e=>setNe({…ne,[f.k]:e.target.value})} style={inp}/></div>)}
<div><span style={lbl}>CATEGORY</span><select value={ne.category} onChange={e=>setNe({…ne,category:e.target.value})} style={inp}>{PETTY_CATS.map(c=><option key={c}>{c}</option>)}</select></div>
<div><span style={lbl}>NOTES</span><input value={ne.notes} onChange={e=>setNe({…ne,notes:e.target.value})} style={inp}/></div>
</div>
<button onClick={add} style={{…btn(”#22c55e”),marginTop:14}}>✓ Save Entry</button>
</div>}
<div style={{display:“flex”,flexDirection:“column”,gap:12}}>
{active.map(entry=>(
<div key={entry.id} style={{…card({borderColor:entry.status===“paid”?”#22c55e30”:”#ef444430”})}}>
<div style={{display:“flex”,justifyContent:“space-between”,flexWrap:“wrap”,gap:8}}>
<div style={{flex:1}}>
<div style={{display:“flex”,gap:8,flexWrap:“wrap”,marginBottom:4,alignItems:“center”}}>
<span style={{background:entry.status===“paid”?”#22c55e20”:”#ef444420”,color:entry.status===“paid”?”#22c55e”:”#ef4444”,border:`1px solid ${entry.status==="paid"?"#22c55e40":"#ef444440"}`,borderRadius:5,padding:“2px 9px”,fontSize:10,fontWeight:800}}>{entry.status===“paid”?“✓ PAID”:“OWED”}</span>
<span style={{fontSize:11,color:”#64748b”}}>{entry.date}</span>
<span style={{fontSize:10,background:”#1e40af20”,color:”#93c5fd”,border:“1px solid #1e40af30”,borderRadius:4,padding:“1px 7px”}}>{entry.category}</span>
</div>
<div style={{fontSize:15,fontWeight:800,color:”#f1f5f9”}}>{entry.description}</div>
{entry.vendor&&<div style={{fontSize:12,color:”#64748b”}}>📍 {entry.vendor}</div>}
{entry.notes&&<div style={{fontSize:11,color:”#475569”,marginTop:2}}>{entry.notes}</div>}
</div>
<div style={{textAlign:“right”}}><div style={{fontSize:24,fontWeight:900,color:entry.status===“paid”?”#22c55e”:”#ef4444”}}>{fmt(entry.amount)}</div>{entry.paidDate&&<div style={{fontSize:10,color:”#64748b”}}>Paid: {entry.paidDate}</div>}</div>
</div>
<div style={{display:“flex”,gap:8,marginTop:12,flexWrap:“wrap”,alignItems:“center”}}>
<input type=“file” accept=“image/*,application/pdf” capture=“environment” ref={el=>{fRefs.current[entry.id]=el;}} onChange={e=>handleRec(entry.id,e.target.files[0])} style={{display:“none”}}/>
<button onClick={()=>fRefs.current[entry.id]?.click()} style={ghost}>📷 {entry.receiptName?“Replace Receipt”:“Upload / Photo”}</button>
{entry.receiptUrl&&<button onClick={()=>setRcModal(entry)} style={{…ghost,color:”#93c5fd”,borderColor:”#1e40af”}}>👁 View</button>}
{isCarrier&&entry.status===“unpaid”&&<button onClick={()=>markPaid(entry.id)} style={btn(”#22c55e”)}>✓ MARK PAID</button>}
{isCarrier&&entry.status===“paid”&&<button onClick={()=>markUnpaid(entry.id)} style={ghost}>↩ Unmark</button>}
{!isCarrier&&entry.status===“unpaid”&&entry.receiptUrl&&<button onClick={()=>markPaid(entry.id)} style={btn(”#22c55e”)}>✓ Mark Paid (Receipt Attached)</button>}
<button onClick={()=>softDel(entry.id)} style={{background:delC.id===entry.id?”#7f1d1d”:“transparent”,color:delC.id===entry.id?”#fca5a5”:”#475569”,border:`1px solid ${delC.id===entry.id?"#ef444450":"#334155"}`,borderRadius:7,padding:“7px 12px”,cursor:“pointer”,fontFamily:“inherit”,fontSize:11,fontWeight:700}}>{delC.id===entry.id?“⚠️ Confirm Remove?”:“🗑 Remove”}</button>
</div>
</div>
))}
</div>
{rcModal&&<div onClick={()=>setRcModal(null)} style={{position:“fixed”,inset:0,background:”#000000cc”,display:“flex”,alignItems:“center”,justifyContent:“center”,zIndex:999}}>
<div onClick={e=>e.stopPropagation()} style={card({maxWidth:600,width:“90%”})}>
<div style={{display:“flex”,justifyContent:“space-between”,marginBottom:12}}><div style={{fontSize:12,fontWeight:800,color:”#93c5fd”}}>RECEIPT: {rcModal.description}</div><button onClick={()=>setRcModal(null)} style={{background:“none”,border:“none”,color:”#64748b”,cursor:“pointer”,fontSize:18}}>✕</button></div>
<img src={rcModal.receiptUrl} alt=“Receipt” style={{width:“100%”,borderRadius:8,maxHeight:480,objectFit:“contain”}}/>
</div>
</div>}
</div>
);
}

// ─── FUEL LOG ─────────────────────────────────────────────────────────────────
function FuelLog({currentUser,trucks}){
const[entries,setEntries]=useState([]);
const[showAdd,setShowAdd]=useState(false);
const[nf,setNf]=useState({date:today(),state:“IL”,gallons:””,ppg:””,location:””,truckId:trucks[0]?.id||””,notes:””});
const add=()=>{setEntries([…entries,{id:`fuel-${Date.now()}`,…nf,gallons:parseFloat(nf.gallons),ppg:parseFloat(nf.ppg),total:parseFloat(nf.gallons)*parseFloat(nf.ppg)}]);setShowAdd(false);};
const STATES=[“AL”,“AK”,“AZ”,“AR”,“CA”,“CO”,“CT”,“DE”,“FL”,“GA”,“HI”,“ID”,“IL”,“IN”,“IA”,“KS”,“KY”,“LA”,“ME”,“MD”,“MA”,“MI”,“MN”,“MS”,“MO”,“MT”,“NE”,“NV”,“NH”,“NJ”,“NM”,“NY”,“NC”,“ND”,“OH”,“OK”,“OR”,“PA”,“RI”,“SC”,“SD”,“TN”,“TX”,“UT”,“VT”,“VA”,“WA”,“WV”,“WI”,“WY”];
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20}}>
<div><div style={{fontSize:20,fontWeight:900,color:”#fff”}}>⛽ Fuel Log</div><a href=“https://www.nastc.com/fuel-network/” target=”_blank” rel=“noreferrer” style={{fontSize:11,color:”#60a5fa”}}>NASTC Fuel Network ↗</a></div>
<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>{showAdd?“✕ Cancel”:”+ Log Fuel”}</button>
</div>
{showAdd&&<div style={{…card({marginBottom:18,borderColor:”#1e40af”})}}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
<div><span style={lbl}>DATE</span><input type=“date” value={nf.date} onChange={e=>setNf({…nf,date:e.target.value})} style={inp}/></div>
<div><span style={lbl}>STATE (IFTA)</span><select value={nf.state} onChange={e=>setNf({…nf,state:e.target.value})} style={inp}>{STATES.map(s=><option key={s}>{s}</option>)}</select></div>
{[{l:“GALLONS”,k:“gallons”,type:“number”},{l:“PRICE/GAL ($)”,k:“ppg”,type:“number”},{l:“LOCATION / TRUCK STOP”,k:“location”},{l:“NOTES”,k:“notes”}]
.map(f=><div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} value={nf[f.k]} onChange={e=>setNf({…nf,[f.k]:e.target.value})} style={inp}/></div>)}
</div>
<div style={{marginTop:10,fontSize:13,color:”#60a5fa”,fontWeight:700}}>Total: {fmt((parseFloat(nf.gallons)||0)*(parseFloat(nf.ppg)||0))}</div>
<button onClick={add} style={{...btn(),marginTop:12}}>✓ Save Fuel Entry</button>
</div>}
<div style={{display:“flex”,flexDirection:“column”,gap:10}}>
{entries.map(e=><div key={e.id} style={card()}><div style={{display:“flex”,justifyContent:“space-between”}}><div><div style={{fontSize:14,fontWeight:800,color:”#f1f5f9”}}>{e.state} — {e.gallons} gal @ ${e.ppg}/gal</div><div style={{fontSize:11,color:”#475569”}}>{e.date} · {e.location}</div></div><div style={{fontSize:18,fontWeight:900,color:”#60a5fa”}}>{fmt(e.total)}</div></div></div>)}
{entries.length===0&&<div style={{…card(),textAlign:“center”,color:”#334155”,padding:40}}>No fuel entries yet. FleetOne/WEX API integration pending — connect credentials in Admin.</div>}
</div>
</div>
);
}

// ─── TRUCK PROFILE ────────────────────────────────────────────────────────────
function TruckProfile({currentUser,trucks,setTrucks}){
const myT=trucks.find(t=>t.driverId===currentUser.id)||trucks[0];
const[form,setForm]=useState({…myT});
const[saved,setSaved]=useState(false);
const save=()=>{setTrucks(trucks.map(t=>t.id===form.id?{…form}:t));setSaved(true);setTimeout(()=>setSaved(false),2000);};
const F=({l,k,type=“text”,nest})=><div><span style={lbl}>{l}</span><input type={type} value={nest?(form[nest]?.[k]||””):(form[k]||””)} onChange={e=>nest?setForm({…form,[nest]:{…form[nest],[k]:e.target.value}}):setForm({…form,[k]:e.target.value})} style={inp}/></div>;
return(
<div style={{maxWidth:720}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”,marginBottom:20}}>🚛 Truck — {form.unit||form.make}</div>
<div style={card()}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:14}}>
<F l="MAKE" k="make"/><F l="MODEL" k="model"/><F l="YEAR" k="year" type="number"/><F l="COLOR" k="color"/>
<F l="UNIT #" k="unit"/><F l="VIN" k="vin"/><F l="LICENSE PLATE" k="licensePlate"/><F l="STATE REG" k="stateReg"/>
<F l="MILEAGE" k="mileage" type="number"/><F l="ELD PROVIDER" k="eldProvider"/>
</div>
<div style={{marginTop:18,borderTop:“1px solid #334155”,paddingTop:14}}>
<div style={{fontSize:10,color:”#60a5fa”,letterSpacing:1.5,marginBottom:12}}>TIRES</div>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}><F l="BRAND" k="brand" nest="tires"/><F l="SIZE" k="size" nest="tires"/><F l="FRONT TREAD" k="frontTread" nest="tires"/><F l="REAR TREAD" k="rearTread" nest="tires"/></div>
</div>
<div style={{marginTop:14,borderTop:“1px solid #334155”,paddingTop:14}}>
<div style={{fontSize:10,color:”#60a5fa”,letterSpacing:1.5,marginBottom:12}}>BRAKES</div>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}><F l="TYPE" k="type" nest="brakes"/><F l="BRAND" k="brand" nest="brakes"/><F l="LAST INSPECTED" k="lastInspected" type="date" nest="brakes"/><F l="LAST REPLACED" k="lastReplaced" type="date" nest="brakes"/></div>
</div>
<button onClick={save} style={{...btn(),marginTop:18}}>{saved?“✓ Saved!”:“Save Truck”}</button>
</div>
</div>
);
}

// ─── TRAILERS ─────────────────────────────────────────────────────────────────
function Trailers({currentUser,trailers,setTrailers,isCarrier}){
const[showAdd,setShowAdd]=useState(false);
const[nt,setNt]=useState({unit:””,make:””,year:””,vin:””,plate:””,type:“Dry Van”,notes:””});
const add=()=>{setTrailers([…trailers,{id:`trailer-${Date.now()}`,…nt,deleted:false}]);setNt({unit:””,make:””,year:””,vin:””,plate:””,type:“Dry Van”,notes:””});setShowAdd(false);};
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”}}>Trailers</div>
{isCarrier&&<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>{showAdd?“✕ Cancel”:”+ Add Trailer”}</button>}
</div>
{showAdd&&<div style={{…card({marginBottom:18,borderColor:”#1e40af”})}}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
{[{l:“UNIT #”,k:“unit”},{l:“MAKE”,k:“make”},{l:“YEAR”,k:“year”,type:“number”},{l:“VIN”,k:“vin”},{l:“PLATE”,k:“plate”},{l:“NOTES”,k:“notes”}].map(f=><div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} value={nt[f.k]} onChange={e=>setNt({…nt,[f.k]:e.target.value})} style={inp}/></div>)}
<div><span style={lbl}>TYPE</span><select value={nt.type} onChange={e=>setNt({…nt,type:e.target.value})} style={inp}>{[“Dry Van”,“Reefer”,“Flatbed”,“Step Deck”,“Lowboy”,“Tanker”,“Other”].map(t=><option key={t}>{t}</option>)}</select></div>
</div>
<button onClick={add} style={{...btn(),marginTop:14}}>✓ Save Trailer</button>
</div>}
<div style={{display:“flex”,flexDirection:“column”,gap:10}}>
{trailers.filter(t=>!t.deleted).map(t=><div key={t.id} style={card()}><div style={{fontSize:14,fontWeight:800,color:”#f1f5f9”}}>{t.unit} — {t.make} {t.year}</div><div style={{fontSize:11,color:”#475569”}}>{t.type} · VIN: {t.vin||”—”} · Plate: {t.plate||”—”}</div>{t.notes&&<div style={{fontSize:11,color:”#475569”,marginTop:4}}>{t.notes}</div>}</div>)}
{trailers.filter(t=>!t.deleted).length===0&&<div style={{…card(),textAlign:“center”,color:”#334155”,padding:40}}>No trailers added yet.</div>}
</div>
</div>
);
}

// ─── SERVICE RECORDS ──────────────────────────────────────────────────────────
function ServiceRecs({currentUser,serviceRecords,setServiceRecords,trucks,isCarrier}){
const[showAdd,setShowAdd]=useState(false);
const[nr,setNr]=useState({date:today(),truckId:trucks[0]?.id||””,type:“Oil Change”,vendor:””,cost:””,mileage:””,notes:””,nextDueDate:””,nextDueMileage:””});
const add=()=>{setServiceRecords([…serviceRecords,{id:`svc-${Date.now()}`,…nr,cost:parseFloat(nr.cost)||0,deleted:false}]);setShowAdd(false);};
const SVC=[“Oil Change”,“Tire Rotation”,“Brake Service”,“PM Inspection”,“DOT Inspection”,“Alignment”,“Engine Repair”,“Transmission”,“Electrical”,“Other”];
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”}}>🔧 Service Records</div>
<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>{showAdd?“✕ Cancel”:”+ Add Record”}</button>
</div>
{showAdd&&<div style={{…card({marginBottom:18,borderColor:”#1e40af”})}}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
<div><span style={lbl}>TRUCK</span><select value={nr.truckId} onChange={e=>setNr({…nr,truckId:e.target.value})} style={inp}>{trucks.map(t=><option key={t.id} value={t.id}>{t.unit||t.make} {t.model}</option>)}</select></div>
<div><span style={lbl}>TYPE</span><select value={nr.type} onChange={e=>setNr({…nr,type:e.target.value})} style={inp}>{SVC.map(s=><option key={s}>{s}</option>)}</select></div>
{[{l:“DATE”,k:“date”,type:“date”},{l:“VENDOR”,k:“vendor”},{l:“COST ($)”,k:“cost”,type:“number”},{l:“MILEAGE”,k:“mileage”,type:“number”},{l:“NEXT DUE DATE”,k:“nextDueDate”,type:“date”},{l:“NEXT DUE MILEAGE”,k:“nextDueMileage”,type:“number”}].map(f=><div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} value={nr[f.k]} onChange={e=>setNr({…nr,[f.k]:e.target.value})} style={inp}/></div>)}
<div style={{gridColumn:“span 2”}}><span style={lbl}>NOTES</span><input value={nr.notes} onChange={e=>setNr({…nr,notes:e.target.value})} style={inp}/></div>
</div>
<button onClick={add} style={{...btn(),marginTop:14}}>✓ Save Record</button>
</div>}
<div style={{display:“flex”,flexDirection:“column”,gap:10}}>
{serviceRecords.filter(r=>!r.deleted&&(isCarrier||trucks.find(t=>t.id===r.truckId)?.driverId===currentUser.id)).map(rec=>{
const truck=trucks.find(t=>t.id===rec.truckId);
return<div key={rec.id} style={card()}><div style={{display:“flex”,justifyContent:“space-between”}}><div><div style={{fontSize:14,fontWeight:800,color:”#f1f5f9”}}>{rec.type}</div><div style={{fontSize:11,color:”#475569”}}>{truck?.unit||truck?.make} · {rec.date} · {rec.vendor}</div>{rec.notes&&<div style={{fontSize:11,color:”#475569”,marginTop:2}}>{rec.notes}</div>}</div><div style={{textAlign:“right”}}><div style={{fontSize:16,fontWeight:800,color:”#f1f5f9”}}>{fmt(rec.cost)}</div>{rec.nextDueDate&&<div style={{fontSize:10,color:”#f59e0b”}}>Next: {rec.nextDueDate}</div>}</div></div></div>;
})}
{serviceRecords.filter(r=>!r.deleted).length===0&&<div style={{…card(),textAlign:“center”,color:”#334155”,padding:40}}>No service records yet.</div>}
</div>
</div>
);
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────
function DocsModule({currentUser,documents,setDocuments,isCarrier}){
const[showAdd,setShowAdd]=useState(false);
const[nd,setNd]=useState({name:””,type:“CDL”,expiry:””,notes:””});
const add=()=>{setDocuments([…documents,{id:`doc-${Date.now()}`,…nd,uploadDate:today(),fileName:null,driverId:currentUser.id,deleted:false}]);setShowAdd(false);};
const DTYPES=[“CDL”,“Medical Examiner Certificate”,“Form 2290 (HVUT)”,“IFTA License”,“Operating Authority”,“COI (Insurance)”,“W-9”,“Annual Inspection Report”,“Plate Registration”,“Other”];
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”}}>📄 Documents</div>
<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>{showAdd?“✕ Cancel”:”+ Add Document”}</button>
</div>
{showAdd&&<div style={{…card({marginBottom:18,borderColor:”#1e40af”})}}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
<div><span style={lbl}>TYPE</span><select value={nd.type} onChange={e=>setNd({…nd,type:e.target.value})} style={inp}>{DTYPES.map(d=><option key={d}>{d}</option>)}</select></div>
<div><span style={lbl}>DOCUMENT NAME</span><input value={nd.name} onChange={e=>setNd({…nd,name:e.target.value})} style={inp}/></div>
<div><span style={lbl}>EXPIRY</span><input type=“date” value={nd.expiry} onChange={e=>setNd({…nd,expiry:e.target.value})} style={inp}/></div>
<div><span style={lbl}>NOTES</span><input value={nd.notes} onChange={e=>setNd({…nd,notes:e.target.value})} style={inp}/></div>
</div>
<button onClick={add} style={{...btn(),marginTop:14}}>✓ Save Document</button>
</div>}
<div style={{display:“flex”,flexDirection:“column”,gap:10}}>
{documents.filter(d=>!d.deleted&&(isCarrier||d.driverId===currentUser.id)).map(doc=>{
const expiring=doc.expiry&&new Date(doc.expiry)<new Date(Date.now()+30*86400000);
return<div key={doc.id} style={{…card({borderColor:expiring?”#f59e0b40”:”#334155”})}}><div style={{display:“flex”,justifyContent:“space-between”}}><div><div style={{fontSize:14,fontWeight:800,color:”#f1f5f9”}}>{doc.name||doc.type}</div><div style={{fontSize:11,color:”#475569”}}>{doc.type} · {doc.uploadDate}</div>{doc.notes&&<div style={{fontSize:11,color:”#475569”}}>{doc.notes}</div>}</div>{doc.expiry&&<div style={{textAlign:“right”}}><div style={{fontSize:11,color:expiring?”#f59e0b”:”#64748b”}}>Expires: {doc.expiry}</div>{expiring&&<div style={{fontSize:10,color:”#f59e0b”}}>⚠ Expiring soon</div>}</div>}</div></div>;
})}
{documents.filter(d=>!d.deleted).length===0&&<div style={{…card(),textAlign:“center”,color:”#334155”,padding:40}}>No documents yet.</div>}
</div>
</div>
);
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
function Reports({currentUser,loads,pettyCash,serviceRecords,users,isCarrier}){
const[period,setPeriod]=useState(“monthly”);
const[dFilter,setDFilter]=useState(“all”);
const my=isCarrier?(dFilter===“all”?loads:loads.filter(l=>l.driverId===dFilter)).filter(l=>!l.deleted):loads.filter(l=>!l.deleted&&l.driverId===currentUser.id);
const gross=my.reduce((s,l)=>s+l.grossRate,0);
const cut=my.reduce((s,l)=>s+calcLoad(l,users).carrierCut,0);
const dnet=my.reduce((s,l)=>s+calcLoad(l,users).driverNet,0);
const collected=my.filter(l=>l.stage===“paid”).reduce((s,l)=>s+(l.paidAmount||l.grossRate),0);
const os=my.filter(l=>l.stage===“invoiced”).reduce((s,l)=>s+l.grossRate,0);
const pcOwed=pettyCash.filter(p=>!p.deleted&&p.status===“unpaid”).reduce((s,p)=>s+p.amount,0);
const svc=serviceRecords.filter(r=>!r.deleted).reduce((s,r)=>s+(r.cost||0),0);
return(
<div>
<div style={{fontSize:20,fontWeight:900,color:”#fff”,marginBottom:20}}>📊 Reports</div>
<div style={{display:“flex”,gap:8,marginBottom:20,flexWrap:“wrap”}}>
{[“daily”,“weekly”,“monthly”,“yearly”].map(p=><button key={p} onClick={()=>setPeriod(p)} style={{padding:“7px 16px”,borderRadius:7,border:“none”,cursor:“pointer”,fontFamily:“inherit”,fontWeight:800,fontSize:12,background:period===p?”#1e40af”:”#1e293b”,color:period===p?”#fff”:”#475569”}}>{p.toUpperCase()}</button>)}
{isCarrier&&<select value={dFilter} onChange={e=>setDFilter(e.target.value)} style={{…inp,width:“auto”}}>
<option value="all">All Drivers</option>
{users.filter(u=>!u.deleted).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
</select>}
</div>
<div style={{display:“grid”,gridTemplateColumns:“repeat(3,1fr)”,gap:14,marginBottom:20}}>
{[{l:“GROSS REVENUE”,v:fmt(gross),c:”#60a5fa”},…(isCarrier?[{l:“CARRIER COMMISSION”,v:fmt(cut),c:”#a78bfa”}]:[]),{l:“DRIVER NET PAY”,v:fmt(dnet),c:”#22c55e”},{l:“COLLECTED / PAID”,v:fmt(collected),c:”#22c55e”},{l:“OUTSTANDING”,v:fmt(os),c:”#f59e0b”},{l:“TOTAL LOADS”,v:my.length,c:”#60a5fa”},{l:“PETTY CASH OWED”,v:fmt(pcOwed),c:”#ef4444”},{l:“MAINTENANCE COSTS”,v:fmt(svc),c:”#f87171”},{l:“LOADS PAID”,v:my.filter(l=>l.stage===“paid”).length,c:”#22c55e”}]
.map(c=><div key={c.l} style={card()}><div style={{fontSize:9,color:”#64748b”,letterSpacing:1.5,marginBottom:4}}>{c.l}</div><div style={{fontSize:22,fontWeight:900,color:c.c}}>{c.v}</div></div>)}
</div>
{isCarrier&&<div style={card()}>
<div style={{fontSize:10,color:”#60a5fa”,fontWeight:800,letterSpacing:1.5,marginBottom:14}}>PER-DRIVER BREAKDOWN</div>
{users.filter(u=>!u.deleted).map(driver=>{
const dl=loads.filter(l=>!l.deleted&&l.driverId===driver.id);
const dg=dl.reduce((s,l)=>s+l.grossRate,0);
const dc=dl.reduce((s,l)=>s+calcLoad(l,users).carrierCut,0);
const dn=dl.reduce((s,l)=>s+calcLoad(l,users).driverNet,0);
return<div key={driver.id} style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,padding:“12px 0”,borderBottom:“1px solid #1e293b”}}>
<div><div style={{fontSize:13,fontWeight:700,color:”#f1f5f9”}}>{driver.name}</div><div style={{fontSize:11,color:”#475569”}}>{dl.length} loads · {driver.commissionPct}% commission</div></div>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr 1fr”,gap:20,textAlign:“right”}}>
{[{l:“GROSS”,v:fmt(dg),c:”#60a5fa”},{l:“CARRIER CUT”,v:fmt(dc),c:”#a78bfa”},{l:“DRIVER NET”,v:fmt(dn),c:”#22c55e”}].map(x=><div key={x.l}><div style={{fontSize:9,color:”#64748b”}}>{x.l}</div><div style={{fontSize:14,fontWeight:800,color:x.c}}>{x.v}</div></div>)}
</div>
</div>;
})}
</div>}
</div>
);
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function Profile({currentUser,users,setUsers}){
const[form,setForm]=useState({…currentUser});
const[saved,setSaved]=useState(false);
const save=()=>{setUsers(users.map(u=>u.id===currentUser.id?{…u,…form}:u));setSaved(true);setTimeout(()=>setSaved(false),2000);};
const F=({l,k,type=“text”})=><div><span style={lbl}>{l}</span><input type={type} value={form[k]||””} onChange={e=>setForm({…form,[k]:e.target.value})} style={inp}/></div>;
return(
<div style={{maxWidth:680}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”,marginBottom:20}}>👤 My Profile</div>
<div style={card()}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:14}}>
<F l="FULL NAME" k="name"/><F l="EMAIL" k="email" type="email"/>
<F l="PHONE" k="phone"/><F l="ADDRESS" k="address"/>
<F l="CDL NUMBER" k="cdl"/><F l="CDL STATE" k="cdlState"/>
<F l="CDL EXPIRY" k="cdlExpiry" type="date"/><F l="MED CARD EXPIRY" k="medCardExpiry" type="date"/>
<F l="EMERGENCY CONTACT" k="emergencyContact"/><F l="EMERGENCY PHONE" k="emergencyPhone"/>
</div>
<button onClick={save} style={{...btn(),marginTop:18}}>{saved?“✓ Saved!”:“Save Profile”}</button>
</div>
</div>
);
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function Admin({currentUser,users,setUsers,trucks,setTrucks}){
const[showAdd,setShowAdd]=useState(false);
const[nu,setNu]=useState({name:””,email:””,phone:””,password:“ettr2024”,role:ROLES.DRIVER,carrierRole:“Driver”,commissionPct:20});
const add=()=>{if(!nu.name||!nu.email)return;setUsers([…users,{id:`user-${Date.now()}`,…nu,truckId:null,cdl:””,cdlState:””,cdlExpiry:””,medCardExpiry:””,hireDate:””,address:””,emergencyContact:””,emergencyPhone:””,deleted:false}]);setShowAdd(false);};
return(
<div>
<div style={{fontSize:20,fontWeight:900,color:”#fff”,marginBottom:20}}>🛡️ Carrier Admin</div>
<div style={{...card({marginBottom:16})}}>
<div style={{fontSize:10,color:”#60a5fa”,fontWeight:800,letterSpacing:1.5,marginBottom:14}}>USERS & DRIVERS</div>
{users.filter(u=>!u.deleted).map(u=><div key={u.id} style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,padding:“10px 0”,borderBottom:“1px solid #1e293b”}}>
<div><div style={{fontSize:13,fontWeight:700,color:”#f1f5f9”}}>{u.name}</div><div style={{fontSize:11,color:”#475569”}}>{u.email} · {u.carrierRole} · Commission: {u.commissionPct}%</div></div>
<span style={{fontSize:10,background:”#1e40af20”,color:”#93c5fd”,border:“1px solid #1e40af30”,borderRadius:4,padding:“2px 8px”}}>{u.role}</span>
</div>)}
<button onClick={()=>setShowAdd(!showAdd)} style={{…btn(),marginTop:16}}>{showAdd?“✕ Cancel”:”+ Add Driver”}</button>
{showAdd&&<div style={{marginTop:16,display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
{[{l:“NAME”,k:“name”},{l:“EMAIL”,k:“email”,type:“email”},{l:“PHONE”,k:“phone”},{l:“PASSWORD”,k:“password”},{l:“CARRIER ROLE”,k:“carrierRole”}].map(f=><div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} value={nu[f.k]||””} onChange={e=>setNu({…nu,[f.k]:e.target.value})} style={inp}/></div>)}
<div><span style={lbl}>COMMISSION %</span><input type=“number” min=“0” max=“50” value={nu.commissionPct} onChange={e=>setNu({…nu,commissionPct:parseFloat(e.target.value)||0})} style={inp}/></div>
<button onClick={add} style={{…btn(),marginTop:10,gridColumn:“span 2”}}>✓ Save Driver</button>
</div>}
</div>
<div style={card()}>
<div style={{fontSize:10,color:”#60a5fa”,fontWeight:800,letterSpacing:1.5,marginBottom:10}}>INTEGRATIONS</div>
{[{name:“Zoho Mail API”,desc:“Send carrier invoices and BOL packages to brokers”,status:“Not Connected”},{name:“FleetOne / WEX Fuel API”,desc:“Auto-import fuel transactions per truck for IFTA”,status:“Not Connected”},{name:“BlueInk Tech ELD”,desc:“Driver HOS log integration”,status:“Active”}]
.map(i=><div key={i.name} style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,background:”#0f172a”,borderRadius:8,padding:“12px 14px”,marginBottom:8}}>
<div><div style={{fontSize:13,fontWeight:700,color:”#f1f5f9”}}>{i.name}</div><div style={{fontSize:11,color:”#475569”}}>{i.desc}</div></div>
<span style={{fontSize:10,background:i.status===“Active”?”#22c55e20”:”#334155”,color:i.status===“Active”?”#22c55e”:”#64748b”,border:`1px solid ${i.status==="Active"?"#22c55e40":"#334155"}`,borderRadius:4,padding:“2px 10px”,fontWeight:700}}>{i.status}</span>
</div>)}
</div>
</div>
);
}
