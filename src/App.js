import { useState, useRef, useCallback } from “react”;
import {
Truck, User, FileText, DollarSign, Fuel, Settings, BarChart2,
Package, Wrench, Shield, LogOut, Plus, Check, Upload,
AlertCircle, Clock, MapPin, Phone, Mail, Calendar, Receipt,
Edit, Trash2, Search, Download, Send, Home, Lock,
Eye, EyeOff, X, Menu, ChevronDown, CheckCircle,
List, TrendingUp, Filter, ChevronRight, RefreshCw,
Bell, Camera, CreditCard, Hash, Clipboard, AlertTriangle
} from “lucide-react”;

const ROLES = { DEVELOPER:“developer”, CARRIER_ADMIN:“carrier_admin”, DRIVER:“driver” };

const LOAD_STATUS_LIST = [“Rate Con Received”,“In Transit”,“Delivered”,“Invoiced”,“Paid”,“Dispute”];
const STATUS_COLORS = {
“Rate Con Received”:”#3b82f6”,“In Transit”:”#f59e0b”,“Delivered”:”#8b5cf6”,
“Invoiced”:”#ec4899”,“Paid”:”#22c55e”,“Dispute”:”#ef4444”
};
const BROKERS = [“CNA Transportation”,“Echo Global Logistics”,“Coyote Logistics”,“CH Robinson”,“Landstar”,“Other”];
const PETTY_CATEGORIES = [“Repairs & Maintenance”,“Fuel”,“Tires”,“Permits & Fees”,“Supplies”,“Lodging”,“Meals”,“Other”];

const INITIAL_USERS = [
{ id:“tim_smith”, name:“Tim Smith”, email:“tim@ettr.com”, phone:“618-974-8695”,
password:“ettr2024”, role:ROLES.DEVELOPER, carrierRole:“Lease Operator / Owner-Operator”,
cdl:””, cdlState:“IL”, cdlExpiry:””, medCardExpiry:””, hireDate:””,
address:””, emergencyContact:””, emergencyPhone:””, truckId:“pete_777”, commissionPct:20, deleted:false },
{ id:“bruce_edgerton”, name:“Bruce Edgerton”, email:“bruce@ettr.com”, phone:””,
password:“ettr2024”, role:ROLES.CARRIER_ADMIN, carrierRole:“Carrier / Owner-Operator”,
cdl:””, cdlState:“WI”, cdlExpiry:””, medCardExpiry:””, hireDate:””,
address:“Bonduel, WI”, emergencyContact:””, emergencyPhone:””, truckId:“kw_bruce”, commissionPct:0, deleted:false },
];

const INITIAL_TRUCKS = [
{ id:“pete_777”, driverId:“tim_smith”, make:“Peterbilt”, model:“579”, year:2013, color:“White”,
unit:”#777”, vin:“1XP-BDP9X-3-ED234685”, mileage:996058.7, licensePlate:””, stateReg:“IL”, eldProvider:“BlueInk Tech”,
tires:{brand:””,size:””,frontTread:””,rearTread:””,lastReplaced:””},
brakes:{type:“Air Drum”,brand:””,lastInspected:””,lastReplaced:””},
reefer:{hasReefer:false,brand:””,model:””,serial:””,lastService:””}, notes:”” },
{ id:“kw_bruce”, driverId:“bruce_edgerton”, make:“Kenworth”, model:“T680”, year:null, color:“Blue”,
unit:””, vin:””, mileage:0, licensePlate:””, stateReg:“WI”, eldProvider:””,
tires:{brand:””,size:””,frontTread:””,rearTread:””,lastReplaced:””},
brakes:{type:“Air Drum”,brand:””,lastInspected:””,lastReplaced:””},
reefer:{hasReefer:false,brand:””,model:””,serial:””,lastService:””}, notes:”” },
];

const INITIAL_PETTY_CASH = [
{ id:“pc_mike001”, description:“Mike\u2019s Inc \u2013 Truck #777 Major Repair (Invoice #097919)”,
vendor:“Mike\u2019s Inc \u2013 South Roxana, IL”, amount:15477.45, date:“2026-01-30”,
category:“Repairs & Maintenance”, paidBy:“Bruce”, status:“unpaid”,
receiptUrl:null, receiptName:null, paidDate:null,
notes:“DOT inspection, kingpins, radiator, air springs, shocks, torque rods, trans cooler, exhaust bellow, power steering res, wheel seals, brake shoes/drums, lower coolant pipe, license plate light, rear quarter fenders, aftertreatment fuel shutoff valve, DEF fluid, alignment. Unit now passes DOT.”,
deleted:false },
];

const INITIAL_LOADS = [
{ id:“load-seed-001”, driverId:“tim_smith”, broker:“CNA Transportation”,
brokerContact:“dispatch@cnatrans.com”, loadNumber:“CNA-2026-0041”,
origin:“Chicago, IL”, destination:“Memphis, TN”, pickupDate:“2026-02-10”, deliveryDate:“2026-02-11”,
grossRate:2400, status:“Paid”,
comcheck:{number:“CC-88821”,amount:300,dateIssued:“2026-02-10”,issuedTo:“tim_smith”},
docs:{rateCon:“RateCon_CNA0041.pdf”,bolSigned:“BOL_signed.jpg”,pod:“POD_CNA0041.jpg”,lumper:null},
lumperAmount:0, detentionAmount:0, expenses:[], invoiceSentDate:“2026-02-12”,
paidDate:“2026-02-19”, paidAmount:2100, notes:“First load of the year.”, deleted:false },
];

const fmt = (n) => Number(n||0).toLocaleString(“en-US”,{style:“currency”,currency:“USD”});
const calcLoad = (load, users) => {
const driver = users.find(u=>u.id===load.driverId);
const commPct = driver ? driver.commissionPct : 0;
const carrierCut = (load.grossRate * commPct) / 100;
const driverNet = load.grossRate - carrierCut;
const comcheckAmt = load.comcheck ? Number(load.comcheck.amount) : 0;
const invoiceTotal = load.grossRate - comcheckAmt;
const totalExpenses = (load.expenses||[]).reduce((s,e)=>s+Number(e.amount),0);
const driverProfit = driverNet - totalExpenses - Number(load.lumperAmount||0);
return {commPct,carrierCut,driverNet,comcheckAmt,invoiceTotal,totalExpenses,driverProfit};
};

const crd = (extra={}) => ({background:”#1e293b”,border:“1px solid #334155”,borderRadius:12,padding:20,…extra});
const lbl = {fontSize:10,color:”#64748b”,letterSpacing:1.5,marginBottom:4,display:“block”};
const inp = {width:“100%”,background:”#0f172a”,border:“1px solid #334155”,borderRadius:8,padding:“9px 12px”,color:”#e2e8f0”,fontFamily:“inherit”,fontSize:13,boxSizing:“border-box”};
const btn = (bg=”#1e40af”,col=”#fff”,extra={}) => ({background:bg,color:col,border:“none”,borderRadius:8,padding:“9px 18px”,cursor:“pointer”,fontFamily:“inherit”,fontWeight:800,fontSize:12,letterSpacing:0.5,…extra});
const ghost = {background:“none”,border:“1px solid #334155”,color:”#64748b”,borderRadius:8,padding:“9px 14px”,cursor:“pointer”,fontFamily:“inherit”,fontSize:12};

export default function ETTRApp() {
const [currentUser, setCurrentUser] = useState(null);
const [page, setPage] = useState(“dashboard”);
const [sideCollapsed, setSideCollapsed] = useState(false);
const [users, setUsers] = useState(INITIAL_USERS);
const [trucks, setTrucks] = useState(INITIAL_TRUCKS);
const [trailers, setTrailers] = useState([]);
const [serviceRecords, setServiceRecords] = useState([]);
const [documents, setDocuments] = useState([]);
const [pettyCash, setPettyCash] = useState(INITIAL_PETTY_CASH);
const [loads, setLoads] = useState(INITIAL_LOADS);

if (!currentUser) return <LoginScreen users={users} onLogin={u=>{setCurrentUser(u);setPage(“dashboard”);}}/>;

const liveUser = users.find(u=>u.id===currentUser.id)||currentUser;
const isCarrier = liveUser.role===ROLES.CARRIER_ADMIN||liveUser.role===ROLES.DEVELOPER;
const sideW = sideCollapsed ? 60 : 220;

const props = {currentUser:liveUser,users,setUsers,trucks,setTrucks,trailers,setTrailers,serviceRecords,setServiceRecords,documents,setDocuments,pettyCash,setPettyCash,loads,setLoads,isCarrier};

const renderPage = () => {
switch(page){
case “dashboard”:  return <Dashboard {…props} setPage={setPage}/>;
case “loads”:      return <LoadsModule {…props}/>;
case “petty_cash”: return <PettyCashModule {…props}/>;
case “fuel”:       return <FuelModule {…props}/>;
case “truck”:      return <TruckModule {…props}/>;
case “trailers”:   return <TrailersModule {…props}/>;
case “service”:    return <ServiceModule {…props}/>;
case “documents”:  return <DocumentsModule {…props}/>;
case “reports”:    return <ReportsModule {…props}/>;
case “profile”:    return <ProfileModule {…props}/>;
case “admin”:      return isCarrier ? <AdminModule {…props}/> : <Dashboard {…props} setPage={setPage}/>;
default:           return <Dashboard {…props} setPage={setPage}/>;
}
};

const NAV = [
{key:“dashboard”,icon:“🏠”,label:“Dashboard”},
{key:“loads”,icon:“📦”,label:“Loads”},
{key:“petty_cash”,icon:“💵”,label:“Petty Cash”},
{key:“fuel”,icon:“⛽”,label:“Fuel Log”},
{key:“truck”,icon:“🚛”,label:“My Truck”},
{key:“trailers”,icon:“🔲”,label:“Trailers”},
{key:“service”,icon:“🔧”,label:“Service”},
{key:“documents”,icon:“📄”,label:“Documents”},
{key:“reports”,icon:“📊”,label:“Reports”},
{key:“profile”,icon:“👤”,label:“Profile”},
…(isCarrier?[{key:“admin”,icon:“🛡️”,label:“Admin”}]:[]),
];

return (
<div style={{minHeight:“100vh”,background:”#0a0f1e”,color:”#e2e8f0”,fontFamily:”‘Courier New’,Courier,monospace”,display:“flex”}}>
<div style={{width:sideW,background:”#0f172a”,borderRight:“1px solid #1e293b”,display:“flex”,flexDirection:“column”,flexShrink:0,transition:“width 0.2s”}}>
<div style={{padding:“16px 14px”,borderBottom:“1px solid #1e293b”,display:“flex”,alignItems:“center”,justifyContent:“space-between”}}>
{!sideCollapsed&&<div style={{fontSize:14,fontWeight:900,color:”#60a5fa”,letterSpacing:1}}>ETTR</div>}
<button onClick={()=>setSideCollapsed(!sideCollapsed)} style={{background:“none”,border:“none”,color:”#475569”,cursor:“pointer”,fontSize:18}}>☰</button>
</div>
{!sideCollapsed&&<div style={{padding:“10px 14px”,borderBottom:“1px solid #1e293b”}}>
<div style={{fontSize:11,fontWeight:800,color:”#f1f5f9”}}>{liveUser.name}</div>
<div style={{fontSize:10,color:”#475569”}}>{liveUser.carrierRole}</div>
</div>}
<nav style={{flex:1,paddingTop:8}}>
{NAV.map(item=>(
<button key={item.key} onClick={()=>setPage(item.key)}
style={{width:“100%”,textAlign:“left”,padding:sideCollapsed?“11px 18px”:“10px 16px”,border:“none”,cursor:“pointer”,fontFamily:“inherit”,fontSize:11,fontWeight:700,display:“flex”,alignItems:“center”,gap:10,transition:“all 0.15s”,
background:page===item.key?”#1e293b”:“transparent”,
color:page===item.key?”#60a5fa”:”#475569”,
borderLeft:page===item.key?“3px solid #3b82f6”:“3px solid transparent”}}>
<span>{item.icon}</span>{!sideCollapsed&&item.label}
</button>
))}
</nav>
<button onClick={()=>setCurrentUser(null)}
style={{margin:12,background:”#1e293b”,border:“1px solid #334155”,color:”#475569”,borderRadius:8,padding:10,cursor:“pointer”,fontFamily:“inherit”,fontSize:11,display:“flex”,alignItems:“center”,gap:8,justifyContent:sideCollapsed?“center”:“flex-start”}}>
🚪{!sideCollapsed&&” Sign Out”}
</button>
</div>
<main style={{flex:1,padding:24,overflowY:“auto”}}>
<div style={{maxWidth:1100}}>{renderPage()}</div>
</main>
</div>
);
}

function LoginScreen({users,onLogin}){
const [email,setEmail]=useState(””);
const [pw,setPw]=useState(””);
const [show,setShow]=useState(false);
const [err,setErr]=useState(””);
const handle=()=>{
const u=users.find(x=>!x.deleted&&x.email===email.trim()&&x.password===pw);
if(u) onLogin(u); else setErr(“Invalid email or password.”);
};
return(
<div style={{minHeight:“100vh”,background:”#0a0f1e”,display:“flex”,alignItems:“center”,justifyContent:“center”,fontFamily:”‘Courier New’,monospace”}}>
<div style={{…crd(),width:360,borderColor:”#1e40af”}}>
<div style={{textAlign:“center”,marginBottom:28}}>
<div style={{fontSize:32,marginBottom:4}}>🚛</div>
<div style={{fontSize:20,fontWeight:900,color:”#fff”,letterSpacing:1}}>ETTR FLEET</div>
<div style={{fontSize:10,color:”#60a5fa”,letterSpacing:2}}>EDGERTON TRUCK & TRAILER REPAIR</div>
<div style={{fontSize:9,color:”#334155”,marginTop:2}}>DOT 1978980 · Bonduel, WI</div>
</div>
<div style={{marginBottom:12}}><span style={lbl}>EMAIL</span><input type=“email” value={email} onChange={e=>setEmail(e.target.value)} style={inp} placeholder=“you@ettr.com”/></div>
<div style={{marginBottom:16,position:“relative”}}>
<span style={lbl}>PASSWORD</span>
<input type={show?“text”:“password”} value={pw} onChange={e=>setPw(e.target.value)} style={inp} onKeyDown={e=>e.key===“Enter”&&handle()}/>
<button onClick={()=>setShow(!show)} style={{position:“absolute”,right:10,top:28,background:“none”,border:“none”,color:”#475569”,cursor:“pointer”}}>{show?“🙈”:“👁”}</button>
</div>
{err&&<div style={{color:”#ef4444”,fontSize:12,marginBottom:10}}>{err}</div>}
<button onClick={handle} style={{…btn(),width:“100%”,padding:“11px”,fontSize:13}}>SIGN IN</button>
<div style={{marginTop:12,fontSize:10,color:”#334155”,textAlign:“center”}}>tim@ettr.com or bruce@ettr.com · pw: ettr2024</div>
</div>
</div>
);
}

function Dashboard({currentUser,loads,pettyCash,users,isCarrier,setPage}){
const myLoads=isCarrier?loads.filter(l=>!l.deleted):loads.filter(l=>!l.deleted&&l.driverId===currentUser.id);
const grossRevenue=myLoads.reduce((s,l)=>s+l.grossRate,0);
const outstanding=myLoads.filter(l=>l.status===“Invoiced”).reduce((s,l)=>s+l.grossRate,0);
const pcOwed=pettyCash.filter(p=>!p.deleted&&p.status===“unpaid”).reduce((s,p)=>s+p.amount,0);
const openLoads=myLoads.filter(l=>![“Paid”].includes(l.status));

const SC=({lbl:l,value,color,sub,onClick})=>(
<div onClick={onClick} style={{…crd(),cursor:onClick?“pointer”:“default”,borderColor:`${color}30`}}>
<div style={{fontSize:10,color:”#64748b”,letterSpacing:1.5,marginBottom:6}}>{l}</div>
<div style={{fontSize:24,fontWeight:900,color}}>{value}</div>
{sub&&<div style={{fontSize:11,color:”#475569”,marginTop:2}}>{sub}</div>}
</div>
);

return(
<div>
<div style={{marginBottom:24}}>
<div style={{fontSize:22,fontWeight:900,color:”#fff”}}>Welcome, {currentUser.name.split(” “)[0]}</div>
<div style={{fontSize:11,color:”#475569”}}>ETTR Fleet Management · {new Date().toLocaleDateString()}</div>
</div>
<div style={{display:“grid”,gridTemplateColumns:“repeat(4,1fr)”,gap:14,marginBottom:28}}>
<SC lbl=“TOTAL GROSS REVENUE” value={fmt(grossRevenue)} color=”#60a5fa” sub={`${myLoads.length} loads`} onClick={()=>setPage(“loads”)}/>
<SC lbl=“OPEN LOADS” value={openLoads.length} color=”#f59e0b” sub=“In progress” onClick={()=>setPage(“loads”)}/>
<SC lbl=“OUTSTANDING INVOICES” value={fmt(outstanding)} color=”#ec4899” sub=“Awaiting payment” onClick={()=>setPage(“loads”)}/>
<SC lbl=“PETTY CASH OWED” value={fmt(pcOwed)} color=”#ef4444” sub=“To Bruce” onClick={()=>setPage(“petty_cash”)}/>
</div>
<div style={crd()}>
<div style={{fontSize:12,color:”#60a5fa”,fontWeight:800,letterSpacing:1,marginBottom:14}}>RECENT LOADS</div>
{myLoads.slice(0,5).map(load=>{
const driver=users.find(u=>u.id===load.driverId);
const sc=STATUS_COLORS[load.status]||”#64748b”;
return(
<div key={load.id} onClick={()=>setPage(“loads”)} style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,padding:“10px 0”,borderBottom:“1px solid #1e293b”,cursor:“pointer”}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:”#f1f5f9”}}>{load.origin} → {load.destination}</div>
<div style={{fontSize:11,color:”#475569”}}>{load.broker} · {driver?.name}</div>
</div>
<div style={{textAlign:“right”}}>
<div style={{fontSize:14,fontWeight:800,color:”#f1f5f9”}}>{fmt(load.grossRate)}</div>
<span style={{fontSize:10,background:`${sc}20`,color:sc,border:`1px solid ${sc}40`,borderRadius:4,padding:“1px 7px”}}>{load.status}</span>
</div>
</div>
);
})}
{myLoads.length===0&&<div style={{color:”#334155”,fontSize:12}}>No loads yet. Create one in the Loads module.</div>}
</div>
</div>
);
}

function LoadsModule({currentUser,users,setUsers,loads,setLoads,trucks,isCarrier}){
const [view,setView]=useState(“list”);
const [selectedLoad,setSelectedLoad]=useState(null);
const [filterStatus,setFilterStatus]=useState(“All”);
const [delConfirm,setDelConfirm]=useState({id:null,step:0});
const fileRefs=useRef({});

const visible=loads.filter(l=>{
if(l.deleted)return false;
if(!isCarrier&&l.driverId!==currentUser.id)return false;
if(filterStatus!==“All”&&l.status!==filterStatus)return false;
return true;
});

const advStatus=(id)=>{
setLoads(loads.map(l=>{
if(l.id!==id)return l;
const idx=LOAD_STATUS_LIST.indexOf(l.status);
return idx<LOAD_STATUS_LIST.length-1?{…l,status:LOAD_STATUS_LIST[idx+1]}:l;
}));
if(selectedLoad?.id===id){
const idx=LOAD_STATUS_LIST.indexOf(selectedLoad.status);
if(idx<LOAD_STATUS_LIST.length-1)setSelectedLoad({…selectedLoad,status:LOAD_STATUS_LIST[idx+1]});
}
};

const markPaid=(id,amt)=>{
const updated=loads.map(l=>l.id===id?{…l,status:“Paid”,paidDate:new Date().toISOString().split(“T”)[0],paidAmount:parseFloat(amt)}:l);
setLoads(updated);
setSelectedLoad(updated.find(l=>l.id===id));
};

const softDel=(id)=>{
if(delConfirm.id===id&&delConfirm.step===1){
setLoads(loads.map(l=>l.id===id?{…l,deleted:true}:l));
setDelConfirm({id:null,step:0});setView(“list”);setSelectedLoad(null);
}else setDelConfirm({id,step:1});
};

const updateLoad=(id,changes)=>{
const updated=loads.map(l=>l.id===id?{…l,…changes}:l);
setLoads(updated);
setSelectedLoad(updated.find(l=>l.id===id));
};

const uploadDoc=(lid,key,file)=>{
if(!file)return;
updateLoad(lid,{docs:{…loads.find(l=>l.id===lid)?.docs,[key]:file.name}});
};

const allActive=loads.filter(l=>!l.deleted);
const totalGross=allActive.reduce((s,l)=>s+l.grossRate,0);
const totalCut=allActive.reduce((s,l)=>s+calcLoad(l,users).carrierCut,0);
const totalCollected=allActive.filter(l=>l.status===“Paid”).reduce((s,l)=>s+(l.paidAmount||l.grossRate),0);
const totalOS=allActive.filter(l=>l.status===“Invoiced”).reduce((s,l)=>s+l.grossRate,0);

return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20,flexWrap:“wrap”,gap:10}}>
<div>
<div style={{fontSize:20,fontWeight:900,color:”#fff”}}>
{view===“commSettings”?“⚙️ Commission Settings”:view===“new”?”+ New Load”:view===“detail”?“Load Detail”:isCarrier?“All Loads — ETTR”:`My Loads — ${currentUser.name}`}
</div>
{view===“list”&&<div style={{fontSize:11,color:”#475569”}}>{visible.length} load(s)</div>}
</div>
<div style={{display:“flex”,gap:8,flexWrap:“wrap”}}>
{view!==“list”&&<button onClick={()=>{setView(“list”);setSelectedLoad(null);setDelConfirm({id:null,step:0});}} style={ghost}>← Back</button>}
{view===“list”&&<button onClick={()=>setView(“new”)} style={btn()}>+ NEW LOAD</button>}
{view===“list”&&isCarrier&&<button onClick={()=>setView(“commSettings”)} style={btn(”#334155”,”#94a3b8”)}>⚙️ Commission</button>}
</div>
</div>

```
  {view==="list"&&isCarrier&&(
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
      {[{l:"TOTAL GROSS",v:fmt(totalGross),c:"#60a5fa"},{l:"CARRIER COMMISSION",v:fmt(totalCut),c:"#a78bfa"},{l:"COLLECTED",v:fmt(totalCollected),c:"#22c55e"},{l:"OUTSTANDING",v:fmt(totalOS),c:"#f59e0b"}]
        .map(c=><div key={c.l} style={crd()}><div style={{fontSize:9,color:"#64748b",letterSpacing:1.5,marginBottom:4}}>{c.l}</div><div style={{fontSize:20,fontWeight:900,color:c.c}}>{c.v}</div></div>)}
    </div>
  )}

  {view==="list"&&(
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {["All",...LOAD_STATUS_LIST].map(s=>(
        <button key={s} onClick={()=>setFilterStatus(s)}
          style={{padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,
            background:filterStatus===s?(STATUS_COLORS[s]||"#1e40af"):"#1e293b",
            color:filterStatus===s?"#fff":"#475569"}}>
          {s}
        </button>
      ))}
    </div>
  )}

  {view==="list"&&(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {visible.length===0&&<div style={{...crd(),textAlign:"center",color:"#334155",padding:50}}>No loads. Click + NEW LOAD to start.</div>}
      {visible.map(load=>{
        const driver=users.find(u=>u.id===load.driverId);
        const {commPct,carrierCut,driverNet}=calcLoad(load,users);
        const sc=STATUS_COLORS[load.status]||"#64748b";
        return(
          <div key={load.id} onClick={()=>{setSelectedLoad(load);setView("detail");}}
            style={{...crd({borderColor:`${sc}40`,cursor:"pointer"})}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:4,alignItems:"center"}}>
                  <span style={{background:`${sc}20`,color:sc,border:`1px solid ${sc}50`,borderRadius:5,padding:"2px 9px",fontSize:10,fontWeight:800}}>{load.status.toUpperCase()}</span>
                  <span style={{fontSize:11,color:"#475569"}}>{load.loadNumber}</span>
                  <span style={{fontSize:11,color:"#475569"}}>{load.broker}</span>
                  {load.comcheck&&<span style={{fontSize:10,background:"#78350f20",color:"#fbbf24",border:"1px solid #78350f50",borderRadius:4,padding:"1px 7px"}}>⛽ COMCHECK</span>}
                </div>
                <div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>{load.origin} → {load.destination}</div>
                <div style={{fontSize:11,color:"#475569"}}>{driver?.name} · {load.pickupDate} → {load.deliveryDate}</div>
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
  )}

  {view==="new"&&<NewLoadForm users={users} currentUser={currentUser} isCarrier={isCarrier} onSave={load=>{setLoads([load,...loads]);setView("list");}} onCancel={()=>setView("list")}/>}

  {view==="detail"&&selectedLoad&&(
    <LoadDetail load={selectedLoad} users={users} currentUser={currentUser} isCarrier={isCarrier}
      onUpdate={updateLoad} onMarkPaid={markPaid} onAdvance={advStatus}
      onDelete={softDel} delConfirm={delConfirm} setDelConfirm={setDelConfirm}
      uploadDoc={uploadDoc} fileRefs={fileRefs}/>
  )}

  {view==="commSettings"&&isCarrier&&<CommissionSettings users={users} setUsers={setUsers}/>}
</div>
```

);
}

function NewLoadForm({users,currentUser,isCarrier,onSave,onCancel}){
const drivers=users.filter(u=>!u.deleted);
const [form,setForm]=useState({
driverId:isCarrier?“tim_smith”:currentUser.id,
broker:“CNA Transportation”,brokerContact:””,loadNumber:””,
origin:””,destination:””,pickupDate:””,deliveryDate:””,grossRate:””,
hasComcheck:false,ccNum:””,ccAmt:””,ccDate:new Date().toISOString().split(“T”)[0],
lumperAmount:0,detentionAmount:0,notes:””
});
const [err,setErr]=useState(””);

const handle=()=>{
if(!form.loadNumber||!form.grossRate||!form.origin||!form.destination){setErr(“Load #, rate, origin, destination required.”);return;}
onSave({
id:`load-${Date.now()}`,driverId:form.driverId,broker:form.broker,brokerContact:form.brokerContact,
loadNumber:form.loadNumber,origin:form.origin,destination:form.destination,
pickupDate:form.pickupDate,deliveryDate:form.deliveryDate,grossRate:parseFloat(form.grossRate),
status:“Rate Con Received”,
comcheck:form.hasComcheck?{number:form.ccNum,amount:parseFloat(form.ccAmt)||0,dateIssued:form.ccDate,issuedTo:form.driverId}:null,
docs:{rateCon:null,bolSigned:null,pod:null,lumper:null},expenses:[],
lumperAmount:parseFloat(form.lumperAmount)||0,detentionAmount:parseFloat(form.detentionAmount)||0,
invoiceSentDate:null,paidDate:null,paidAmount:null,notes:form.notes,deleted:false
});
};

const F=({l,k,type=“text”,ph})=>(
<div><span style={lbl}>{l}</span><input type={type} placeholder={ph} value={form[k]||””} onChange={e=>setForm({…form,[k]:e.target.value})} style={inp}/></div>
);

return(
<div style={{maxWidth:700}}>
{err&&<div style={{background:”#7f1d1d20”,border:“1px solid #ef444440”,borderRadius:8,padding:“10px 14px”,color:”#fca5a5”,fontSize:12,marginBottom:14}}>{err}</div>}
<div style={crd()}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:14}}>
{isCarrier&&<div><span style={lbl}>DRIVER</span><select value={form.driverId} onChange={e=>setForm({…form,driverId:e.target.value})} style={inp}>{drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>}
<div><span style={lbl}>BROKER</span><select value={form.broker} onChange={e=>setForm({…form,broker:e.target.value})} style={inp}>{BROKERS.map(b=><option key={b}>{b}</option>)}</select></div>
<F l="LOAD / REFERENCE #" k="loadNumber" ph="CNA-2026-0099"/>
<F l="BROKER BILLING EMAIL" k="brokerContact" type="email" ph="billing@broker.com"/>
<F l="ORIGIN (City, State)" k="origin" ph="Chicago, IL"/>
<F l="DESTINATION (City, State)" k="destination" ph="Memphis, TN"/>
<F l="PICKUP DATE" k="pickupDate" type="date"/>
<F l="DELIVERY DATE" k="deliveryDate" type="date"/>
<F l="GROSS RATE — Rate Confirmation ($)" k="grossRate" type="number" ph="0.00"/>
<F l="NOTES" k="notes" ph="Optional"/>
</div>
<div style={{marginTop:18,background:”#0f172a”,borderRadius:10,padding:16,border:“1px solid #334155”}}>
<label style={{display:“flex”,alignItems:“center”,gap:10,cursor:“pointer”,marginBottom:form.hasComcheck?14:0}}>
<input type=“checkbox” checked={form.hasComcheck} onChange={e=>setForm({…form,hasComcheck:e.target.checked})}/>
<span style={{fontSize:13,fontWeight:700,color:”#fbbf24”}}>⛽ ComCheck / Fuel Advance Issued on This Load</span>
</label>
{form.hasComcheck&&(
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr 1fr”,gap:12}}>
<div><span style={lbl}>COMCHECK #</span><input value={form.ccNum||””} onChange={e=>setForm({…form,ccNum:e.target.value})} style={{…inp,border:“1px solid #78350f80”,color:”#fbbf24”}} placeholder=“CC-XXXXX”/></div>
<div><span style={lbl}>AMOUNT ($)</span><input type=“number” value={form.ccAmt||””} onChange={e=>setForm({…form,ccAmt:e.target.value})} style={{…inp,border:“1px solid #78350f80”,color:”#fbbf24”}} placeholder=“0.00”/></div>
<div><span style={lbl}>DATE ISSUED</span><input type=“date” value={form.ccDate} onChange={e=>setForm({…form,ccDate:e.target.value})} style={{…inp,border:“1px solid #78350f80”,color:”#fbbf24”}}/></div>
</div>
)}
</div>
<div style={{display:“flex”,gap:10,marginTop:20}}>
<button onClick={handle} style={btn()}>✓ CREATE LOAD</button>
<button onClick={onCancel} style={ghost}>Cancel</button>
</div>
</div>
</div>
);
}

function LoadDetail({load,users,currentUser,isCarrier,onUpdate,onMarkPaid,onAdvance,onDelete,delConfirm,setDelConfirm,uploadDoc,fileRefs}){
const [showPay,setShowPay]=useState(false);
const [payAmt,setPayAmt]=useState(load.paidAmount||load.grossRate||””);
const [newExp,setNewExp]=useState({desc:””,amount:””});

const driver=users.find(u=>u.id===load.driverId);
const {commPct,carrierCut,driverNet,comcheckAmt,invoiceTotal,totalExpenses,driverProfit}=calcLoad(load,users);
const sc=STATUS_COLORS[load.status]||”#64748b”;

const set=(field,value)=>onUpdate(load.id,{[field]:value});
const setCC=(field,value)=>onUpdate(load.id,{comcheck:{…(load.comcheck||{}),[field]:value}});

const addExp=()=>{
if(!newExp.desc||!newExp.amount)return;
onUpdate(load.id,{expenses:[…(load.expenses||[]),{id:Date.now(),desc:newExp.desc,amount:parseFloat(newExp.amount)}]});
setNewExp({desc:””,amount:””});
};

const Sec=({title,children})=>(
<div style={{...crd(),marginBottom:14}}>
<div style={{fontSize:10,color:”#60a5fa”,fontWeight:800,letterSpacing:1.5,marginBottom:14}}>{title}</div>
{children}
</div>
);

const Fld=({l,value,editable,onChange,type=“text”})=>(
<div style={{marginBottom:10}}>
<span style={lbl}>{l}</span>
{editable?<input type={type} value={value||””} onChange={e=>onChange(e.target.value)} style={inp}/>
:<div style={{fontSize:13,color:”#f1f5f9”,fontWeight:600}}>{value||”—”}</div>}
</div>
);

const FR=({l,value,color,big})=>(
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:8}}>
<span style={{fontSize:big?12:11,color:”#64748b”}}>{l}</span>
<span style={{fontSize:big?18:14,fontWeight:big?900:700,color}}>{value}</span>
</div>
);

const DOC_SLOTS=[
{key:“rateCon”,lbl:“Rate Confirmation”},
{key:“bolSigned”,lbl:“BOL — Signed at Pickup”},
{key:“pod”,lbl:“POD — Signed at Delivery”},
{key:“lumper”,lbl:“Lumper Receipt”},
];

return(
<div>
<div style={{background:`${sc}15`,border:`1px solid ${sc}40`,borderRadius:10,padding:“12px 18px”,marginBottom:18,display:“flex”,justifyContent:“space-between”,alignItems:“center”,flexWrap:“wrap”,gap:10}}>
<div>
<span style={{color:sc,fontWeight:900,fontSize:14}}>{load.status.toUpperCase()}</span>
<span style={{color:”#475569”,fontSize:12,marginLeft:14}}>{load.loadNumber} · {load.broker}</span>
</div>
<div style={{display:“flex”,gap:8,flexWrap:“wrap”}}>
{(isCarrier||load.driverId===currentUser.id)&&![“Paid”,“Dispute”].includes(load.status)&&(
<button onClick={()=>onAdvance(load.id)} style={btn(”#1e40af”)}>→ ADVANCE STATUS</button>
)}
{isCarrier&&load.status===“Invoiced”&&!showPay&&(
<button onClick={()=>setShowPay(true)} style={btn(”#22c55e”)}>✓ MARK PAID</button>
)}
{isCarrier&&showPay&&(
<div style={{display:“flex”,gap:6,alignItems:“center”}}>
<input type=“number” value={payAmt} onChange={e=>setPayAmt(e.target.value)} style={{…inp,width:140,border:“1px solid #22c55e”}} placeholder=“Amount received”/>
<button onClick={()=>{onMarkPaid(load.id,payAmt);setShowPay(false);}} style={btn(”#22c55e”)}>CONFIRM</button>
<button onClick={()=>setShowPay(false)} style={ghost}>✕</button>
</div>
)}
</div>
</div>

```
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
    <div>
      <Sec title="📍 LOAD DETAILS">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld l="LOAD NUMBER" value={load.loadNumber} editable={isCarrier} onChange={v=>set("loadNumber",v)}/>
          <Fld l="BROKER" value={load.broker}/>
          <Fld l="DRIVER" value={driver?.name}/>
          <Fld l="TRUCK UNIT" value={users.find(u=>u.id===load.driverId)?.truckId}/>
          <Fld l="ORIGIN" value={load.origin} editable={isCarrier} onChange={v=>set("origin",v)}/>
          <Fld l="DESTINATION" value={load.destination} editable={isCarrier} onChange={v=>set("destination",v)}/>
          <Fld l="PICKUP DATE" value={load.pickupDate} editable type="date" onChange={v=>set("pickupDate",v)}/>
          <Fld l="DELIVERY DATE" value={load.deliveryDate} editable type="date" onChange={v=>set("deliveryDate",v)}/>
          <Fld l="BROKER BILLING EMAIL" value={load.brokerContact} editable={isCarrier} onChange={v=>set("brokerContact",v)}/>
          <Fld l="NOTES" value={load.notes} editable onChange={v=>set("notes",v)}/>
        </div>
      </Sec>

      <Sec title="⛽ COMCHECK / FUEL ADVANCE">
        {load.comcheck?(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld l="COMCHECK NUMBER" value={load.comcheck.number} editable onChange={v=>setCC("number",v)}/>
            <Fld l="AMOUNT ISSUED ($)" value={load.comcheck.amount} editable type="number" onChange={v=>setCC("amount",parseFloat(v))}/>
            <Fld l="DATE ISSUED" value={load.comcheck.dateIssued} editable type="date" onChange={v=>setCC("dateIssued",v)}/>
            <Fld l="ISSUED TO" value={users.find(u=>u.id===load.comcheck.issuedTo)?.name}/>
          </div>
        ):(
          <div>
            <div style={{color:"#475569",fontSize:12,marginBottom:10}}>No ComCheck on this load.</div>
            <button onClick={()=>set("comcheck",{number:"",amount:0,dateIssued:new Date().toISOString().split("T")[0],issuedTo:load.driverId})} style={{...btn("#78350f","#fbbf24"),border:"1px solid #78350f80"}}>+ ADD COMCHECK</button>
          </div>
        )}
      </Sec>
    </div>

    <div>
      <Sec title="💵 FINANCIAL BREAKDOWN — FULLY TRANSPARENT">
        <FR l="GROSS RATE (Rate Confirmation — agreed by all)" value={fmt(load.grossRate)} color="#f1f5f9" big/>
        <FR l={`CARRIER COMMISSION — Bruce (${commPct}%)`} value={`− ${fmt(carrierCut)}`} color="#a78bfa"/>
        <FR l={`DRIVER NET PAY — ${driver?.name}`} value={fmt(driverNet)} color="#60a5fa"/>
        {load.comcheck&&<FR l="COMCHECK ADVANCE (deducted from broker invoice)" value={`− ${fmt(comcheckAmt)}`} color="#fbbf24"/>}
        {isCarrier&&<FR l="BROKER INVOICE TOTAL (gross − comcheck)" value={fmt(invoiceTotal)} color="#ec4899"/>}
        {totalExpenses>0&&<FR l="DRIVER EXPENSES (this load)" value={`− ${fmt(totalExpenses)}`} color="#f87171"/>}
        {Number(load.lumperAmount)>0&&<FR l="LUMPER FEES" value={`− ${fmt(load.lumperAmount)}`} color="#f87171"/>}
        <div style={{borderTop:"1px solid #334155",paddingTop:10,marginTop:6}}>
          <FR l="DRIVER ACTUAL PROFIT (net − all expenses)" value={fmt(driverProfit)} color="#22c55e" big/>
        </div>
        {load.status==="Paid"&&load.paidAmount&&(
          <div style={{marginTop:10,background:"#052e1620",border:"1px solid #22c55e30",borderRadius:8,padding:12}}>
            <div style={lbl}>PAYMENT RECEIVED BY CARRIER</div>
            <div style={{fontSize:20,fontWeight:900,color:"#22c55e"}}>{fmt(load.paidAmount)}</div>
            <div style={{fontSize:11,color:"#475569"}}>Date: {load.paidDate}</div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:14}}>
          <div><span style={lbl}>LUMPER FEES ($)</span><input type="number" value={load.lumperAmount||""} onChange={e=>set("lumperAmount",parseFloat(e.target.value)||0)} style={inp}/></div>
          <div><span style={lbl}>DETENTION ($)</span><input type="number" value={load.detentionAmount||""} onChange={e=>set("detentionAmount",parseFloat(e.target.value)||0)} style={inp}/></div>
        </div>
      </Sec>

      <Sec title="🧾 DRIVER EXPENSES (this load)">
        {(load.expenses||[]).map(exp=>(
          <div key={exp.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0f172a",borderRadius:7,padding:"8px 12px",marginBottom:6}}>
            <span style={{fontSize:12}}>{exp.desc}</span>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{color:"#f87171",fontWeight:700}}>{fmt(exp.amount)}</span>
              <button onClick={()=>onUpdate(load.id,{expenses:load.expenses.filter(e=>e.id!==exp.id)})} style={{background:"none",border:"none",color:"#475569",cursor:"pointer"}}>✕</button>
            </div>
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

  <div style={{...crd(),marginBottom:14}}>
    <div style={{fontSize:10,color:"#60a5fa",fontWeight:800,letterSpacing:1.5,marginBottom:14}}>📁 LOAD DOCUMENTS</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
      {DOC_SLOTS.map(slot=>{
        const hasDoc=load.docs?.[slot.key];
        return(
          <div key={slot.key} style={{background:"#0f172a",borderRadius:10,padding:14,border:`1px solid ${hasDoc?"#22c55e30":"#334155"}`}}>
            <div style={lbl}>{slot.lbl}</div>
            {hasDoc?<div style={{fontSize:12,color:"#22c55e",marginBottom:8}}>✓ {hasDoc}</div>:<div style={{fontSize:12,color:"#475569",marginBottom:8}}>Not uploaded</div>}
            <input type="file" accept="image/*,application/pdf" capture={slot.key!=="rateCon"?"environment":undefined}
              ref={el=>{if(!fileRefs.current[load.id])fileRefs.current[load.id]={};fileRefs.current[load.id][slot.key]=el;}}
              onChange={e=>uploadDoc(load.id,slot.key,e.target.files[0])} style={{display:"none"}}/>
            <button onClick={()=>fileRefs.current[load.id]?.[slot.key]?.click()} style={{...ghost,fontSize:11}}>
              📷 {hasDoc?"Replace":"Upload / Photo"}
            </button>
          </div>
        );
      })}
    </div>
    {isCarrier&&(
      <div style={{marginTop:16,background:"#0f172a",border:"1px solid #ec489940",borderRadius:10,padding:14}}>
        <div style={{fontSize:10,color:"#ec4899",letterSpacing:1.5,marginBottom:6}}>📧 SEND CARRIER INVOICE VIA ZOHO MAIL</div>
        <div style={{fontSize:11,color:"#475569",marginBottom:10}}>Attaches: ETTR Invoice + BOL + POD → {load.brokerContact||"[broker email not set]"}</div>
        <button onClick={()=>alert(`Invoice queued to ${load.brokerContact||"broker"}\n\nTo activate: add Zoho Mail API token in Admin → Integrations.`)} style={btn("#ec4899")}>📤 SEND INVOICE EMAIL</button>
        {load.invoiceSentDate&&<div style={{fontSize:11,color:"#475569",marginTop:6}}>Last sent: {load.invoiceSentDate}</div>}
      </div>
    )}
  </div>

  {isCarrier&&(
    <div style={{textAlign:"right"}}>
      <button onClick={()=>onDelete(load.id)}
        style={{background:delConfirm.id===load.id?"#7f1d1d":"#1e293b",color:delConfirm.id===load.id?"#fca5a5":"#475569",border:`1px solid ${delConfirm.id===load.id?"#ef444460":"#334155"}`,borderRadius:7,padding:"7px 16px",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700}}>
        {delConfirm.id===load.id?"⚠️ CONFIRM REMOVE LOAD?":"🗑 Remove Load"}
      </button>
      {delConfirm.id===load.id&&<button onClick={()=>setDelConfirm({id:null,step:0})} style={{...ghost,marginLeft:8}}>Cancel</button>}
    </div>
  )}
</div>
```

);
}

function CommissionSettings({users,setUsers}){
const PCT=[5,10,15,20];
const drivers=users.filter(u=>u.role!==ROLES.CARRIER_ADMIN&&!u.deleted);
const upd=(id,p)=>setUsers(users.map(u=>u.id===id?{…u,commissionPct:p}:u));

return(
<div style={{maxWidth:520}}>
<div style={{...crd({marginBottom:14})}}>
<div style={{fontSize:11,color:”#475569”}}>Set the carrier commission rate Bruce charges each driver for operating under ETTR authority. Only Bruce can change these rates. Both Bruce and the driver always see the full gross rate on every load.</div>
</div>
{drivers.map(driver=>{
const p=driver.commissionPct||0;
return(
<div key={driver.id} style={crd({marginBottom:14})}>
<div style={{fontSize:14,fontWeight:800,color:”#f1f5f9”}}>{driver.name}</div>
<div style={{fontSize:11,color:”#475569”,marginBottom:16}}>{driver.carrierRole}</div>
<div style={{fontSize:10,color:”#60a5fa”,letterSpacing:1.5,marginBottom:10}}>CARRIER COMMISSION RATE</div>
<div style={{display:“flex”,gap:8,flexWrap:“wrap”,marginBottom:12}}>
{PCT.map(pp=>(
<button key={pp} onClick={()=>upd(driver.id,pp)}
style={{padding:“8px 18px”,borderRadius:8,border:“none”,cursor:“pointer”,fontFamily:“inherit”,fontWeight:800,fontSize:13,
background:p===pp?”#1e40af”:”#0f172a”,color:p===pp?”#fff”:”#475569”,
boxShadow:p===pp?“0 0 12px #1e40af60”:“none”}}>
{pp}%
</button>
))}
</div>
<div style={{display:“flex”,gap:8,alignItems:“center”,marginBottom:14}}>
<span style={{fontSize:11,color:”#475569”}}>Custom %:</span>
<input type=“number” min=“0” max=“50” value={p} onChange={e=>upd(driver.id,parseFloat(e.target.value)||0)} style={{…inp,width:70}}/>
<span style={{fontSize:11,color:”#64748b”}}>%</span>
</div>
<div style={{background:”#0f172a”,borderRadius:8,padding:12}}>
<div style={{fontSize:10,color:”#475569”,letterSpacing:1.5,marginBottom:6}}>LIVE EXAMPLE — $2,000 LOAD</div>
<div style={{fontSize:13,color:”#a78bfa”}}>Bruce keeps: {fmt((2000*p)/100)}</div>
<div style={{fontSize:13,color:”#22c55e”}}>{driver.name.split(” “)[0]} nets: {fmt(2000-(2000*p)/100)}</div>
</div>
</div>
);
})}
</div>
);
}

function PettyCashModule({currentUser,users,pettyCash,setPettyCash,isCarrier}){
const [showAdd,setShowAdd]=useState(false);
const [ne,setNe]=useState({date:new Date().toISOString().split(“T”)[0],description:””,vendor:””,amount:””,category:“Repairs & Maintenance”,notes:””});
const [delConfirm,setDelConfirm]=useState({id:null,step:0});
const [receiptModal,setReceiptModal]=useState(null);
const fileRefs=useRef({});

const active=pettyCash.filter(p=>!p.deleted);
const totalOwed=active.filter(p=>p.status===“unpaid”).reduce((s,p)=>s+p.amount,0);
const totalPaid=active.filter(p=>p.status===“paid”).reduce((s,p)=>s+p.amount,0);

const add=()=>{
if(!ne.description||!ne.amount||isNaN(parseFloat(ne.amount)))return;
setPettyCash([…pettyCash,{id:`pc-${Date.now()}`,…ne,amount:parseFloat(ne.amount),paidBy:“Bruce”,status:“unpaid”,receiptUrl:null,receiptName:null,paidDate:null,deleted:false}]);
setNe({date:new Date().toISOString().split(“T”)[0],description:””,vendor:””,amount:””,category:“Repairs & Maintenance”,notes:””});
setShowAdd(false);
};
const markPaid=(id)=>setPettyCash(pettyCash.map(p=>p.id===id?{…p,status:“paid”,paidDate:new Date().toISOString().split(“T”)[0]}:p));
const markUnpaid=(id)=>setPettyCash(pettyCash.map(p=>p.id===id?{…p,status:“unpaid”,paidDate:null}:p));
const handleReceipt=(id,file)=>{
if(!file)return;
const url=URL.createObjectURL(file);
setPettyCash(pettyCash.map(p=>p.id===id?{…p,receiptUrl:url,receiptName:file.name}:p));
};
const softDel=(id)=>{
if(delConfirm.id===id&&delConfirm.step===1){setPettyCash(pettyCash.map(p=>p.id===id?{…p,deleted:true}:p));setDelConfirm({id:null,step:0});}
else setDelConfirm({id,step:1});
};

return(
<div>
<div style={{fontSize:20,fontWeight:900,color:”#fff”,marginBottom:20}}>💼 Petty Cash Ledger</div>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr 1fr”,gap:14,marginBottom:24}}>
{[{l:“TOTAL OWED TO BRUCE”,v:fmt(totalOwed),c:”#ef4444”},{l:“TOTAL PAID BACK”,v:fmt(totalPaid),c:”#22c55e”},{l:“OPEN ITEMS”,v:active.filter(p=>p.status===“unpaid”).length,c:”#f59e0b”}]
.map(c=><div key={c.l} style={crd()}><div style={{fontSize:9,color:”#64748b”,letterSpacing:1.5,marginBottom:4}}>{c.l}</div><div style={{fontSize:22,fontWeight:900,color:c.c}}>{c.v}</div></div>)}
</div>
<button onClick={()=>setShowAdd(!showAdd)} style={{…btn(),marginBottom:18}}>{showAdd?“✕ Cancel”:”+ Add Expense Bruce Covered”}</button>
{showAdd&&(
<div style={{…crd({marginBottom:20,borderColor:”#1e40af”})}}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
{[{l:“DATE”,k:“date”,type:“date”},{l:“AMOUNT ($)”,k:“amount”,type:“number”,ph:“0.00”},{l:“DESCRIPTION”,k:“description”,ph:“What was it for?”},{l:“VENDOR / WHERE”,k:“vendor”,ph:“Shop, city”}]
.map(f=><div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} placeholder={f.ph} value={ne[f.k]||””} onChange={e=>setNe({…ne,[f.k]:e.target.value})} style={inp}/></div>)}
<div><span style={lbl}>CATEGORY</span><select value={ne.category} onChange={e=>setNe({…ne,category:e.target.value})} style={inp}>{PETTY_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
<div><span style={lbl}>NOTES</span><input value={ne.notes} onChange={e=>setNe({…ne,notes:e.target.value})} style={inp}/></div>
</div>
<button onClick={add} style={{…btn(”#22c55e”),marginTop:14}}>✓ Save Entry</button>
</div>
)}
<div style={{display:“flex”,flexDirection:“column”,gap:12}}>
{active.map(entry=>(
<div key={entry.id} style={{…crd({borderColor:entry.status===“paid”?”#22c55e30”:”#ef444430”,opacity:entry.status===“paid”?0.8:1})}}>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“flex-start”,flexWrap:“wrap”,gap:8}}>
<div style={{flex:1}}>
<div style={{display:“flex”,gap:8,flexWrap:“wrap”,marginBottom:4,alignItems:“center”}}>
<span style={{background:entry.status===“paid”?”#22c55e20”:”#ef444420”,color:entry.status===“paid”?”#22c55e”:”#ef4444”,border:`1px solid ${entry.status==="paid"?"#22c55e40":"#ef444440"}`,borderRadius:5,padding:“2px 9px”,fontSize:10,fontWeight:800}}>
{entry.status===“paid”?“✓ PAID”:“OWED”}
</span>
<span style={{fontSize:11,color:”#64748b”}}>{entry.date}</span>
<span style={{fontSize:10,background:”#1e40af20”,color:”#93c5fd”,border:“1px solid #1e40af30”,borderRadius:4,padding:“1px 7px”}}>{entry.category}</span>
</div>
<div style={{fontSize:15,fontWeight:800,color:”#f1f5f9”}}>{entry.description}</div>
{entry.vendor&&<div style={{fontSize:12,color:”#64748b”}}>📍 {entry.vendor}</div>}
{entry.notes&&<div style={{fontSize:11,color:”#475569”,marginTop:2}}>{entry.notes}</div>}
</div>
<div style={{textAlign:“right”}}>
<div style={{fontSize:24,fontWeight:900,color:entry.status===“paid”?”#22c55e”:”#ef4444”}}>{fmt(entry.amount)}</div>
{entry.paidDate&&<div style={{fontSize:10,color:”#64748b”}}>Paid: {entry.paidDate}</div>}
</div>
</div>
<div style={{display:“flex”,gap:8,marginTop:14,flexWrap:“wrap”,alignItems:“center”}}>
<input type=“file” accept=“image/*,application/pdf” capture=“environment”
ref={el=>{fileRefs.current[entry.id]=el;}}
onChange={e=>handleReceipt(entry.id,e.target.files[0])} style={{display:“none”}}/>
<button onClick={()=>fileRefs.current[entry.id]?.click()} style={ghost}>📷 {entry.receiptName?“Replace Receipt”:“Upload / Photo”}</button>
{entry.receiptUrl&&<button onClick={()=>setReceiptModal(entry)} style={{…ghost,color:”#93c5fd”,borderColor:”#1e40af”}}>👁 View</button>}
{isCarrier&&entry.status===“unpaid”&&<button onClick={()=>markPaid(entry.id)} style={btn(”#22c55e”)}>✓ MARK PAID</button>}
{isCarrier&&entry.status===“paid”&&<button onClick={()=>markUnpaid(entry.id)} style={ghost}>↩ Unmark</button>}
{!isCarrier&&entry.status===“unpaid”&&entry.receiptUrl&&<button onClick={()=>markPaid(entry.id)} style={btn(”#22c55e”)}>✓ Mark Paid (Receipt Attached)</button>}
<button onClick={()=>softDel(entry.id)}
style={{background:delConfirm.id===entry.id?”#7f1d1d”:“transparent”,color:delConfirm.id===entry.id?”#fca5a5”:”#475569”,border:`1px solid ${delConfirm.id===entry.id?"#ef444450":"#334155"}`,borderRadius:7,padding:“7px 12px”,cursor:“pointer”,fontFamily:“inherit”,fontSize:11,fontWeight:700}}>
{delConfirm.id===entry.id?“⚠️ Confirm Remove?”:“🗑 Remove”}
</button>
</div>
</div>
))}
</div>
{receiptModal&&(
<div onClick={()=>setReceiptModal(null)} style={{position:“fixed”,inset:0,background:”#000000cc”,display:“flex”,alignItems:“center”,justifyContent:“center”,zIndex:999}}>
<div onClick={e=>e.stopPropagation()} style={{…crd({maxWidth:600,width:“90%”})}}>
<div style={{display:“flex”,justifyContent:“space-between”,marginBottom:12}}>
<div style={{fontSize:12,fontWeight:800,color:”#93c5fd”}}>RECEIPT: {receiptModal.description}</div>
<button onClick={()=>setReceiptModal(null)} style={{background:“none”,border:“none”,color:”#64748b”,cursor:“pointer”,fontSize:18}}>✕</button>
</div>
<img src={receiptModal.receiptUrl} alt=“Receipt” style={{width:“100%”,borderRadius:8,maxHeight:480,objectFit:“contain”}}/>
<div style={{fontSize:11,color:”#64748b”,marginTop:6}}>{receiptModal.receiptName}</div>
</div>
</div>
)}
</div>
);
}

function ProfileModule({currentUser,users,setUsers}){
const [form,setForm]=useState({…currentUser});
const [saved,setSaved]=useState(false);
const save=()=>{setUsers(users.map(u=>u.id===currentUser.id?{…u,…form}:u));setSaved(true);setTimeout(()=>setSaved(false),2000);};
const F=({l,k,type=“text”,ph})=><div><span style={lbl}>{l}</span><input type={type} placeholder={ph} value={form[k]||””} onChange={e=>setForm({…form,[k]:e.target.value})} style={inp}/></div>;
return(
<div style={{maxWidth:680}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”,marginBottom:20}}>👤 My Profile</div>
<div style={crd()}>
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

function TruckModule({currentUser,trucks,setTrucks}){
const myTruck=trucks.find(t=>t.driverId===currentUser.id)||trucks[0];
const [form,setForm]=useState({…myTruck});
const [saved,setSaved]=useState(false);
const save=()=>{setTrucks(trucks.map(t=>t.id===form.id?{…form}:t));setSaved(true);setTimeout(()=>setSaved(false),2000);};
const F=({l,k,type=“text”,nest})=>(
<div><span style={lbl}>{l}</span>
<input type={type} value={nest?(form[nest]?.[k]||””):(form[k]||””)}
onChange={e=>nest?setForm({…form,[nest]:{…form[nest],[k]:e.target.value}}):setForm({…form,[k]:e.target.value})} style={inp}/>
</div>
);
return(
<div style={{maxWidth:720}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”,marginBottom:20}}>🚛 Truck — {form.unit||form.make}</div>
<div style={crd()}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:14}}>
<F l="MAKE" k="make"/><F l="MODEL" k="model"/>
<F l="YEAR" k="year" type="number"/><F l="COLOR" k="color"/>
<F l="UNIT #" k="unit"/><F l="VIN" k="vin"/>
<F l="LICENSE PLATE" k="licensePlate"/><F l="STATE REG" k="stateReg"/>
<F l="MILEAGE" k="mileage" type="number"/><F l="ELD PROVIDER" k="eldProvider"/>
</div>
<div style={{marginTop:18,borderTop:“1px solid #334155”,paddingTop:14}}>
<div style={{fontSize:10,color:”#60a5fa”,letterSpacing:1.5,marginBottom:12}}>TIRES</div>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
<F l="BRAND" k="brand" nest="tires"/><F l="SIZE" k="size" nest="tires"/>
<F l="FRONT TREAD" k="frontTread" nest="tires"/><F l="REAR TREAD" k="rearTread" nest="tires"/>
</div>
</div>
<div style={{marginTop:14,borderTop:“1px solid #334155”,paddingTop:14}}>
<div style={{fontSize:10,color:”#60a5fa”,letterSpacing:1.5,marginBottom:12}}>BRAKES</div>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
<F l="TYPE" k="type" nest="brakes"/><F l="BRAND" k="brand" nest="brakes"/>
<F l="LAST INSPECTED" k="lastInspected" type="date" nest="brakes"/>
<F l="LAST REPLACED" k="lastReplaced" type="date" nest="brakes"/>
</div>
</div>
<button onClick={save} style={{...btn(),marginTop:18}}>{saved?“✓ Saved!”:“Save Truck”}</button>
</div>
</div>
);
}

function TrailersModule({currentUser,trailers,setTrailers,isCarrier}){
const [showAdd,setShowAdd]=useState(false);
const [nt,setNt]=useState({unit:””,make:””,year:””,vin:””,plate:””,type:“Dry Van”,notes:””});
const add=()=>{setTrailers([…trailers,{id:`trailer-${Date.now()}`,…nt,deleted:false}]);setNt({unit:””,make:””,year:””,vin:””,plate:””,type:“Dry Van”,notes:””});setShowAdd(false);};
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”}}>Trailers</div>
{isCarrier&&<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>{showAdd?“✕ Cancel”:”+ Add Trailer”}</button>}
</div>
{showAdd&&(
<div style={{…crd({marginBottom:18,borderColor:”#1e40af”})}}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
{[{l:“UNIT #”,k:“unit”},{l:“MAKE”,k:“make”},{l:“YEAR”,k:“year”,type:“number”},{l:“VIN”,k:“vin”},{l:“PLATE”,k:“plate”},{l:“NOTES”,k:“notes”}]
.map(f=><div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} value={nt[f.k]} onChange={e=>setNt({…nt,[f.k]:e.target.value})} style={inp}/></div>)}
<div><span style={lbl}>TYPE</span><select value={nt.type} onChange={e=>setNt({…nt,type:e.target.value})} style={inp}>
{[“Dry Van”,“Reefer”,“Flatbed”,“Step Deck”,“Lowboy”,“Tanker”,“Other”].map(t=><option key={t}>{t}</option>)}
</select></div>
</div>
<button onClick={add} style={{...btn(),marginTop:14}}>✓ Save Trailer</button>
</div>
)}
<div style={{display:“flex”,flexDirection:“column”,gap:10}}>
{trailers.filter(t=>!t.deleted).map(t=>(
<div key={t.id} style={crd()}>
<div style={{fontSize:14,fontWeight:800,color:”#f1f5f9”}}>{t.unit} — {t.make} {t.year}</div>
<div style={{fontSize:11,color:”#475569”}}>{t.type} · VIN: {t.vin||”—”} · Plate: {t.plate||”—”}</div>
{t.notes&&<div style={{fontSize:11,color:”#475569”,marginTop:4}}>{t.notes}</div>}
</div>
))}
{trailers.filter(t=>!t.deleted).length===0&&<div style={{…crd(),textAlign:“center”,color:”#334155”,padding:40}}>No trailers added yet.</div>}
</div>
</div>
);
}

function ServiceModule({currentUser,serviceRecords,setServiceRecords,trucks,isCarrier}){
const [showAdd,setShowAdd]=useState(false);
const [nr,setNr]=useState({date:new Date().toISOString().split(“T”)[0],truckId:trucks[0]?.id||””,type:“Oil Change”,vendor:””,cost:””,mileage:””,notes:””,nextDueDate:””,nextDueMileage:””});
const add=()=>{setServiceRecords([…serviceRecords,{id:`svc-${Date.now()}`,…nr,cost:parseFloat(nr.cost)||0,deleted:false}]);setShowAdd(false);};
const SVC=[“Oil Change”,“Tire Rotation”,“Brake Service”,“PM Inspection”,“DOT Inspection”,“Alignment”,“Engine Repair”,“Transmission”,“Electrical”,“Other”];
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”}}>🔧 Service Records</div>
<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>{showAdd?“✕ Cancel”:”+ Add Record”}</button>
</div>
{showAdd&&(
<div style={{…crd({marginBottom:18,borderColor:”#1e40af”})}}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
<div><span style={lbl}>TRUCK</span><select value={nr.truckId} onChange={e=>setNr({…nr,truckId:e.target.value})} style={inp}>{trucks.map(t=><option key={t.id} value={t.id}>{t.unit||t.make} {t.model}</option>)}</select></div>
<div><span style={lbl}>TYPE</span><select value={nr.type} onChange={e=>setNr({…nr,type:e.target.value})} style={inp}>{SVC.map(s=><option key={s}>{s}</option>)}</select></div>
{[{l:“DATE”,k:“date”,type:“date”},{l:“VENDOR”,k:“vendor”},{l:“COST ($)”,k:“cost”,type:“number”},{l:“MILEAGE”,k:“mileage”,type:“number”},{l:“NEXT DUE DATE”,k:“nextDueDate”,type:“date”},{l:“NEXT DUE MILEAGE”,k:“nextDueMileage”,type:“number”}]
.map(f=><div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} value={nr[f.k]} onChange={e=>setNr({…nr,[f.k]:e.target.value})} style={inp}/></div>)}
<div style={{gridColumn:“span 2”}}><span style={lbl}>NOTES</span><input value={nr.notes} onChange={e=>setNr({…nr,notes:e.target.value})} style={inp}/></div>
</div>
<button onClick={add} style={{...btn(),marginTop:14}}>✓ Save Record</button>
</div>
)}
<div style={{display:“flex”,flexDirection:“column”,gap:10}}>
{serviceRecords.filter(r=>!r.deleted&&(isCarrier||trucks.find(t=>t.id===r.truckId)?.driverId===currentUser.id)).map(rec=>{
const truck=trucks.find(t=>t.id===rec.truckId);
return(
<div key={rec.id} style={crd()}>
<div style={{display:“flex”,justifyContent:“space-between”}}>
<div>
<div style={{fontSize:14,fontWeight:800,color:”#f1f5f9”}}>{rec.type}</div>
<div style={{fontSize:11,color:”#475569”}}>{truck?.unit||truck?.make} · {rec.date} · {rec.vendor}</div>
{rec.notes&&<div style={{fontSize:11,color:”#475569”,marginTop:2}}>{rec.notes}</div>}
</div>
<div style={{textAlign:“right”}}>
<div style={{fontSize:16,fontWeight:800,color:”#f1f5f9”}}>{fmt(rec.cost)}</div>
{rec.nextDueDate&&<div style={{fontSize:10,color:”#f59e0b”}}>Next: {rec.nextDueDate}</div>}
</div>
</div>
</div>
);
})}
{serviceRecords.filter(r=>!r.deleted).length===0&&<div style={{…crd(),textAlign:“center”,color:”#334155”,padding:40}}>No service records yet.</div>}
</div>
</div>
);
}

function DocumentsModule({currentUser,documents,setDocuments,isCarrier}){
const [showAdd,setShowAdd]=useState(false);
const [nd,setNd]=useState({name:””,type:“CDL”,expiry:””,notes:””});
const add=()=>{setDocuments([…documents,{id:`doc-${Date.now()}`,…nd,uploadDate:new Date().toISOString().split(“T”)[0],fileName:null,driverId:currentUser.id,deleted:false}]);setShowAdd(false);};
const DTYPES=[“CDL”,“Medical Examiner Certificate”,“Form 2290 (HVUT)”,“IFTA License”,“Operating Authority”,“COI (Insurance)”,“W-9”,“Annual Inspection Report”,“Plate Registration”,“Other”];
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20}}>
<div style={{fontSize:20,fontWeight:900,color:”#fff”}}>📄 Documents</div>
<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>{showAdd?“✕ Cancel”:”+ Add Document”}</button>
</div>
{showAdd&&(
<div style={{…crd({marginBottom:18,borderColor:”#1e40af”})}}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
<div><span style={lbl}>TYPE</span><select value={nd.type} onChange={e=>setNd({…nd,type:e.target.value})} style={inp}>{DTYPES.map(d=><option key={d}>{d}</option>)}</select></div>
<div><span style={lbl}>DOCUMENT NAME</span><input value={nd.name} onChange={e=>setNd({…nd,name:e.target.value})} style={inp}/></div>
<div><span style={lbl}>EXPIRY</span><input type=“date” value={nd.expiry} onChange={e=>setNd({…nd,expiry:e.target.value})} style={inp}/></div>
<div><span style={lbl}>NOTES</span><input value={nd.notes} onChange={e=>setNd({…nd,notes:e.target.value})} style={inp}/></div>
</div>
<button onClick={add} style={{...btn(),marginTop:14}}>✓ Save Document</button>
</div>
)}
<div style={{display:“flex”,flexDirection:“column”,gap:10}}>
{documents.filter(d=>!d.deleted&&(isCarrier||d.driverId===currentUser.id)).map(doc=>{
const expiring=doc.expiry&&new Date(doc.expiry)<new Date(Date.now()+30*86400000);
return(
<div key={doc.id} style={{…crd({borderColor:expiring?”#f59e0b40”:”#334155”})}}>
<div style={{display:“flex”,justifyContent:“space-between”}}>
<div>
<div style={{fontSize:14,fontWeight:800,color:”#f1f5f9”}}>{doc.name||doc.type}</div>
<div style={{fontSize:11,color:”#475569”}}>{doc.type} · {doc.uploadDate}</div>
{doc.notes&&<div style={{fontSize:11,color:”#475569”}}>{doc.notes}</div>}
</div>
{doc.expiry&&<div style={{textAlign:“right”}}><div style={{fontSize:11,color:expiring?”#f59e0b”:”#64748b”}}>Expires: {doc.expiry}</div>{expiring&&<div style={{fontSize:10,color:”#f59e0b”}}>⚠ Expiring soon</div>}</div>}
</div>
</div>
);
})}
{documents.filter(d=>!d.deleted).length===0&&<div style={{…crd(),textAlign:“center”,color:”#334155”,padding:40}}>No documents yet.</div>}
</div>
</div>
);
}

function FuelModule({currentUser,trucks}){
const [entries,setEntries]=useState([]);
const [showAdd,setShowAdd]=useState(false);
const [nf,setNf]=useState({date:new Date().toISOString().split(“T”)[0],state:“IL”,gallons:””,ppg:””,truckId:trucks[0]?.id||””,location:””,notes:””});
const add=()=>{
setEntries([…entries,{id:`fuel-${Date.now()}`,…nf,gallons:parseFloat(nf.gallons),ppg:parseFloat(nf.ppg),total:parseFloat(nf.gallons)*parseFloat(nf.ppg)}]);
setShowAdd(false);
};
const STATES=[“AL”,“AK”,“AZ”,“AR”,“CA”,“CO”,“CT”,“DE”,“FL”,“GA”,“HI”,“ID”,“IL”,“IN”,“IA”,“KS”,“KY”,“LA”,“ME”,“MD”,“MA”,“MI”,“MN”,“MS”,“MO”,“MT”,“NE”,“NV”,“NH”,“NJ”,“NM”,“NY”,“NC”,“ND”,“OH”,“OK”,“OR”,“PA”,“RI”,“SC”,“SD”,“TN”,“TX”,“UT”,“VT”,“VA”,“WA”,“WV”,“WI”,“WY”];
return(
<div>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:20}}>
<div>
<div style={{fontSize:20,fontWeight:900,color:”#fff”}}>⛽ Fuel Log</div>
<a href=“https://www.nastc.com/fuel-network/” target=”_blank” rel=“noreferrer” style={{fontSize:11,color:”#60a5fa”}}>NASTC Fuel Network ↗</a>
</div>
<button onClick={()=>setShowAdd(!showAdd)} style={btn()}>{showAdd?“✕ Cancel”:”+ Log Fuel”}</button>
</div>
{showAdd&&(
<div style={{…crd({marginBottom:18,borderColor:”#1e40af”})}}>
<div style={{display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
<div><span style={lbl}>DATE</span><input type=“date” value={nf.date} onChange={e=>setNf({…nf,date:e.target.value})} style={inp}/></div>
<div><span style={lbl}>STATE (IFTA)</span><select value={nf.state} onChange={e=>setNf({…nf,state:e.target.value})} style={inp}>{STATES.map(s=><option key={s}>{s}</option>)}</select></div>
{[{l:“GALLONS”,k:“gallons”,type:“number”},{l:“PRICE/GAL ($)”,k:“ppg”,type:“number”},{l:“LOCATION / TRUCK STOP”,k:“location”},{l:“NOTES”,k:“notes”}]
.map(f=><div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} value={nf[f.k]} onChange={e=>setNf({…nf,[f.k]:e.target.value})} style={inp}/></div>)}
</div>
<div style={{marginTop:10,fontSize:13,color:”#60a5fa”,fontWeight:700}}>Total: {fmt((parseFloat(nf.gallons)||0)*(parseFloat(nf.ppg)||0))}</div>
<button onClick={add} style={{...btn(),marginTop:12}}>✓ Save Fuel Entry</button>
</div>
)}
<div style={{display:“flex”,flexDirection:“column”,gap:10}}>
{entries.map(e=>(
<div key={e.id} style={crd()}>
<div style={{display:“flex”,justifyContent:“space-between”}}>
<div>
<div style={{fontSize:14,fontWeight:800,color:”#f1f5f9”}}>{e.state} — {e.gallons} gal @ ${e.ppg}/gal</div>
<div style={{fontSize:11,color:”#475569”}}>{e.date} · {e.location}</div>
</div>
<div style={{fontSize:18,fontWeight:900,color:”#60a5fa”}}>{fmt(e.total)}</div>
</div>
</div>
))}
{entries.length===0&&<div style={{…crd(),textAlign:“center”,color:”#334155”,padding:40}}>No fuel entries yet. FleetOne/WEX API integration pending — connect credentials in Admin.</div>}
</div>
</div>
);
}

function ReportsModule({currentUser,loads,pettyCash,serviceRecords,users,isCarrier}){
const [period,setPeriod]=useState(“monthly”);
const [dFilter,setDFilter]=useState(“all”);
const myLoads=isCarrier?(dFilter===“all”?loads:loads.filter(l=>l.driverId===dFilter)).filter(l=>!l.deleted):loads.filter(l=>!l.deleted&&l.driverId===currentUser.id);
const gross=myLoads.reduce((s,l)=>s+l.grossRate,0);
const cut=myLoads.reduce((s,l)=>s+calcLoad(l,users).carrierCut,0);
const dNet=myLoads.reduce((s,l)=>s+calcLoad(l,users).driverNet,0);
const collected=myLoads.filter(l=>l.status===“Paid”).reduce((s,l)=>s+(l.paidAmount||l.grossRate),0);
const outstanding=myLoads.filter(l=>l.status===“Invoiced”).reduce((s,l)=>s+l.grossRate,0);
const pcOwed=pettyCash.filter(p=>!p.deleted&&p.status===“unpaid”).reduce((s,p)=>s+p.amount,0);
const svc=serviceRecords.filter(r=>!r.deleted).reduce((s,r)=>s+(r.cost||0),0);
return(
<div>
<div style={{fontSize:20,fontWeight:900,color:”#fff”,marginBottom:20}}>📊 Reports</div>
<div style={{display:“flex”,gap:8,marginBottom:20,flexWrap:“wrap”}}>
{[“daily”,“weekly”,“monthly”,“yearly”].map(p=>(
<button key={p} onClick={()=>setPeriod(p)} style={{padding:“7px 16px”,borderRadius:7,border:“none”,cursor:“pointer”,fontFamily:“inherit”,fontWeight:800,fontSize:12,background:period===p?”#1e40af”:”#1e293b”,color:period===p?”#fff”:”#475569”}}>{p.toUpperCase()}</button>
))}
{isCarrier&&<select value={dFilter} onChange={e=>setDFilter(e.target.value)} style={{…inp,width:“auto”}}>
<option value="all">All Drivers</option>
{users.filter(u=>!u.deleted).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
</select>}
</div>
<div style={{display:“grid”,gridTemplateColumns:“repeat(3,1fr)”,gap:14}}>
{[
{l:“GROSS REVENUE”,v:fmt(gross),c:”#60a5fa”},
…(isCarrier?[{l:“CARRIER COMMISSION”,v:fmt(cut),c:”#a78bfa”}]:[]),
{l:“DRIVER NET PAY”,v:fmt(dNet),c:”#22c55e”},
{l:“COLLECTED (PAID)”,v:fmt(collected),c:”#22c55e”},
{l:“OUTSTANDING”,v:fmt(outstanding),c:”#f59e0b”},
{l:“TOTAL LOADS”,v:myLoads.length,c:”#60a5fa”},
{l:“PETTY CASH OWED”,v:fmt(pcOwed),c:”#ef4444”},
{l:“MAINTENANCE COSTS”,v:fmt(svc),c:”#f87171”},
{l:“LOADS PAID”,v:myLoads.filter(l=>l.status===“Paid”).length,c:”#22c55e”},
].map(c=><div key={c.l} style={crd()}><div style={{fontSize:9,color:”#64748b”,letterSpacing:1.5,marginBottom:4}}>{c.l}</div><div style={{fontSize:22,fontWeight:900,color:c.c}}>{c.v}</div></div>)}
</div>
{isCarrier&&(
<div style={{...crd({marginTop:20})}}>
<div style={{fontSize:10,color:”#60a5fa”,fontWeight:800,letterSpacing:1.5,marginBottom:14}}>PER-DRIVER BREAKDOWN</div>
{users.filter(u=>!u.deleted).map(driver=>{
const dl=loads.filter(l=>!l.deleted&&l.driverId===driver.id);
const dg=dl.reduce((s,l)=>s+l.grossRate,0);
const dc=dl.reduce((s,l)=>s+calcLoad(l,users).carrierCut,0);
const dn=dl.reduce((s,l)=>s+calcLoad(l,users).driverNet,0);
return(
<div key={driver.id} style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,padding:“12px 0”,borderBottom:“1px solid #1e293b”}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:”#f1f5f9”}}>{driver.name}</div>
<div style={{fontSize:11,color:”#475569”}}>{dl.length} loads · {driver.commissionPct}% carrier commission</div>
</div>
<div style={{textAlign:“right”,display:“grid”,gridTemplateColumns:“1fr 1fr 1fr”,gap:20}}>
<div><div style={{fontSize:9,color:”#64748b”}}>GROSS</div><div style={{fontSize:14,fontWeight:800,color:”#60a5fa”}}>{fmt(dg)}</div></div>
<div><div style={{fontSize:9,color:”#64748b”}}>CARRIER CUT</div><div style={{fontSize:14,fontWeight:800,color:”#a78bfa”}}>{fmt(dc)}</div></div>
<div><div style={{fontSize:9,color:”#64748b”}}>DRIVER NET</div><div style={{fontSize:14,fontWeight:800,color:”#22c55e”}}>{fmt(dn)}</div></div>
</div>
</div>
);
})}
</div>
)}
</div>
);
}

function AdminModule({currentUser,users,setUsers,trucks,setTrucks}){
const [showAdd,setShowAdd]=useState(false);
const [nu,setNu]=useState({name:””,email:””,phone:””,password:“ettr2024”,role:ROLES.DRIVER,carrierRole:“Driver”,commissionPct:20});
const add=()=>{
if(!nu.name||!nu.email)return;
setUsers([…users,{id:`user-${Date.now()}`,…nu,truckId:null,cdl:””,cdlState:””,cdlExpiry:””,medCardExpiry:””,hireDate:””,address:””,emergencyContact:””,emergencyPhone:””,deleted:false}]);
setShowAdd(false);
};
return(
<div>
<div style={{fontSize:20,fontWeight:900,color:”#fff”,marginBottom:20}}>🛡️ Carrier Admin</div>
<div style={{...crd({marginBottom:16})}}>
<div style={{fontSize:10,color:”#60a5fa”,fontWeight:800,letterSpacing:1.5,marginBottom:14}}>USERS & DRIVERS</div>
{users.filter(u=>!u.deleted).map(u=>(
<div key={u.id} style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,padding:“10px 0”,borderBottom:“1px solid #1e293b”}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:”#f1f5f9”}}>{u.name}</div>
<div style={{fontSize:11,color:”#475569”}}>{u.email} · {u.carrierRole} · Commission: {u.commissionPct}%</div>
</div>
<span style={{fontSize:10,background:”#1e40af20”,color:”#93c5fd”,border:“1px solid #1e40af30”,borderRadius:4,padding:“2px 8px”}}>{u.role}</span>
</div>
))}
<button onClick={()=>setShowAdd(!showAdd)} style={{…btn(),marginTop:16}}>{showAdd?“✕ Cancel”:”+ Add Driver”}</button>
{showAdd&&(
<div style={{marginTop:16,display:“grid”,gridTemplateColumns:“1fr 1fr”,gap:12}}>
{[{l:“NAME”,k:“name”},{l:“EMAIL”,k:“email”,type:“email”},{l:“PHONE”,k:“phone”},{l:“PASSWORD”,k:“password”},{l:“CARRIER ROLE”,k:“carrierRole”}]
.map(f=><div key={f.k}><span style={lbl}>{f.l}</span><input type={f.type||“text”} value={nu[f.k]||””} onChange={e=>setNu({…nu,[f.k]:e.target.value})} style={inp}/></div>)}
<div><span style={lbl}>COMMISSION %</span><input type=“number” min=“0” max=“50” value={nu.commissionPct} onChange={e=>setNu({…nu,commissionPct:parseFloat(e.target.value)||0})} style={inp}/></div>
<button onClick={add} style={{…btn(),marginTop:10,gridColumn:“span 2”}}>✓ Save Driver</button>
</div>
)}
</div>
<div style={crd()}>
<div style={{fontSize:10,color:”#60a5fa”,fontWeight:800,letterSpacing:1.5,marginBottom:10}}>INTEGRATIONS</div>
<div style={{display:“flex”,flexDirection:“column”,gap:10}}>
{[
{name:“Zoho Mail API”,desc:“Send carrier invoices and BOL packages to brokers”,status:“Not Connected”},
{name:“FleetOne / WEX Fuel API”,desc:“Auto-import fuel transactions per truck for IFTA reporting”,status:“Not Connected”},
{name:“BlueInk Tech ELD”,desc:“Driver HOS log integration”,status:“Active”},
].map(i=>(
<div key={i.name} style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,background:”#0f172a”,borderRadius:8,padding:“12px 14px”}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:”#f1f5f9”}}>{i.name}</div>
<div style={{fontSize:11,color:”#475569”}}>{i.desc}</div>
</div>
<span style={{fontSize:10,background:i.status===“Active”?”#22c55e20”:”#334155”,color:i.status===“Active”?”#22c55e”:”#64748b”,border:`1px solid ${i.status==="Active"?"#22c55e40":"#334155"}`,borderRadius:4,padding:“2px 10px”,fontWeight:700}}>{i.status}</span>
</div>
))}
</div>
</div>
</div>
);
}
