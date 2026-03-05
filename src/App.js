import { useState, useEffect, useRef, useCallback } from “react”;
import {
Truck, User, FileText, DollarSign, Fuel, Settings, BarChart2,
Package, Wrench, Shield, LogOut, Plus, Check, Upload,
AlertCircle, Clock, MapPin, Phone, Mail, Calendar, Receipt,
Edit, Trash2, Search, Download, Send, Home, Lock,
Eye, EyeOff, X, Menu, ChevronDown, CheckCircle,
Image, List, TrendingUp, Layers, Database, Filter,
ChevronRight, Star, RefreshCw, Bell, ExternalLink,
Camera, CreditCard, ArrowRight, Zap, Award, MoreVertical,
Hash, Clipboard, AlertTriangle, Info
} from “lucide-react”;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ROLES = { DEVELOPER:‘developer’, CARRIER_ADMIN:‘carrier_admin’, DRIVER:‘driver’, ACCOUNTANT:‘accountant’ };

const INITIAL_TRUCKS = [
{ id:‘pete_777’, driverId:‘tim_smith’, make:‘Peterbilt’, model:‘579’, year:2013, color:‘White’,
unit:’#777’, vin:‘1XP-BDP9X-3-ED234685’, plate:’’, dotNumber:’’, mileage:996058.7,
licensePlate:’’, stateReg:‘IL’, eldProvider:‘BlueInk Tech’,
tires:{ brand:’’, size:’’, frontTread:’’, rearTread:’’, lastReplaced:’’ },
brakes:{ type:‘Air Disc’, brand:’’, lastInspected:’’, lastReplaced:’’ },
reefer:{ hasReefer:false, brand:’’, model:’’, serial:’’, lastService:’’ }, notes:’’ },
{ id:‘kw_bruce’, driverId:‘bruce_edgerton’, make:‘Kenworth’, model:‘T680’, year:null,
color:‘Blue’, unit:’’, vin:’’, plate:’’, dotNumber:‘US DOT 1978980’, mileage:0,
licensePlate:’’, stateReg:‘WI’, eldProvider:’’,
tires:{ brand:’’, size:’’, frontTread:’’, rearTread:’’, lastReplaced:’’ },
brakes:{ type:‘Air Drum’, brand:’’, lastInspected:’’, lastReplaced:’’ },
reefer:{ hasReefer:false, brand:’’, model:’’, serial:’’, lastService:’’ }, notes:’’ }
];

const INITIAL_USERS = [
{ id:‘tim_smith’, name:‘Tim Smith’, email:‘tim@ettr.com’, phone:‘618-974-8695’,
password:‘ettr2024’, role:ROLES.DEVELOPER, carrierRole:‘Lease Operator’,
cdl:’’, cdlState:‘IL’, cdlExpiry:’’, medCardExpiry:’’, hireDate:’’,
address:’’, emergencyContact:’’, emergencyPhone:’’, truckId:‘pete_777’, deleted:false },
{ id:‘bruce_edgerton’, name:‘Bruce Edgerton’, email:‘bruce@ettr.com’, phone:’’,
password:‘ettr2024’, role:ROLES.CARRIER_ADMIN, carrierRole:‘Owner Operator’,
cdl:’’, cdlState:‘WI’, cdlExpiry:’’, medCardExpiry:’’, hireDate:’’,
address:‘Bonduel, WI’, emergencyContact:’’, emergencyPhone:’’, truckId:‘kw_bruce’, deleted:false }
];

const INITIAL_PETTY_CASH = [
{ id:‘pc_mike001’,
description:“Mike’s Inc - Truck #777 Major Repairs (Invoice #097919)”,
amount:15477.45,
date:‘2026-01-30’,
category:‘Repairs’,
notes:‘Full overhaul — kingpins, air springs, torque rods, radiator, trans cooler, shocks, DOT inspection, wheel seals, exhaust, power steering res, window switch, mudflaps, fender quarters, ABS harness. Unit now passes DOT.’,
addedBy:‘bruce_edgerton’,
forDriver:‘tim_smith’,
paid:false,
paidDate:null,
paidMethod:null,
receiptImage:null,
receiptName:null,
markedPaidByBruce:false,
deleted:false }
];

const CARRIER = { name:‘Edgerton Truck & Trailer Repair’, abbr:‘ETTR’,
dot:‘US DOT 1978980’, mc:‘VIN 234685’, address:‘Bonduel, WI’, phone:’’, email:’’, fein:’’ };

const EXPENSE_CATS = [‘Fuel’,‘Supplies’,‘Parts’,‘Repairs’,‘Meals’,‘Tolls’,‘Lodging’,‘Scale Fees’,‘Lumper’,‘Permits’,‘Tools’,‘Insurance’,‘Registration’,‘Other’];
const LOAD_STATUSES = [‘Searching’,‘Rate Pending’,‘Confirmed’,‘Dispatched’,‘In Transit’,‘Delivered’,‘Billing’,‘Paid’,‘Cancelled’];
const STATUS_COLORS = { ‘Searching’:‘bg-slate-600’,‘Rate Pending’:‘bg-yellow-600’,‘Confirmed’:‘bg-blue-600’,‘Dispatched’:‘bg-blue-500’,‘In Transit’:‘bg-indigo-500’,‘Delivered’:‘bg-green-600’,‘Billing’:‘bg-orange-500’,‘Paid’:‘bg-emerald-600’,‘Cancelled’:‘bg-red-600’ };
const DOC_TYPES = [‘IFTA Certificate’,‘Form 2290 (HVUT)’,‘W-9’,‘Operating Authority’,‘Certificate of Insurance’,‘License Plate Registration’,‘CDL Copy’,‘Medical Examiner Certificate’,‘Drug & Alcohol Test’,‘Annual Inspection Report’,‘Lease Agreement’,‘NASTC Membership’,‘Other’];
const TRAILER_TYPES = [‘Dry Van’,‘Reefer’,‘Flatbed’,‘Step Deck’,‘RGN’,‘Tanker’,‘Hopper’,‘Container’,‘Other’];
const BROKERS = [‘CNA Transportation’,‘Coyote Logistics’,‘Echo Global Logistics’,‘GlobalTranz’,‘Landstar’,‘Total Quality Logistics (TQL)’,‘XPO Logistics’,‘Other’];
const SERVICE_TYPES = [‘Oil Change’,‘Filter Change’,‘Tire Rotation’,‘Tire Replacement’,‘Brake Service’,‘Brake Inspection’,‘DOT Inspection’,‘Annual Inspection’,‘Wheel Seal’,‘King Pin’,‘Air Spring’,‘Shock Absorber’,‘3-Axle Alignment’,‘Coolant System’,‘Transmission Service’,‘DEF System’,‘EGR/DPF’,‘Electrical’,‘AC/Heating’,‘Reefer Service’,‘General Repair’,‘Other’];

const uid = () => Math.random().toString(36).substr(2,9)+Date.now().toString(36);
const today = () => new Date().toISOString().split(‘T’)[0];
const fmt$ = n => ‘$’+Number(n||0).toLocaleString(‘en-US’,{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDate = d => d ? new Date(d+‘T12:00:00’).toLocaleDateString(‘en-US’,{month:‘short’,day:‘numeric’,year:‘numeric’}) : ‘—’;
const daysUntil = d => d ? Math.ceil((new Date(d+‘T12:00:00’)-new Date())/86400000) : null;

// ─── STORAGE HOOK ─────────────────────────────────────────────────────────────
function useStorage(key, initial) {
const [value, setValue] = useState(initial);
const [loaded, setLoaded] = useState(false);
useEffect(() => {
(async()=>{
try{ const r=await window.storage.get(key); if(r) setValue(JSON.parse(r.value)); }catch(e){}
setLoaded(true);
})();
},[]);
const save = useCallback(async(v)=>{
const nv = typeof v===‘function’?v(value):v;
setValue(nv);
try{ await window.storage.set(key,JSON.stringify(nv)); }catch(e){}
return nv;
},[key,value]);
return [value,save,loaded];
}

// ─── REUSABLE UI ──────────────────────────────────────────────────────────────
const Card = ({children,className=’’})=><div className={`bg-slate-800 border border-slate-700 rounded-xl ${className}`}>{children}</div>;
const Badge = ({label,color=‘bg-slate-600’})=><span className={`${color} text-white px-2 py-0.5 rounded-full text-xs font-medium`}>{label}</span>;
const Btn = ({children,onClick,color=‘blue’,size=‘md’,className=’’,disabled=false})=>{
const colors={blue:‘bg-blue-600 hover:bg-blue-700’,green:‘bg-green-600 hover:bg-green-700’,red:‘bg-red-600 hover:bg-red-700’,slate:‘bg-slate-600 hover:bg-slate-500’,amber:‘bg-amber-500 hover:bg-amber-600’,emerald:‘bg-emerald-600 hover:bg-emerald-700’,orange:‘bg-orange-600 hover:bg-orange-700’};
const sizes={sm:‘px-3 py-1.5 text-xs’,md:‘px-4 py-2 text-sm’,lg:‘px-6 py-3 text-base’};
return <button disabled={disabled} onClick={onClick} className={`${colors[color]||colors.blue} ${sizes[size]} text-white font-medium rounded-lg transition-all disabled:opacity-40 ${className}`}>{children}</button>;
};
const Input = ({label,value,onChange,type=‘text’,placeholder=’’,className=’’,required=false})=>(

  <div className={className}>
    {label&&<label className="text-slate-400 text-xs mb-1 block">{label}{required&&<span className="text-red-400"> *</span>}</label>}
    <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500" />
  </div>
);
const Select = ({label,value,onChange,options,className=''})=>(
  <div className={className}>
    {label&&<label className="text-slate-400 text-xs mb-1 block">{label}</label>}
    <select value={value||''} onChange={e=>onChange(e.target.value)}
      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
      <option value="">Select...</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);
const StatCard = ({label,value,sub,icon:Icon,color='text-blue-400'})=>(
  <Card className="p-4">
    <div className="flex items-start justify-between">
      <div><p className="text-slate-400 text-xs mb-1">{label}</p><p className="text-white text-xl font-bold">{value}</p>{sub&&<p className="text-slate-500 text-xs mt-0.5">{sub}</p>}</div>
      {Icon&&<div className={`${color} opacity-80`}><Icon size={24}/></div>}
    </div>
  </Card>
);

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({users,onLogin}){
const [email,setEmail]=useState(’’);
const [pw,setPw]=useState(’’);
const [showPw,setShowPw]=useState(false);
const [err,setErr]=useState(’’);
const handle=()=>{
const u=users.find(u=>(u.email.toLowerCase()===email.toLowerCase()||u.name.toLowerCase().includes(email.toLowerCase()))&&u.password===pw&&!u.deleted);
u?onLogin(u):setErr(‘Invalid credentials.’);
};
return(
<div className=“min-h-screen flex items-center justify-center” style={{background:‘linear-gradient(135deg,#060e1f 0%,#0a1628 60%,#0f1f3d 100%)’}}>
<div className="w-full max-w-md px-6">
<div className="text-center mb-8">
<div className=“inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-2xl” style={{background:‘linear-gradient(135deg,#1565c0,#0d47a1)’}}>
<Truck className="text-white" size={42}/>
</div>
<h1 className=“text-4xl font-black text-white tracking-tight” style={{fontFamily:‘Georgia,serif’}}>ETTR</h1>
<p className="text-blue-400 font-medium mt-1">Fleet Management System</p>
<p className="text-slate-500 text-sm">Edgerton Truck & Trailer Repair • Bonduel, WI</p>
<p className="text-slate-600 text-xs mt-0.5">DOT 1978980</p>
</div>
<Card className="p-8">
<h2 className="text-white font-bold text-lg mb-5">Sign In</h2>
{err&&<div className="bg-red-900/30 border border-red-600/40 rounded-lg px-3 py-2 mb-4 flex items-center gap-2 text-red-400 text-sm"><AlertCircle size={15}/>{err}</div>}
<div className="space-y-4">
<Input label=“Email or Name” value={email} onChange={v=>{setEmail(v);setErr(’’);}} placeholder=“Enter email or full name”/>
<div>
<label className="text-slate-400 text-xs mb-1 block">Password</label>
<div className="relative">
<input type={showPw?‘text’:‘password’} value={pw} onChange={e=>{setPw(e.target.value);setErr(’’);}} onKeyDown={e=>e.key===‘Enter’&&handle()} placeholder=“Enter password”
className=“w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 pr-10”/>
<button onClick={()=>setShowPw(!showPw)} className=“absolute right-3 top-2.5 text-slate-400 hover:text-white”>{showPw?<EyeOff size={18}/>:<Eye size={18}/>}</button>
</div>
</div>
<Btn onClick={handle} size="lg" className="w-full">Sign In →</Btn>
</div>
<div className="mt-4 pt-4 border-t border-slate-700">
<p className="text-slate-600 text-xs text-center">ETTR Fleet Management • DOT 1978980</p>
</div>
</Card>
<p className="text-center text-slate-700 text-xs mt-4">v1.0 • Built by Tim Smith</p>
</div>
</div>
);
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({user,page,setPage,onLogout,collapsed,setCollapsed}){
const isAdmin = user.role===ROLES.DEVELOPER||user.role===ROLES.CARRIER_ADMIN;
const isDev = user.role===ROLES.DEVELOPER;
const navGroups=[
{label:‘Main’, items:[
{id:‘dashboard’,icon:Home,label:‘Dashboard’},
{id:‘profile’,icon:User,label:‘My Profile’},
{id:‘truck’,icon:Truck,label:‘My Truck’},
]},
{label:‘Operations’, items:[
{id:‘loads’,icon:Package,label:‘Loads’},
{id:‘petty_cash’,icon:DollarSign,label:‘Petty Cash’},
{id:‘fuel’,icon:Fuel,label:‘Fuel & IFTA’},
{id:‘eld’,icon:Clock,label:‘ELD Logs’,show:user.id===‘tim_smith’},
]},
{label:‘Assets’, items:[
{id:‘trailers’,icon:Layers,label:‘Trailers’},
{id:‘service’,icon:Wrench,label:‘Service Records’},
{id:‘documents’,icon:Shield,label:‘Documents’},
]},
{label:‘Insights’, items:[
{id:‘reports’,icon:BarChart2,label:‘Reports’},
]},
…(isAdmin?[{label:‘Management’, items:[
{id:‘admin’,icon:Settings,label:isDev?‘System Admin’:‘Carrier Admin’},
]}]:[]),
];
return(
<div className={`fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800 flex flex-col transition-all z-50 ${collapsed?'w-16':'w-56'}`}>
<div className="flex items-center justify-between p-4 border-b border-slate-800">
{!collapsed&&<div><p className=“text-white font-black text-lg” style={{fontFamily:‘Georgia,serif’}}>ETTR</p><p className="text-slate-500 text-xs">Fleet Mgmt</p></div>}
<button onClick={()=>setCollapsed(!collapsed)} className=“text-slate-400 hover:text-white p-1 rounded”>{collapsed?<Menu size={20}/>:<X size={18}/>}</button>
</div>
{!collapsed&&(
<div className="px-3 py-3 border-b border-slate-800">
<div className="flex items-center gap-2">
<div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${user.id==='tim_smith'?'bg-slate-600 text-white':'bg-blue-600 text-white'}`}>{user.name[0]}</div>
<div><p className="text-white text-xs font-semibold">{user.name}</p><p className="text-slate-500 text-xs">{user.role===‘developer’?‘App Admin’:user.role===‘carrier_admin’?‘Carrier Admin’:‘Driver’}</p></div>
</div>
</div>
)}
<nav className="flex-1 overflow-y-auto py-2 px-2">
{navGroups.map(g=>(
<div key={g.label} className="mb-3">
{!collapsed&&<p className="text-slate-600 text-xs font-semibold uppercase px-2 mb-1">{g.label}</p>}
{g.items.filter(i=>i.show!==false).map(item=>(
<button key={item.id} onClick={()=>setPage(item.id)}
className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all mb-0.5 ${page===item.id?'bg-blue-600 text-white':'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
<item.icon size={18} className=“flex-shrink-0”/>
{!collapsed&&<span>{item.label}</span>}
</button>
))}
</div>
))}
</nav>
<div className="p-2 border-t border-slate-800">
<button onClick={onLogout} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 text-sm transition-all">
<LogOut size={18} className="flex-shrink-0"/>
{!collapsed&&<span>Sign Out</span>}
</button>
</div>
</div>
);
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({user,allData,setPage}){
const {loads,pettyCash,serviceRecords,trailers,trucks}=allData;
const myLoads=loads.filter(l=>!l.deleted&&(user.role===ROLES.CARRIER_ADMIN||l.driverId===user.id));
const activeLoads=myLoads.filter(l=>![‘Paid’,‘Cancelled’,‘Searching’].includes(l.status));
const paidLoads=myLoads.filter(l=>l.status===‘Paid’);
const totalRevenue=paidLoads.reduce((s,l)=>s+(parseFloat(l.rate)||0),0);
const myPc=pettyCash.filter(p=>!p.deleted&&(p.forDriver===user.id||user.role===ROLES.CARRIER_ADMIN));
const pcOwed=myPc.filter(p=>!p.paid&&p.forDriver===‘tim_smith’).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
const myTruck=trucks.find(t=>t.driverId===user.id);
const upcomingServices=serviceRecords.filter(s=>!s.deleted&&s.truckId===myTruck?.id&&s.nextDue&&daysUntil(s.nextDue)<=30&&daysUntil(s.nextDue)>=0);
const cdlDays=daysUntil(user.cdlExpiry);
const medDays=daysUntil(user.medCardExpiry);
return(
<div className="space-y-6">
<div>
<h1 className="text-white text-2xl font-bold">Welcome back, {user.name.split(’ ‘)[0]} 👋</h1>
<p className="text-slate-400 text-sm mt-0.5">{new Date().toLocaleDateString(‘en-US’,{weekday:‘long’,month:‘long’,day:‘numeric’,year:‘numeric’})}</p>
</div>
{(upcomingServices.length>0||cdlDays!==null&&cdlDays<60||medDays!==null&&medDays<60||pcOwed>0)&&(
<div className="space-y-2">
{upcomingServices.map(s=><div key={s.id} className="bg-amber-900/30 border border-amber-600/40 rounded-lg px-4 py-2 flex items-center gap-2 text-amber-400 text-sm"><AlertTriangle size={16}/><span>{s.type} due in {daysUntil(s.nextDue)} days — {myTruck?.unit||myTruck?.make}</span></div>)}
{cdlDays!==null&&cdlDays<60&&<div className="bg-red-900/30 border border-red-600/40 rounded-lg px-4 py-2 flex items-center gap-2 text-red-400 text-sm"><Shield size={16}/><span>CDL expires in {cdlDays} days!</span></div>}
{medDays!==null&&medDays<60&&<div className="bg-red-900/30 border border-red-600/40 rounded-lg px-4 py-2 flex items-center gap-2 text-red-400 text-sm"><Shield size={16}/><span>Medical Card expires in {medDays} days!</span></div>}
{pcOwed>0&&user.id===‘tim_smith’&&(
<div onClick={()=>setPage(‘petty_cash’)} className=“bg-orange-900/30 border border-orange-600/40 rounded-lg px-4 py-2 flex items-center justify-between gap-2 text-orange-400 text-sm cursor-pointer hover:bg-orange-900/50”>
<div className="flex items-center gap-2"><DollarSign size={16}/><span>You owe Bruce {fmt$(pcOwed)} in petty cash</span></div>
<span className="text-xs underline">Go to Petty Cash →</span>
</div>
)}
{pcOwed>0&&user.id===‘bruce_edgerton’&&(
<div onClick={()=>setPage(‘petty_cash’)} className=“bg-orange-900/30 border border-orange-600/40 rounded-lg px-4 py-2 flex items-center justify-between gap-2 text-orange-400 text-sm cursor-pointer hover:bg-orange-900/50”>
<div className="flex items-center gap-2"><DollarSign size={16}/><span>Tim still owes you {fmt$(pcOwed)} in petty cash</span></div>
<span className="text-xs underline">Go to Petty Cash →</span>
</div>
)}
</div>
)}
<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
<StatCard label="Active Loads" value={activeLoads.length} icon={Package} color="text-blue-400"/>
<StatCard label=“Total Revenue” value={fmt$(totalRevenue)} sub={`${paidLoads.length} paid loads`} icon={TrendingUp} color=“text-green-400”/>
{user.id===‘tim_smith’&&<StatCard label="Petty Cash Owed" value={fmt$(pcOwed)} icon={DollarSign} color="text-orange-400"/>}
{user.id===‘bruce_edgerton’&&<StatCard label="Tim Owes You" value={fmt$(pcOwed)} icon={DollarSign} color="text-orange-400"/>}
<StatCard label=“Trailers” value={trailers.filter(t=>!t.deleted).length} icon={Layers} color=“text-purple-400”/>
</div>
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
<Card className="p-4">
<h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><Package size={16} className="text-blue-400"/>Active Loads</h3>
{activeLoads.length===0?<p className="text-slate-500 text-sm">No active loads</p>:
<div className="space-y-2">{activeLoads.slice(0,4).map(l=>(
<div key={l.id} className="flex items-center justify-between bg-slate-750 rounded-lg px-3 py-2 border border-slate-700">
<div><p className="text-white text-sm font-medium">{l.broker}</p><p className="text-slate-400 text-xs">{l.origin} → {l.destination}</p></div>
<div className="text-right"><Badge label={l.status} color={STATUS_COLORS[l.status]}/><p className="text-green-400 text-xs mt-1">{fmt$(l.rate)}</p></div>
</div>
))}</div>}
</Card>
<Card className="p-4">
<h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><Wrench size={16} className="text-amber-400"/>My Truck — {myTruck?.make} {myTruck?.unit}</h3>
{myTruck?<div className="space-y-2 text-sm">
<div className="flex justify-between"><span className="text-slate-400">Year</span><span className="text-white">{myTruck.year||’—’}</span></div>
<div className="flex justify-between"><span className="text-slate-400">Mileage</span><span className="text-white">{myTruck.mileage?myTruck.mileage.toLocaleString():’—’}</span></div>
<div className="flex justify-between"><span className="text-slate-400">VIN</span><span className="text-white text-xs">{myTruck.vin||’—’}</span></div>
<div className="flex justify-between"><span className="text-slate-400">ELD</span><span className="text-white">{myTruck.eldProvider||’—’}</span></div>
<div className="flex justify-between"><span className="text-slate-400">Color</span><span className="text-white">{myTruck.color}</span></div>
</div>:<p className="text-slate-500 text-sm">No truck assigned</p>}
</Card>
</div>
</div>
);
}

// ─── PROFILE MODULE ───────────────────────────────────────────────────────────
function ProfileModule({user,users,saveUsers,currentUser}){
const canEdit=currentUser.role===ROLES.DEVELOPER||currentUser.role===ROLES.CARRIER_ADMIN||currentUser.id===user.id;
const [form,setForm]=useState({…user});
const [saved,setSaved]=useState(false);
const set=(k,v)=>setForm(f=>({…f,[k]:v}));
const handleSave=()=>{
if(!canEdit)return;
saveUsers(prev=>prev.map(u=>u.id===form.id?form:u));
setSaved(true); setTimeout(()=>setSaved(false),2500);
};
const cdlDays=daysUntil(form.cdlExpiry);
const medDays=daysUntil(form.medCardExpiry);
return(
<div className="space-y-5">
<div className="flex items-center justify-between">
<div className="flex items-center gap-4">
<div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${user.id==='tim_smith'?'bg-slate-700 text-white':'bg-blue-600 text-white'}`}>{user.name[0]}</div>
<div>
<h1 className="text-white text-2xl font-bold">{user.name}</h1>
<p className="text-slate-400 text-sm">{user.carrierRole} • ETTR</p>
<Badge label={user.role===‘developer’?‘App Admin’:user.role===‘carrier_admin’?‘Carrier Admin’:‘Driver’} color={user.role===‘developer’?‘bg-amber-600’:user.role===‘carrier_admin’?‘bg-blue-600’:‘bg-slate-600’}/>
</div>
</div>
{canEdit&&<Btn onClick={handleSave} color={saved?‘emerald’:‘blue’}>{saved?‘✓ Saved’:‘Save Changes’}</Btn>}
</div>
{cdlDays!==null&&cdlDays<90&&<div className={`${cdlDays<30?'bg-red-900/30 border-red-600/40 text-red-400':'bg-amber-900/30 border-amber-600/40 text-amber-400'} border rounded-lg px-4 py-2 text-sm flex items-center gap-2`}><AlertTriangle size={16}/>CDL expires {cdlDays<0?‘EXPIRED’:` in ${cdlDays} days`} ({fmtDate(form.cdlExpiry)})</div>}
{medDays!==null&&medDays<90&&<div className={`${medDays<30?'bg-red-900/30 border-red-600/40 text-red-400':'bg-amber-900/30 border-amber-600/40 text-amber-400'} border rounded-lg px-4 py-2 text-sm flex items-center gap-2`}><AlertTriangle size={16}/>Medical Card expires {medDays<0?‘EXPIRED’:` in ${medDays} days`} ({fmtDate(form.medCardExpiry)})</div>}
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
<Card className="p-5">
<h3 className="text-white font-semibold mb-4 flex items-center gap-2"><User size={16} className="text-blue-400"/>Personal Info</h3>
<div className="space-y-3">
<Input label=“Full Name” value={form.name} onChange={v=>set(‘name’,v)}/>
<Input label=“Email” value={form.email} onChange={v=>set(‘email’,v)}/>
<Input label=“Phone” value={form.phone} onChange={v=>set(‘phone’,v)}/>
<Input label=“Address” value={form.address} onChange={v=>set(‘address’,v)}/>
<Input label=“Emergency Contact” value={form.emergencyContact} onChange={v=>set(‘emergencyContact’,v)}/>
<Input label=“Emergency Phone” value={form.emergencyPhone} onChange={v=>set(‘emergencyPhone’,v)}/>
</div>
</Card>
<Card className="p-5">
<h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Shield size={16} className="text-blue-400"/>CDL & Compliance</h3>
<div className="space-y-3">
<Input label=“CDL Number” value={form.cdl} onChange={v=>set(‘cdl’,v)}/>
<Input label=“CDL State” value={form.cdlState} onChange={v=>set(‘cdlState’,v)}/>
<Input label=“CDL Expiry” type=“date” value={form.cdlExpiry} onChange={v=>set(‘cdlExpiry’,v)}/>
<Input label=“Medical Card Expiry” type=“date” value={form.medCardExpiry} onChange={v=>set(‘medCardExpiry’,v)}/>
<Input label=“Hire Date” type=“date” value={form.hireDate} onChange={v=>set(‘hireDate’,v)}/>
</div>
</Card>
{(currentUser.role===ROLES.DEVELOPER||currentUser.role===ROLES.CARRIER_ADMIN)&&(
<Card className="p-5">
<h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Lock size={16} className="text-blue-400"/>Account Settings</h3>
<div className="space-y-3">
<Select label=“Role” value={form.role} onChange={v=>set(‘role’,v)} options={Object.values(ROLES)}/>
<Select label=“Carrier Role” value={form.carrierRole} onChange={v=>set(‘carrierRole’,v)} options={[‘Lease Operator’,‘Owner Operator’,‘Company Driver’,‘Carrier Admin’]}/>
<Input label=“New Password” type=“password” value={form.newPassword||’’} onChange={v=>set(‘newPassword’,v)} placeholder=“Leave blank to keep current”/>
</div>
</Card>
)}
<Card className="p-5">
<h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Info size={16} className="text-blue-400"/>Carrier Info</h3>
<div className="space-y-2 text-sm">
<div className="flex justify-between"><span className="text-slate-400">Carrier</span><span className="text-white">{CARRIER.name}</span></div>
<div className="flex justify-between"><span className="text-slate-400">DOT #</span><span className="text-white">{CARRIER.dot}</span></div>
<div className="flex justify-between"><span className="text-slate-400">HQ</span><span className="text-white">{CARRIER.address}</span></div>
<div className="flex justify-between"><span className="text-slate-400">Role</span><span className="text-white">{form.carrierRole}</span></div>
{user.id===‘tim_smith’&&<div className="mt-3 pt-3 border-t border-slate-700 text-slate-400 text-xs">Operating under ETTR authority as a lease operator. ELD: BlueInk Tech</div>}
</div>
</Card>
</div>
</div>
);
}

// ─── TRUCK MODULE ─────────────────────────────────────────────────────────────
function TruckModule({user,trucks,saveTrucks}){
const myTruck=trucks.find(t=>t.driverId===user.id)||trucks[0];
const [form,setForm]=useState(myTruck||{});
const [saved,setSaved]=useState(false);
const set=(k,v)=>setForm(f=>({…f,[k]:v}));
const setNested=(outer,k,v)=>setForm(f=>({…f,[outer]:{…f[outer],[k]:v}}));
const handleSave=()=>{
saveTrucks(prev=>prev.map(t=>t.id===form.id?form:t));
setSaved(true); setTimeout(()=>setSaved(false),2500);
};
if(!myTruck) return <div className="text-slate-400">No truck assigned.</div>;
return(
<div className="space-y-5">
<div className="flex items-center justify-between">
<div>
<h1 className="text-white text-2xl font-bold">{form.make} {form.model} {form.unit}</h1>
<p className="text-slate-400 text-sm">{form.year} • {form.color} • {form.vin||‘VIN not set’}</p>
</div>
<Btn onClick={handleSave} color={saved?‘emerald’:‘blue’}>{saved?‘✓ Saved’:‘Save Changes’}</Btn>
</div>
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
<Card className="p-5">
<h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Truck size={16} className="text-blue-400"/>Vehicle Info</h3>
<div className="space-y-3">
<div className="grid grid-cols-2 gap-3">
<Input label=“Make” value={form.make} onChange={v=>set(‘make’,v)}/>
<Input label=“Model” value={form.model} onChange={v=>set(‘model’,v)}/>
</div>
<div className="grid grid-cols-2 gap-3">
<Input label=“Year” type=“number” value={form.year} onChange={v=>set(‘year’,v)}/>
<Input label=“Color” value={form.color} onChange={v=>set(‘color’,v)}/>
</div>
<Input label=“Unit #” value={form.unit} onChange={v=>set(‘unit’,v)}/>
<Input label=“VIN” value={form.vin} onChange={v=>set(‘vin’,v)}/>
<Input label=“DOT #” value={form.dotNumber} onChange={v=>set(‘dotNumber’,v)}/>
<div className="grid grid-cols-2 gap-3">
<Input label=“License Plate” value={form.licensePlate} onChange={v=>set(‘licensePlate’,v)}/>
<Input label=“State” value={form.stateReg} onChange={v=>set(‘stateReg’,v)}/>
</div>
<Input label=“Current Mileage” type=“number” value={form.mileage} onChange={v=>set(‘mileage’,v)}/>
<Input label=“ELD Provider” value={form.eldProvider} onChange={v=>set(‘eldProvider’,v)}/>
</div>
</Card>
<div className="space-y-4">
<Card className="p-5">
<h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Star size={16} className="text-amber-400"/>Tires</h3>
<div className="space-y-3">
<Input label=“Brand” value={form.tires?.brand} onChange={v=>setNested(‘tires’,‘brand’,v)}/>
<Input label=“Size” value={form.tires?.size} onChange={v=>setNested(‘tires’,‘size’,v)}/>
<div className="grid grid-cols-2 gap-3">
<Input label=“Front Tread (32nds)” value={form.tires?.frontTread} onChange={v=>setNested(‘tires’,‘frontTread’,v)}/>
<Input label=“Rear Tread (32nds)” value={form.tires?.rearTread} onChange={v=>setNested(‘tires’,‘rearTread’,v)}/>
</div>
<Input label=“Last Replaced” type=“date” value={form.tires?.lastReplaced} onChange={v=>setNested(‘tires’,‘lastReplaced’,v)}/>
</div>
</Card>
<Card className="p-5">
<h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Wrench size={16} className="text-slate-400"/>Brakes</h3>
<div className="space-y-3">
<Select label=“Type” value={form.brakes?.type} onChange={v=>setNested(‘brakes’,‘type’,v)} options={[‘Air Disc’,‘Air Drum’,‘Hydraulic Disc’,‘Hydraulic Drum’]}/>
<Input label=“Brand” value={form.brakes?.brand} onChange={v=>setNested(‘brakes’,‘brand’,v)}/>
<Input label=“Last Inspected” type=“date” value={form.brakes?.lastInspected} onChange={v=>setNested(‘brakes’,‘lastInspected’,v)}/>
<Input label=“Last Replaced” type=“date” value={form.brakes?.lastReplaced} onChange={v=>setNested(‘brakes’,‘lastReplaced’,v)}/>
</div>
</Card>
</div>
</div>
<Card className="p-5">
<h3 className="text-white font-semibold mb-4">Notes</h3>
<textarea value={form.notes||’’} onChange={e=>set(‘notes’,e.target.value)} placeholder=“Truck notes…”
className=“w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 h-24 resize-none”/>
</Card>
</div>
);
}

// ─── PETTY CASH MODULE ────────────────────────────────────────────────────────
function PettyCashModule({currentUser,users,pettyCash,savePettyCash}){
const isTim = currentUser.id===‘tim_smith’;
const isBruce = currentUser.id===‘bruce_edgerton’||currentUser.role===ROLES.CARRIER_ADMIN;
const isAdmin = currentUser.role===ROLES.DEVELOPER||currentUser.role===ROLES.CARRIER_ADMIN;
const [showAdd,setShowAdd]=useState(false);
const [form,setForm]=useState({description:’’,amount:’’,date:today(),category:‘Repairs’,forDriver:‘tim_smith’,notes:’’});
const [filter,setFilter]=useState(‘all’);
const [viewReceiptItem,setViewReceiptItem]=useState(null);

// Single hidden file input — we track which item to attach to via ref
const fileInputRef = useRef();
const cameraInputRef = useRef();
const receiptTargetRef = useRef(null);

const set=(k,v)=>setForm(f=>({…f,[k]:v}));

const drivers=users.filter(u=>u.id!==‘bruce_edgerton’&&!u.deleted);
const activeItems=pettyCash.filter(p=>!p.deleted);
const myItems=activeItems.filter(p=>p.forDriver===currentUser.id);
const timItems=activeItems.filter(p=>p.forDriver===‘tim_smith’);

// What to display based on role + filter
const baseList = isBruce ? activeItems : myItems;
const filtered = baseList.filter(p=>
filter===‘all’?true : filter===‘unpaid’?!p.paid : p.paid
);

const totalOwed = timItems.filter(p=>!p.paid).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
const totalPaid = timItems.filter(p=>p.paid).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
const totalOut = timItems.reduce((s,p)=>s+(parseFloat(p.amount)||0),0);

const addEntry=()=>{
if(!form.description||!form.amount) return;
const entry={id:uid(),description:form.description,amount:parseFloat(form.amount),date:form.date,category:form.category,
notes:form.notes,addedBy:currentUser.id,forDriver:form.forDriver,paid:false,paidDate:null,
paidMethod:null,receiptImage:null,receiptName:null,markedPaidByBruce:false,deleted:false};
savePettyCash(prev=>[entry,…prev]);
setForm({description:’’,amount:’’,date:today(),category:‘Repairs’,forDriver:‘tim_smith’,notes:’’});
setShowAdd(false);
};

const markPaid=(id)=>{
savePettyCash(prev=>prev.map(p=>p.id===id?{…p,paid:true,paidDate:today(),paidMethod:‘Bruce marked paid’,markedPaidByBruce:true}:p));
};
const unmarkPaid=(id)=>{
savePettyCash(prev=>prev.map(p=>p.id===id?{…p,paid:false,paidDate:null,paidMethod:null,markedPaidByBruce:false}:p));
};
const handleDeleteConfirm=(id)=>{
if(!window.confirm(‘Delete this entry?’)||!window.confirm(‘Are you DOUBLE sure? This cannot be undone.’)) return;
savePettyCash(prev=>prev.map(p=>p.id===id?{…p,deleted:true}:p));
};

const processReceiptFile=(file, itemId)=>{
if(!file) return;
const reader=new FileReader();
reader.onload=(ev)=>{
savePettyCash(prev=>prev.map(p=>p.id===itemId?{…p,receiptImage:ev.target.result,receiptName:file.name,paid:true,paidDate:today(),paidMethod:‘Receipt uploaded by Tim’}:p));
};
reader.readAsDataURL(file);
};

const triggerFileUpload=(itemId)=>{
receiptTargetRef.current = itemId;
fileInputRef.current.value=’’;
fileInputRef.current.click();
};

const triggerCamera=(itemId)=>{
receiptTargetRef.current = itemId;
cameraInputRef.current.value=’’;
cameraInputRef.current.click();
};

return(
<div className="space-y-5">
{/* Hidden file inputs — single instance each, shared across all items */}
<input ref={fileInputRef} type=“file” accept=“image/*,application/pdf” className=“hidden”
onChange={e=>{ if(receiptTargetRef.current) processReceiptFile(e.target.files[0], receiptTargetRef.current); }}/>
<input ref={cameraInputRef} type=“file” accept=“image/*” capture=“environment” className=“hidden”
onChange={e=>{ if(receiptTargetRef.current) processReceiptFile(e.target.files[0], receiptTargetRef.current); }}/>

```
  {/* Receipt viewer modal */}
  {viewReceiptItem&&(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={()=>setViewReceiptItem(null)}>
      <div className="bg-slate-800 rounded-xl p-5 max-w-lg w-full max-h-screen overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-semibold">Receipt — {viewReceiptItem.description}</h3>
          <button onClick={()=>setViewReceiptItem(null)} className="text-slate-400 hover:text-white"><X size={18}/></button>
        </div>
        <p className="text-slate-400 text-xs mb-3">{viewReceiptItem.receiptName} • {fmtDate(viewReceiptItem.paidDate)}</p>
        {viewReceiptItem.receiptImage?.startsWith('data:image')
          ? <img src={viewReceiptItem.receiptImage} alt="receipt" className="w-full rounded-lg border border-slate-600"/>
          : <div className="bg-slate-700 rounded-lg p-4 text-slate-300 text-sm text-center"><FileText size={32} className="mx-auto mb-2 text-slate-500"/>{viewReceiptItem.receiptName}</div>
        }
        <button onClick={()=>setViewReceiptItem(null)} className="mt-4 w-full py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600">Close</button>
      </div>
    </div>
  )}

  {/* Page Header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-white text-2xl font-bold flex items-center gap-2"><DollarSign className="text-amber-400"/>Petty Cash</h1>
      <p className="text-slate-400 text-sm">
        {isTim ? "Bruce fronts expenses — you pay him back" : "Track what Tim owes & mark items paid"}
      </p>
    </div>
    {isAdmin&&<Btn onClick={()=>setShowAdd(!showAdd)} color="amber"><Plus size={15} className="inline mr-1"/>Add Expense</Btn>}
  </div>

  {/* ── SUMMARY CARDS ── */}
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <Card className="p-4 border-amber-600/30">
      <p className="text-slate-400 text-xs mb-1">💰 Total Bruce Fronted</p>
      <p className="text-amber-400 text-xl font-bold">{fmt$(totalOut)}</p>
      <p className="text-slate-500 text-xs">{timItems.length} total expense{timItems.length!==1?'s':''}</p>
    </Card>
    <Card className="p-4 border-red-600/30">
      <p className="text-slate-400 text-xs mb-1">🔴 {isTim?'You Still Owe Bruce':'Tim Still Owes You'}</p>
      <p className="text-red-400 text-xl font-bold">{fmt$(totalOwed)}</p>
      <p className="text-slate-500 text-xs">{timItems.filter(p=>!p.paid).length} unpaid items</p>
    </Card>
    <Card className="p-4 border-green-600/30">
      <p className="text-slate-400 text-xs mb-1">✅ {isTim?'You Have Paid Back':'Tim Has Paid Back'}</p>
      <p className="text-green-400 text-xl font-bold">{fmt$(totalPaid)}</p>
      <p className="text-slate-500 text-xs">{timItems.filter(p=>p.paid).length} paid items</p>
    </Card>
  </div>

  {/* ── TIM BANNER — what he owes, how to pay ── */}
  {isTim&&totalOwed>0&&(
    <Card className="p-4 border-orange-600/40" style={{background:'linear-gradient(135deg,rgba(120,50,0,0.3),rgba(50,20,0,0.2))'}}>
      <div className="flex items-start gap-3">
        <div className="text-3xl">🚛</div>
        <div>
          <p className="text-orange-300 font-bold text-base">Hey Tim — you owe Bruce {fmt$(totalOwed)}</p>
          <p className="text-slate-400 text-xs mt-1">To document a payment: tap <strong className="text-white">📷 Camera</strong> to snap a receipt photo right now, or <strong className="text-white">📁 Upload File</strong> to attach a saved image or PDF. Once uploaded the item will automatically mark as paid.</p>
        </div>
      </div>
    </Card>
  )}

  {/* ── BRUCE BANNER ── */}
  {isBruce&&totalOwed>0&&(
    <Card className="p-4 border-blue-600/30" style={{background:'linear-gradient(135deg,rgba(0,40,120,0.3),rgba(0,20,60,0.2))'}}>
      <div className="flex items-start gap-3">
        <div className="text-3xl">💼</div>
        <div>
          <p className="text-blue-300 font-bold text-base">Bruce — Tim owes you {fmt$(totalOwed)}</p>
          <p className="text-slate-400 text-xs mt-1">Check the box next to each item when Tim pays you back. You can also view any receipts Tim uploaded. The running tally at the bottom updates automatically.</p>
        </div>
      </div>
    </Card>
  )}

  {/* ── ADD EXPENSE FORM ── */}
  {showAdd&&isAdmin&&(
    <Card className="p-5 border-amber-600/30">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Plus size={16} className="text-amber-400"/>New Expense Entry</h3>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Input label="Description *" value={form.description} onChange={v=>set('description',v)} placeholder="What did Bruce pay for?" className="lg:col-span-2"/>
        <Input label="Amount ($) *" type="number" value={form.amount} onChange={v=>set('amount',v)} placeholder="0.00"/>
        <Input label="Date" type="date" value={form.date} onChange={v=>set('date',v)}/>
        <Select label="Category" value={form.category} onChange={v=>set('category',v)} options={EXPENSE_CATS}/>
        <Select label="Charged To (Driver)" value={form.forDriver} onChange={v=>set('forDriver',v)} options={drivers.map(d=>d.id)}/>
        <Input label="Notes" value={form.notes} onChange={v=>set('notes',v)} placeholder="Additional details..." className="lg:col-span-2"/>
      </div>
      <div className="flex gap-2 mt-4">
        <Btn onClick={addEntry} color="amber">Save Entry</Btn>
        <Btn onClick={()=>setShowAdd(false)} color="slate">Cancel</Btn>
      </div>
    </Card>
  )}

  {/* ── FILTER TABS ── */}
  <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit border border-slate-700">
    {['all','unpaid','paid'].map(f=>(
      <button key={f} onClick={()=>setFilter(f)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter===f?'bg-slate-700 text-white shadow':'text-slate-500 hover:text-slate-300'}`}>
        {f==='all'?`All (${baseList.length})`:f==='unpaid'?`Unpaid (${baseList.filter(p=>!p.paid).length})`:`Paid (${baseList.filter(p=>p.paid).length})`}
      </button>
    ))}
  </div>

  {/* ── EXPENSE LIST ── */}
  <div className="space-y-3">
    {filtered.length===0&&(
      <Card className="p-8 text-center"><Receipt size={32} className="text-slate-700 mx-auto mb-2"/><p className="text-slate-500">No entries found</p></Card>
    )}
    {filtered.map(item=>{
      const driver=users.find(u=>u.id===item.forDriver);
      return(
        <Card key={item.id} className={`p-4 transition-all ${item.paid?'border-green-700/40 opacity-85':'border-amber-600/20'}`}>
          <div className="flex items-start gap-3">

            {/* ── BRUCE: Big checkbox ── */}
            {isBruce&&(
              <button
                onClick={()=>item.paid?unmarkPaid(item.id):markPaid(item.id)}
                title={item.paid?'Click to unmark paid':'Click to mark as paid'}
                className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5 ${item.paid?'bg-green-600 border-green-600':'border-slate-500 hover:border-green-400 bg-transparent'}`}
              >
                {item.paid&&<Check size={16} className="text-white"/>}
              </button>
            )}

            {/* ── Content ── */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm">{item.description}</p>
                    <Badge label={item.category} color="bg-slate-600"/>
                    {item.paid
                      ? <Badge label="✅ PAID" color="bg-green-700"/>
                      : <Badge label="⚠️ OWED" color="bg-red-800"/>
                    }
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">{fmtDate(item.date)} • For: {driver?.name||item.forDriver}</p>
                  {item.notes&&<p className="text-slate-500 text-xs mt-1 italic">📝 {item.notes}</p>}
                  {item.paid&&<p className="text-green-400 text-xs mt-1 flex items-center gap-1"><Check size={11}/>Paid {fmtDate(item.paidDate)} — {item.paidMethod||'manual'}</p>}
                  {item.receiptName&&(
                    <button onClick={()=>setViewReceiptItem(item)} className="text-blue-400 text-xs mt-1 flex items-center gap-1 hover:text-blue-300">
                      <Image size={11}/>{item.receiptName} — tap to view
                    </button>
                  )}
                  {/* Receipt thumbnail */}
                  {item.receiptImage&&item.receiptImage.startsWith('data:image')&&(
                    <button onClick={()=>setViewReceiptItem(item)} className="mt-2 block">
                      <img src={item.receiptImage} alt="receipt" className="h-16 rounded-lg border border-slate-600 object-cover hover:opacity-80 transition-opacity"/>
                    </button>
                  )}
                </div>

                {/* ── Amount + Actions ── */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-xl ${item.paid?'text-green-400':'text-amber-400'}`}>{fmt$(item.amount)}</p>

                  {/* TIM: upload/camera receipt buttons */}
                  {isTim&&!item.paid&&(
                    <div className="flex gap-1 mt-2 justify-end">
                      <button
                        onClick={()=>triggerCamera(item.id)}
                        className="flex items-center gap-1 px-2 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded-lg font-medium transition-all"
                      >
                        <Camera size={12}/>Photo
                      </button>
                      <button
                        onClick={()=>triggerFileUpload(item.id)}
                        className="flex items-center gap-1 px-2 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded-lg font-medium transition-all"
                      >
                        <Upload size={12}/>File
                      </button>
                    </div>
                  )}
                  {isTim&&item.paid&&item.receiptImage&&(
                    <button onClick={()=>setViewReceiptItem(item)} className="text-xs text-blue-400 hover:text-blue-300 mt-1 block">View Receipt</button>
                  )}
                  {isTim&&item.paid&&!item.receiptImage&&(
                    <button onClick={()=>triggerFileUpload(item.id)} className="text-xs text-slate-500 hover:text-slate-300 mt-1 block">Attach Receipt</button>
                  )}

                  {/* BRUCE: view receipt + unmark */}
                  {isBruce&&item.receiptImage&&(
                    <button onClick={()=>setViewReceiptItem(item)} className="text-xs text-blue-400 hover:text-blue-300 mt-1 block ml-auto">📎 View Receipt</button>
                  )}
                  {isBruce&&!item.receiptImage&&item.paid&&(
                    <p className="text-xs text-slate-600 mt-1">No receipt uploaded</p>
                  )}

                  {/* Delete (dev only) */}
                  {currentUser.role===ROLES.DEVELOPER&&(
                    <button onClick={()=>handleDeleteConfirm(item.id)} className="text-slate-600 hover:text-red-400 mt-2 block ml-auto"><Trash2 size={13}/></button>
                  )}
                </div>
              </div>

              {/* BRUCE: tap hint */}
              {isBruce&&!item.paid&&(
                <p className="text-slate-600 text-xs mt-2">☝️ Tap the checkbox on the left when Tim pays this</p>
              )}
            </div>
          </div>
        </Card>
      );
    })}
  </div>

  {/* ── BRUCE: RUNNING TALLY LEDGER ── */}
  {isBruce&&activeItems.length>0&&(
    <Card className="p-5 border-slate-600">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <List size={16} className="text-amber-400"/>Running Tally — Full Ledger
      </h3>
      <div className="space-y-1.5">
        {timItems.map(item=>(
          <div key={item.id} className={`flex justify-between items-center text-sm py-1 border-b border-slate-700 ${item.paid?'opacity-50':''}`}>
            <span className={`flex-1 mr-4 ${item.paid?'line-through text-slate-500':'text-slate-300'}`}>
              {item.description} <span className="text-slate-600 text-xs ml-1">({fmtDate(item.date)})</span>
            </span>
            <span className={`font-semibold flex-shrink-0 ${item.paid?'text-green-500':'text-amber-400'}`}>
              {item.paid?'✓ ':''}{fmt$(item.amount)}
            </span>
          </div>
        ))}
        {/* Totals */}
        <div className="pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Paid Back</span>
            <span className="text-green-400 font-semibold">{fmt$(totalPaid)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-slate-600 pt-2 mt-1">
            <span className="text-white text-base">Still Owed to Bruce</span>
            <span className={`text-base ${totalOwed>0?'text-red-400':'text-green-400'}`}>{fmt$(totalOwed)}</span>
          </div>
        </div>
      </div>
    </Card>
  )}

  {/* TIM: running tally */}
  {isTim&&myItems.length>0&&(
    <Card className="p-5 border-slate-600">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <List size={16} className="text-orange-400"/>Your Repayment Ledger
      </h3>
      <div className="space-y-1.5">
        {myItems.map(item=>(
          <div key={item.id} className={`flex justify-between items-center text-sm py-1 border-b border-slate-700 ${item.paid?'opacity-50':''}`}>
            <span className={`flex-1 mr-4 ${item.paid?'line-through text-slate-500':'text-slate-300'}`}>
              {item.description} <span className="text-slate-600 text-xs ml-1">({fmtDate(item.date)})</span>
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.paid&&<Check size={12} className="text-green-400"/>}
              <span className={`font-semibold ${item.paid?'text-green-400':'text-red-400'}`}>{fmt$(item.amount)}</span>
            </div>
          </div>
        ))}
        <div className="pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Already Paid</span>
            <span className="text-green-400 font-semibold">{fmt$(totalPaid)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-slate-600 pt-2 mt-1">
            <span className="text-white text-base">You Still Owe Bruce</span>
            <span className={`text-base ${totalOwed>0?'text-red-400':'text-green-400'}`}>{totalOwed>0?fmt$(totalOwed):'All paid up! 🎉'}</span>
          </div>
        </div>
      </div>
    </Card>
  )}
</div>
```

);
}

// ─── LOADS MODULE ─────────────────────────────────────────────────────────────
function LoadsModule({currentUser,users,loads,saveLoads,trucks}){
const isAdmin=currentUser.role===ROLES.DEVELOPER||currentUser.role===ROLES.CARRIER_ADMIN;
const myLoads=isAdmin?loads.filter(l=>!l.deleted):loads.filter(l=>!l.deleted&&l.driverId===currentUser.id);
const [showAdd,setShowAdd]=useState(false);
const [selected,setSelected]=useState(null);
const [statusFilter,setStatusFilter]=useState(‘All’);
const [form,setForm]=useState({driverId:currentUser.id,broker:‘CNA Transportation’,brokerContact:’’,origin:’’,destination:’’,pickupDate:today(),deliveryDate:’’,rate:’’,miles:’’,commodity:‘Produce’,status:‘Rate Pending’,rcNumber:’’,bolNumber:’’,notes:’’,lumperFee:’’,scaleTicket:’’,fuelSurcharge:’’});
const set=(k,v)=>setForm(f=>({…f,[k]:v}));
const addLoad=()=>{
if(!form.origin||!form.destination) return;
saveLoads(prev=>[{id:uid(),…form,createdAt:today(),deleted:false},…prev]);
setShowAdd(false);
setForm({…form,origin:’’,destination:’’,rcNumber:’’,bolNumber:’’,notes:’’,lumperFee:’’,rate:’’,miles:’’});
};
const updateStatus=(id,status)=>saveLoads(prev=>prev.map(l=>l.id===id?{…l,status}:l));
const deleteLoad=(id)=>{
if(!window.confirm(‘Delete load?’)||!window.confirm(‘Are you DOUBLE sure? Cannot be undone.’)) return;
saveLoads(prev=>prev.map(l=>l.id===id?{…l,deleted:true}:l));
setSelected(null);
};
const filteredLoads=statusFilter===‘All’?myLoads:myLoads.filter(l=>l.status===statusFilter);
const COMMODITIES=[‘Produce’,‘Frozen Foods’,‘General Freight’,‘Dry Goods’,‘Auto Parts’,‘Lumber’,‘Steel’,‘Chemicals’,‘Refrigerated’,‘Hazmat’,‘Other’];

return(
<div className="space-y-5">
<div className="flex items-center justify-between">
<div><h1 className="text-white text-2xl font-bold">Loads</h1><p className="text-slate-400 text-sm">{myLoads.filter(l=>![‘Paid’,‘Cancelled’].includes(l.status)).length} active • {myLoads.filter(l=>l.status===‘Paid’).length} paid</p></div>
<Btn onClick={()=>setShowAdd(!showAdd)} color=“blue”><Plus size={15} className="inline mr-1"/>New Load</Btn>
</div>
{showAdd&&(
<Card className="p-5 border-blue-600/30">
<h3 className="text-white font-semibold mb-4">Add New Load</h3>
<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
{isAdmin&&<Select label=“Driver” value={form.driverId} onChange={v=>set(‘driverId’,v)} options={users.filter(u=>!u.deleted).map(u=>u.id)}/>}
<Select label=“Broker” value={form.broker} onChange={v=>set(‘broker’,v)} options={BROKERS}/>
<Input label=“Broker Contact” value={form.brokerContact} onChange={v=>set(‘brokerContact’,v)}/>
<Input label=“Origin” value={form.origin} onChange={v=>set(‘origin’,v)} placeholder=“City, ST”/>
<Input label=“Destination” value={form.destination} onChange={v=>set(‘destination’,v)} placeholder=“City, ST”/>
<Input label=“Pickup Date” type=“date” value={form.pickupDate} onChange={v=>set(‘pickupDate’,v)}/>
<Input label=“Delivery Date” type=“date” value={form.deliveryDate} onChange={v=>set(‘deliveryDate’,v)}/>
<Input label=“Rate ($)” type=“number” value={form.rate} onChange={v=>set(‘rate’,v)}/>
<Input label=“Miles” type=“number” value={form.miles} onChange={v=>set(‘miles’,v)}/>
<Select label=“Commodity” value={form.commodity} onChange={v=>set(‘commodity’,v)} options={COMMODITIES}/>
<Input label=“Rate Confirmation #” value={form.rcNumber} onChange={v=>set(‘rcNumber’,v)}/>
<Input label=“BOL #” value={form.bolNumber} onChange={v=>set(‘bolNumber’,v)}/>
<Input label=“Lumper Fee ($)” type=“number” value={form.lumperFee} onChange={v=>set(‘lumperFee’,v)}/>
<Input label=“Fuel Surcharge ($)” type=“number” value={form.fuelSurcharge} onChange={v=>set(‘fuelSurcharge’,v)}/>
<Input label=“Notes” value={form.notes} onChange={v=>set(‘notes’,v)} className=“lg:col-span-2”/>
</div>
<div className="flex gap-2 mt-4"><Btn onClick={addLoad} color="blue">Save Load</Btn><Btn onClick={()=>setShowAdd(false)} color=“slate”>Cancel</Btn></div>
</Card>
)}
<div className="flex gap-1 flex-wrap">
{[‘All’,…LOAD_STATUSES].map(s=>(
<button key={s} onClick={()=>setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter===s?'bg-blue-600 text-white':'bg-slate-700 text-slate-400 hover:text-white'}`}>{s}</button>
))}
</div>
<div className="space-y-2">
{filteredLoads.length===0&&<Card className="p-8 text-center"><p className="text-slate-500">No loads found</p></Card>}
{filteredLoads.map(load=>{
const driver=users.find(u=>u.id===load.driverId);
const ratePerMile=load.rate&&load.miles?(parseFloat(load.rate)/parseFloat(load.miles)).toFixed(2):null;
return(
<Card key={load.id} className={`p-4 cursor-pointer hover:border-slate-500 transition-all ${selected===load.id?'border-blue-500':''}`} onClick={()=>setSelected(selected===load.id?null:load.id)}>
<div className="flex items-center justify-between">
<div>
<div className="flex items-center gap-2 flex-wrap">
<p className="text-white font-semibold text-sm">{load.origin} <ArrowRight size={13} className="inline text-slate-500"/> {load.destination}</p>
<Badge label={load.status} color={STATUS_COLORS[load.status]}/>
</div>
<p className="text-slate-400 text-xs mt-0.5">{load.broker} • {fmtDate(load.pickupDate)}{load.deliveryDate&&` → ${fmtDate(load.deliveryDate)}`}</p>
{isAdmin&&driver&&<p className="text-slate-500 text-xs">Driver: {driver.name}</p>}
</div>
<div className="text-right">
<p className="text-green-400 font-bold">{fmt$(load.rate)}</p>
{ratePerMile&&<p className="text-slate-500 text-xs">${ratePerMile}/mi</p>}
</div>
</div>
{selected===load.id&&(
<div className=“mt-4 pt-4 border-t border-slate-700 space-y-3” onClick={e=>e.stopPropagation()}>
<div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
<div><p className="text-slate-500 text-xs">Miles</p><p className="text-white">{load.miles||’—’}</p></div>
<div><p className="text-slate-500 text-xs">Commodity</p><p className="text-white">{load.commodity||’—’}</p></div>
<div><p className="text-slate-500 text-xs">RC #</p><p className="text-white">{load.rcNumber||’—’}</p></div>
<div><p className="text-slate-500 text-xs">BOL #</p><p className="text-white">{load.bolNumber||’—’}</p></div>
<div><p className="text-slate-500 text-xs">Lumper</p><p className="text-white">{load.lumperFee?fmt$(load.lumperFee):’—’}</p></div>
<div><p className="text-slate-500 text-xs">Fuel Surcharge</p><p className="text-white">{load.fuelSurcharge?fmt$(load.fuelSurcharge):’—’}</p></div>
<div><p className="text-slate-500 text-xs">Broker Contact</p><p className="text-white">{load.brokerContact||’—’}</p></div>
<div><p className="text-slate-500 text-xs">Total Billable</p><p className="text-green-400 font-bold">{fmt$((parseFloat(load.rate)||0)+(parseFloat(load.lumperFee)||0)+(parseFloat(load.fuelSurcharge)||0))}</p></div>
</div>
{load.notes&&<p className="text-slate-400 text-xs italic">{load.notes}</p>}
<div className="flex gap-2 flex-wrap">
<p className="text-slate-500 text-xs self-center">Update status:</p>
{LOAD_STATUSES.map(s=><button key={s} onClick={()=>updateStatus(load.id,s)} className={`px-2 py-1 rounded text-xs ${load.status===s?'bg-blue-600 text-white':'bg-slate-700 text-slate-400 hover:text-white'}`}>{s}</button>)}
</div>
{currentUser.role===ROLES.DEVELOPER&&<button onClick={()=>deleteLoad(load.id)} className=“text-red-400 text-xs flex items-center gap-1 hover:text-red-300”><Trash2 size={12}/>Delete Load</button>}
</div>
)}
</Card>
);
})}
</div>
</div>
);
}

// ─── TRAILERS MODULE ──────────────────────────────────────────────────────────
function TrailersModule({currentUser,trailers,saveTrailers,users,trucks}){
const isAdmin=currentUser.role===ROLES.DEVELOPER||currentUser.role===ROLES.CARRIER_ADMIN;
const [showAdd,setShowAdd]=useState(false);
const [editForm,setEditForm]=useState(null);
const [form,setForm]=useState({number:’’,type:‘Dry Van’,year:’’,make:’’,model:’’,vin:’’,plate:’’,state:’’,assignedTo:’’,length:‘53’,color:‘White’,tires:{brand:’’,size:’’,tread:’’,lastReplaced:’’},brakes:{type:‘Air Drum’,lastInspected:’’,lastReplaced:’’},reefer:{hasReefer:false,brand:’’,model:’’,serial:’’,lastService:’’},annualInspection:’’,notes:’’});
const set=(k,v)=>setForm(f=>({…f,[k]:v}));
const setNested=(o,k,v)=>setForm(f=>({…f,[o]:{…f[o],[k]:v}}));
const setEF=(k,v)=>setEditForm(f=>({…f,[k]:v}));
const setEFN=(o,k,v)=>setEditForm(f=>({…f,[o]:{…f[o],[k]:v}}));
const addTrailer=()=>{ if(!form.number) return; saveTrailers(prev=>[{id:uid(),…form,deleted:false},…prev]); setShowAdd(false); };
const deleteTrailer=(id)=>{ if(!window.confirm(‘Delete trailer?’)||!window.confirm(‘Are you DOUBLE sure?’)) return; saveTrailers(prev=>prev.map(t=>t.id===id?{…t,deleted:true}:t)); };
const saveEdit=()=>{ saveTrailers(prev=>prev.map(t=>t.id===editForm.id?editForm:t)); setEditForm(null); };
const activeTrailers=trailers.filter(t=>!t.deleted);

return(
<div className="space-y-5">
<div className="flex items-center justify-between">
<div><h1 className="text-white text-2xl font-bold">Trailers</h1><p className="text-slate-400 text-sm">{activeTrailers.length} trailer{activeTrailers.length!==1?‘s’:’’} in fleet</p></div>
{isAdmin&&<Btn onClick={()=>setShowAdd(!showAdd)} color=“blue”><Plus size={15} className="inline mr-1"/>Add Trailer</Btn>}
</div>
{showAdd&&(
<Card className="p-5 border-blue-600/30">
<h3 className="text-white font-semibold mb-4">New Trailer</h3>
<div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
<Input label=“Trailer # *” value={form.number} onChange={v=>set(‘number’,v)} placeholder=“e.g. T-101”/>
<Select label=“Type” value={form.type} onChange={v=>set(‘type’,v)} options={TRAILER_TYPES}/>
<Input label=“Year” type=“number” value={form.year} onChange={v=>set(‘year’,v)}/>
<Input label=“Make” value={form.make} onChange={v=>set(‘make’,v)}/>
<Input label=“VIN” value={form.vin} onChange={v=>set(‘vin’,v)}/>
<Input label=“License Plate” value={form.plate} onChange={v=>set(‘plate’,v)}/>
<Input label=“State” value={form.state} onChange={v=>set(‘state’,v)}/>
<Input label=“Length (ft)” value={form.length} onChange={v=>set(‘length’,v)}/>
<Input label=“Annual Inspection” type=“date” value={form.annualInspection} onChange={v=>set(‘annualInspection’,v)}/>
</div>
<div className="flex gap-2 mt-4"><Btn onClick={addTrailer} color="blue">Save Trailer</Btn><Btn onClick={()=>setShowAdd(false)} color=“slate”>Cancel</Btn></div>
</Card>
)}
<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
{activeTrailers.length===0&&<Card className="p-8 text-center col-span-2"><p className="text-slate-500">No trailers in fleet yet</p></Card>}
{activeTrailers.map(t=>{
const inspDays=daysUntil(t.annualInspection);
return(
<Card key={t.id} className="p-4">
<div className="flex items-start justify-between mb-3">
<div>
<p className="text-white font-bold text-lg">{t.number}</p>
<div className="flex gap-2 mt-0.5 flex-wrap">
<Badge label={t.type} color="bg-blue-700"/>
{t.reefer?.hasReefer&&<Badge label="Reefer" color="bg-cyan-700"/>}
</div>
</div>
<div className="flex gap-1">
{isAdmin&&<button onClick={()=>setEditForm({…t})} className=“text-slate-400 hover:text-white p-1”><Edit size={15}/></button>}
{currentUser.role===ROLES.DEVELOPER&&<button onClick={()=>deleteTrailer(t.id)} className=“text-slate-600 hover:text-red-400 p-1”><Trash2 size={15}/></button>}
</div>
</div>
<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
{t.year&&<div><span className="text-slate-500">Year: </span><span className="text-slate-300">{t.year}</span></div>}
{t.vin&&<div><span className="text-slate-500">VIN: </span><span className="text-slate-300">{t.vin}</span></div>}
{t.plate&&<div><span className="text-slate-500">Plate: </span><span className="text-slate-300">{t.plate} {t.state}</span></div>}
{t.length&&<div><span className="text-slate-500">Length: </span><span className="text-slate-300">{t.length}ft</span></div>}
</div>
{t.annualInspection&&(
<div className={`mt-2 text-xs px-2 py-1 rounded flex items-center gap-1 ${inspDays!==null&&inspDays<30?'bg-red-900/30 text-red-400':inspDays!==null&&inspDays<90?'bg-amber-900/30 text-amber-400':'bg-slate-700 text-slate-400'}`}>
<Calendar size={11}/>Annual Inspection: {fmtDate(t.annualInspection)} {inspDays!==null&&`(${inspDays<0?'EXPIRED':inspDays+' days'} remaining)`}
</div>
)}
</Card>
);
})}
</div>
{editForm&&(
<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
<Card className="w-full max-w-2xl p-6 max-h-screen overflow-y-auto">
<div className="flex justify-between mb-4">
<h3 className="text-white font-bold">Edit Trailer {editForm.number}</h3>
<button onClick={()=>setEditForm(null)} className=“text-slate-400 hover:text-white”><X size={18}/></button>
</div>
<div className="grid grid-cols-2 gap-3">
<Input label=“Trailer #” value={editForm.number} onChange={v=>setEF(‘number’,v)}/>
<Select label=“Type” value={editForm.type} onChange={v=>setEF(‘type’,v)} options={TRAILER_TYPES}/>
<Input label=“Year” value={editForm.year} onChange={v=>setEF(‘year’,v)}/>
<Input label=“VIN” value={editForm.vin} onChange={v=>setEF(‘vin’,v)}/>
<Input label=“Plate” value={editForm.plate} onChange={v=>setEF(‘plate’,v)}/>
<Input label=“State” value={editForm.state} onChange={v=>setEF(‘state’,v)}/>
<Input label=“Annual Inspection” type=“date” value={editForm.annualInspection} onChange={v=>setEF(‘annualInspection’,v)}/>
<Input label=“Length (ft)” value={editForm.length} onChange={v=>setEF(‘length’,v)}/>
</div>
<div className="flex gap-2 mt-4"><Btn onClick={saveEdit} color="blue">Save</Btn><Btn onClick={()=>setEditForm(null)} color=“slate”>Cancel</Btn></div>
</Card>
</div>
)}
</div>
);
}

// ─── SERVICE RECORDS ──────────────────────────────────────────────────────────
function ServiceModule({currentUser,serviceRecords,saveServiceRecords,trucks,users}){
const isAdmin=currentUser.role===ROLES.DEVELOPER||currentUser.role===ROLES.CARRIER_ADMIN;
const myTruck=trucks.find(t=>t.driverId===currentUser.id);
const [showAdd,setShowAdd]=useState(false);
const [form,setForm]=useState({truckId:myTruck?.id||’’,type:‘Oil Change’,vendor:’’,date:today(),mileage:’’,cost:’’,nextDueMiles:’’,nextDue:’’,notes:’’});
const set=(k,v)=>setForm(f=>({…f,[k]:v}));
const records=serviceRecords.filter(s=>!s.deleted&&(isAdmin||s.truckId===myTruck?.id));
const upcoming=records.filter(s=>s.nextDue&&daysUntil(s.nextDue)!==null&&daysUntil(s.nextDue)<=45&&daysUntil(s.nextDue)>=0);
const addRecord=()=>{
if(!form.type||!form.date) return;
saveServiceRecords(prev=>[{id:uid(),…form,addedBy:currentUser.id,deleted:false},…prev]);
setShowAdd(false);
setForm({…form,notes:’’,cost:’’,mileage:’’,vendor:’’,nextDue:’’,nextDueMiles:’’});
};
const deleteRecord=(id)=>{
if(!window.confirm(‘Delete record?’)||!window.confirm(‘Are you DOUBLE sure?’)) return;
saveServiceRecords(prev=>prev.map(s=>s.id===id?{…s,deleted:true}:s));
};
const truckLabel=(id)=>{const t=trucks.find(t=>t.id===id); return t?`${t.make} ${t.unit||t.model}`:id;};
return(
<div className="space-y-5">
<div className="flex items-center justify-between">
<div><h1 className="text-white text-2xl font-bold">Service Records</h1><p className="text-slate-400 text-sm">{records.length} records</p></div>
<Btn onClick={()=>setShowAdd(!showAdd)} color=“blue”><Plus size={15} className="inline mr-1"/>Log Service</Btn>
</div>
{upcoming.length>0&&(
<Card className="p-4 border-amber-600/30">
<h3 className="text-amber-400 font-semibold text-sm mb-3 flex items-center gap-2"><Bell size={15}/>Upcoming Services</h3>
<div className="space-y-2">
{upcoming.map(s=>(
<div key={s.id} className="flex items-center justify-between text-sm">
<span className="text-slate-300">{s.type} — {truckLabel(s.truckId)}</span>
<span className={`${daysUntil(s.nextDue)<=7?'text-red-400':'text-amber-400'}`}>{daysUntil(s.nextDue)} days ({fmtDate(s.nextDue)})</span>
</div>
))}
</div>
</Card>
)}
{showAdd&&(
<Card className="p-5 border-blue-600/30">
<h3 className="text-white font-semibold mb-4">Log Service Record</h3>
<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
{isAdmin&&<Select label=“Truck” value={form.truckId} onChange={v=>set(‘truckId’,v)} options={trucks.map(t=>t.id)}/>}
<Select label=“Service Type” value={form.type} onChange={v=>set(‘type’,v)} options={SERVICE_TYPES}/>
<Input label=“Vendor / Shop” value={form.vendor} onChange={v=>set(‘vendor’,v)} placeholder=“Mike’s Inc, Love’s, TA…”/>
<Input label=“Service Date” type=“date” value={form.date} onChange={v=>set(‘date’,v)}/>
<Input label=“Mileage at Service” type=“number” value={form.mileage} onChange={v=>set(‘mileage’,v)}/>
<Input label=“Cost ($)” type=“number” value={form.cost} onChange={v=>set(‘cost’,v)}/>
<Input label=“Next Due Date” type=“date” value={form.nextDue} onChange={v=>set(‘nextDue’,v)}/>
<Input label=“Next Due Miles” type=“number” value={form.nextDueMiles} onChange={v=>set(‘nextDueMiles’,v)}/>
<Input label=“Notes” value={form.notes} onChange={v=>set(‘notes’,v)} className=“lg:col-span-2”/>
</div>
<div className="flex gap-2 mt-4"><Btn onClick={addRecord} color="blue">Save Record</Btn><Btn onClick={()=>setShowAdd(false)} color=“slate”>Cancel</Btn></div>
</Card>
)}
<div className="space-y-2">
{records.length===0&&<Card className="p-8 text-center"><p className="text-slate-500">No service records yet</p></Card>}
{records.map(s=>(
<Card key={s.id} className="p-4">
<div className="flex items-start justify-between">
<div>
<div className="flex items-center gap-2 flex-wrap">
<p className="text-white font-semibold text-sm">{s.type}</p>
<Badge label={truckLabel(s.truckId)} color="bg-slate-600"/>
{s.nextDue&&daysUntil(s.nextDue)!==null&&daysUntil(s.nextDue)<=30&&<Badge label={`Due in ${daysUntil(s.nextDue)}d`} color={daysUntil(s.nextDue)<0?‘bg-red-600’:‘bg-amber-600’}/>}
</div>
<p className="text-slate-400 text-xs mt-0.5">{fmtDate(s.date)}{s.vendor&&` • ${s.vendor}`}{s.mileage&&` • ${Number(s.mileage).toLocaleString()} mi`}</p>
{s.nextDue&&<p className="text-slate-500 text-xs">Next: {fmtDate(s.nextDue)}{s.nextDueMiles&&` or ${Number(s.nextDueMiles).toLocaleString()} mi`}</p>}
{s.notes&&<p className="text-slate-500 text-xs italic mt-1">{s.notes}</p>}
</div>
<div className="flex items-center gap-2">
<p className="text-green-400 font-semibold text-sm">{s.cost?fmt$(s.cost):’’}</p>
{currentUser.role===ROLES.DEVELOPER&&<button onClick={()=>deleteRecord(s.id)} className=“text-slate-600 hover:text-red-400”><Trash2 size={14}/></button>}
</div>
</div>
</Card>
))}
</div>
</div>
);
}

// ─── DOCUMENTS MODULE ─────────────────────────────────────────────────────────
function DocumentsModule({currentUser,documents,saveDocuments,users}){
const isAdmin=currentUser.role===ROLES.DEVELOPER||currentUser.role===ROLES.CARRIER_ADMIN;
const myDocs=isAdmin?documents.filter(d=>!d.deleted):documents.filter(d=>!d.deleted&&d.ownerId===currentUser.id);
const fileRef=useRef();
const [form,setForm]=useState({type:‘IFTA Certificate’,description:’’,expiryDate:’’,ownerId:currentUser.id});
const [pendingFile,setPendingFile]=useState(null);
const [showAdd,setShowAdd]=useState(false);
const set=(k,v)=>setForm(f=>({…f,[k]:v}));
const handleFile=(e)=>{
const file=e.target.files[0]; if(!file) return;
const reader=new FileReader();
reader.onload=ev=>setPendingFile({name:file.name,data:ev.target.result,size:file.size,type:file.type});
reader.readAsDataURL(file);
};
const handleSave=()=>{
if(!pendingFile&&!form.description) return;
const doc={id:uid(),…form,fileName:pendingFile?.name,fileData:pendingFile?.data,fileType:pendingFile?.type,uploadedAt:today(),uploadedBy:currentUser.id,deleted:false};
saveDocuments(prev=>[doc,…prev]);
setShowAdd(false); setPendingFile(null);
setForm({type:‘IFTA Certificate’,description:’’,expiryDate:’’,ownerId:currentUser.id});
};
const deleteDoc=(id)=>{
if(!window.confirm(‘Delete document?’)||!window.confirm(‘Are you DOUBLE sure?’)) return;
saveDocuments(prev=>prev.map(d=>d.id===id?{…d,deleted:true}:d));
};
const grouped=DOC_TYPES.reduce((acc,type)=>{
const items=myDocs.filter(d=>d.type===type);
if(items.length>0) acc[type]=items;
return acc;
},{});
const owner=(id)=>users.find(u=>u.id===id);

return(
<div className="space-y-5">
<div className="flex items-center justify-between">
<div><h1 className="text-white text-2xl font-bold flex items-center gap-2"><Shield className="text-blue-400"/>Documents</h1><p className="text-slate-400 text-sm">DOT compliance documents vault</p></div>
<Btn onClick={()=>setShowAdd(!showAdd)} color=“blue”><Upload size={15} className="inline mr-1"/>Upload Doc</Btn>
</div>
{showAdd&&(
<Card className="p-5 border-blue-600/30">
<h3 className="text-white font-semibold mb-4">Upload Document</h3>
<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
<Select label=“Document Type” value={form.type} onChange={v=>set(‘type’,v)} options={DOC_TYPES}/>
{isAdmin&&<Select label=“Belongs To” value={form.ownerId} onChange={v=>set(‘ownerId’,v)} options={users.filter(u=>!u.deleted).map(u=>u.id)}/>}
<Input label=“Description” value={form.description} onChange={v=>set(‘description’,v)} placeholder=“e.g. 2026 Certificate”/>
<Input label=“Expiry Date” type=“date” value={form.expiryDate} onChange={v=>set(‘expiryDate’,v)}/>
</div>
<div className="mt-3">
<label className="text-slate-400 text-xs mb-1 block">File</label>
<div onClick={()=>fileRef.current?.click()} className=“border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-lg p-6 text-center cursor-pointer transition-all”>
{pendingFile?<div className="text-green-400"><Check size={24} className="mx-auto mb-1"/><p className="text-sm font-medium">{pendingFile.name}</p><p className="text-xs text-slate-500">{(pendingFile.size/1024).toFixed(1)} KB</p></div>:<div className="text-slate-500"><Upload size={24} className="mx-auto mb-1"/><p className="text-sm">Click to select file</p><p className="text-xs">PDF, JPG, PNG supported</p></div>}
<input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile}/>
</div>
</div>
<div className="flex gap-2 mt-4"><Btn onClick={handleSave} color="blue">Save Document</Btn><Btn onClick={()=>{setShowAdd(false);setPendingFile(null);}} color=“slate”>Cancel</Btn></div>
</Card>
)}
{Object.keys(grouped).length===0&&(
<Card className="p-12 text-center"><Shield size={40} className="text-slate-700 mx-auto mb-3"/><p className="text-slate-500">No documents uploaded yet</p></Card>
)}
{Object.entries(grouped).map(([type,docs])=>(
<div key={type}>
<h3 className="text-slate-400 text-xs font-semibold uppercase mb-2">{type}</h3>
<div className="space-y-2">
{docs.map(doc=>{
const expDays=daysUntil(doc.expiryDate);
const o=owner(doc.ownerId);
return(
<Card key={doc.id} className={`p-4 ${expDays!==null&&expDays<30?'border-red-600/40':expDays!==null&&expDays<90?'border-amber-600/40':''}`}>
<div className="flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="w-9 h-9 bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0"><FileText size={18} className="text-blue-300"/></div>
<div>
<p className="text-white text-sm font-medium">{doc.description||doc.type}</p>
<div className="flex items-center gap-2 mt-0.5 flex-wrap">
{o&&isAdmin&&<span className="text-slate-500 text-xs">{o.name} •</span>}
<span className="text-slate-500 text-xs">Uploaded {fmtDate(doc.uploadedAt)}</span>
{doc.expiryDate&&<span className={`text-xs ${expDays!==null&&expDays<0?'text-red-400':expDays!==null&&expDays<90?'text-amber-400':'text-slate-500'}`}>Expires {fmtDate(doc.expiryDate)}{expDays!==null&&(expDays<0?’ — EXPIRED’:expDays<30?` — ${expDays}d left`:’’)}</span>}
</div>
</div>
</div>
<div className="flex items-center gap-2">
{doc.fileData&&<a href={doc.fileData} download={doc.fileName} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"><Download size={14}/>View</a>}
{currentUser.role===ROLES.DEVELOPER&&<button onClick={()=>deleteDoc(doc.id)} className=“text-slate-600 hover:text-red-400”><Trash2 size={14}/></button>}
</div>
</div>
</Card>
);
})}
</div>
</div>
))}
<Card className="p-5">
<h3 className="text-white font-semibold mb-4 flex items-center gap-2"><CheckCircle size={16} className="text-green-400"/>DOT Compliance Checklist</h3>
<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
{DOC_TYPES.filter(t=>![‘Other’].includes(t)).map(type=>{
const has=myDocs.some(d=>d.type===type);
return(
<div key={type} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${has?'bg-green-900/20 text-green-400':'bg-slate-700/50 text-slate-400'}`}>
{has?<CheckCircle size={14}/>:<X size={14} className="text-slate-600"/>}{type}
</div>
);
})}
</div>
</Card>
</div>
);
}

// ─── FUEL MODULE ──────────────────────────────────────────────────────────────
function FuelModule({currentUser,trucks}){
const [fuelLogs,saveFuelLogs,loaded]=useStorage(‘ettr_fuel_logs’,[]);
const myTruck=trucks.find(t=>t.driverId===currentUser.id);
const isAdmin=currentUser.role===ROLES.DEVELOPER||currentUser.role===ROLES.CARRIER_ADMIN;
const [showAdd,setShowAdd]=useState(false);
const [form,setForm]=useState({truckId:myTruck?.id||’’,date:today(),location:’’,state:’’,gallons:’’,pricePer:’’,total:’’,odometer:’’,nastc:false,fuelCard:’’,notes:’’});
const set=(k,v)=>setForm(f=>({…f,[k]:v}));
const myLogs=(isAdmin?fuelLogs:fuelLogs.filter(l=>l.truckId===myTruck?.id)).filter(l=>!l.deleted);
const totalGallons=myLogs.reduce((s,l)=>s+(parseFloat(l.gallons)||0),0);
const totalSpent=myLogs.reduce((s,l)=>s+(parseFloat(l.total)||0),0);
const addLog=()=>{
saveFuelLogs(prev=>[{id:uid(),…form,addedBy:currentUser.id,deleted:false},…prev]);
setShowAdd(false);
setForm({…form,gallons:’’,pricePer:’’,total:’’,odometer:’’,location:’’,notes:’’});
};
const US_STATES=[‘AL’,‘AR’,‘AZ’,‘CA’,‘CO’,‘CT’,‘DE’,‘FL’,‘GA’,‘IA’,‘ID’,‘IL’,‘IN’,‘KS’,‘KY’,‘LA’,‘MA’,‘MD’,‘ME’,‘MI’,‘MN’,‘MO’,‘MS’,‘MT’,‘NC’,‘ND’,‘NE’,‘NH’,‘NJ’,‘NM’,‘NV’,‘NY’,‘OH’,‘OK’,‘OR’,‘PA’,‘RI’,‘SC’,‘SD’,‘TN’,‘TX’,‘UT’,‘VA’,‘VT’,‘WA’,‘WI’,‘WV’,‘WY’];
return(
<div className="space-y-5">
<div className="flex items-center justify-between">
<div><h1 className="text-white text-2xl font-bold flex items-center gap-2"><Fuel className="text-amber-400"/>Fuel & IFTA</h1><p className="text-slate-400 text-sm">Fuel logs for tax reporting</p></div>
<Btn onClick={()=>setShowAdd(!showAdd)} color=“amber”><Plus size={15} className="inline mr-1"/>Log Fuel</Btn>
</div>
<div className="grid grid-cols-3 gap-3">
<StatCard label="Total Gallons" value={totalGallons.toFixed(1)} icon={Fuel} color="text-amber-400"/>
<StatCard label="Total Spent" value={fmt$(totalSpent)} icon={DollarSign} color="text-red-400"/>
<StatCard label="Avg $/Gal" value={totalGallons>0?`$${(totalSpent/totalGallons).toFixed(3)}`:’—’} icon={TrendingUp} color=“text-green-400”/>
</div>
<Card className="p-4 border-blue-600/30">
<div className="flex items-center justify-between">
<div><h3 className="text-white font-semibold text-sm flex items-center gap-2"><MapPin size={15} className="text-blue-400"/>NASTC Fuel Network</h3><p className="text-slate-400 text-xs mt-0.5">Find discounted fuel stops on the NASTC network map</p></div>
<a href="https://www.nastc.com/fuel-program" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400 text-sm hover:text-blue-300"><ExternalLink size={14}/>Open Map</a>
</div>
</Card>
{showAdd&&(
<Card className="p-5 border-amber-600/30">
<h3 className="text-white font-semibold mb-4">Log Fuel Stop</h3>
<div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
<Input label=“Date” type=“date” value={form.date} onChange={v=>set(‘date’,v)}/>
<Input label=“Location / Stop” value={form.location} onChange={v=>set(‘location’,v)} placeholder=“Pilot Flying J #123”/>
<Select label=“State” value={form.state} onChange={v=>set(‘state’,v)} options={US_STATES}/>
<Input label=“Gallons” type=“number” value={form.gallons} onChange={v=>{set(‘gallons’,v); if(form.pricePer) set(‘total’,(parseFloat(v)*parseFloat(form.pricePer)).toFixed(2));}}/>
<Input label=“Price/Gal ($)” type=“number” value={form.pricePer} onChange={v=>{set(‘pricePer’,v); if(form.gallons) set(‘total’,(parseFloat(form.gallons)*parseFloat(v)).toFixed(2));}}/>
<Input label=“Total ($)” type=“number” value={form.total} onChange={v=>set(‘total’,v)}/>
<Input label=“Odometer” type=“number” value={form.odometer} onChange={v=>set(‘odometer’,v)}/>
<Input label=“Fuel Card Used” value={form.fuelCard} onChange={v=>set(‘fuelCard’,v)} placeholder=“NASTC, EFS, Comdata…”/>
<div className="flex items-center gap-2 pt-5">
<input type=“checkbox” checked={form.nastc} onChange={e=>set(‘nastc’,e.target.checked)} className=“rounded”/>
<label className="text-slate-300 text-sm">NASTC Stop</label>
</div>
</div>
<div className="flex gap-2 mt-4"><Btn onClick={addLog} color="amber">Save</Btn><Btn onClick={()=>setShowAdd(false)} color=“slate”>Cancel</Btn></div>
</Card>
)}
{myLogs.length>0&&(
<Card className="p-4">
<h3 className="text-white font-semibold mb-3 text-sm">IFTA State Summary</h3>
<div className="overflow-x-auto">
<table className="w-full text-xs">
<thead><tr className="text-slate-500 border-b border-slate-700"><th className="text-left py-1">State</th><th className="text-right py-1">Gallons</th><th className="text-right py-1">Spent</th><th className="text-right py-1">Stops</th></tr></thead>
<tbody>
{Object.entries(myLogs.reduce((acc,l)=>{
if(!l.state) return acc;
if(!acc[l.state]) acc[l.state]={gallons:0,spent:0,stops:0};
acc[l.state].gallons+=parseFloat(l.gallons)||0;
acc[l.state].spent+=parseFloat(l.total)||0;
acc[l.state].stops++;
return acc;
},{})).map(([state,data])=>(
<tr key={state} className="border-b border-slate-800 text-slate-300">
<td className="py-1">{state}</td>
<td className="text-right">{data.gallons.toFixed(1)}</td>
<td className="text-right">{fmt$(data.spent)}</td>
<td className="text-right">{data.stops}</td>
</tr>
))}
</tbody>
</table>
</div>
</Card>
)}
<div className="space-y-2">
{myLogs.length===0&&<Card className="p-8 text-center"><p className="text-slate-500">No fuel logs yet</p></Card>}
{myLogs.slice(0,20).map(l=>(
<Card key={l.id} className="p-3">
<div className="flex items-center justify-between text-sm">
<div>
<p className="text-white font-medium">{l.location||‘Fuel Stop’} <span className="text-slate-500">({l.state})</span></p>
<p className="text-slate-500 text-xs">{fmtDate(l.date)} • {l.gallons} gal @ ${l.pricePer}/gal{l.nastc&&’ • 🟢 NASTC’}</p>
</div>
<div className="text-right">
<p className="text-amber-400 font-semibold">{fmt$(l.total)}</p>
{l.odometer&&<p className="text-slate-500 text-xs">{Number(l.odometer).toLocaleString()} mi</p>}
</div>
</div>
</Card>
))}
</div>
</div>
);
}

// ─── ELD LOGS ─────────────────────────────────────────────────────────────────
function ELDModule({currentUser}){
const [logs,saveLogs]=useStorage(‘ettr_eld_logs’,[]);
const fileRef=useRef();
const [showUpload,setShowUpload]=useState(false);
const [form,setForm]=useState({date:today(),hosDriving:’’,hosOnDuty:’’,hosSleeper:’’,hosOffDuty:’’,startOdo:’’,endOdo:’’,notes:’’});
const set=(k,v)=>setForm(f=>({…f,[k]:v}));
const handleFile=(e)=>{
const file=e.target.files[0]; if(!file) return;
const reader=new FileReader();
reader.onload=ev=>{
saveLogs(prev=>[{id:uid(),date:form.date,fileName:file.name,fileData:ev.target.result,uploadedAt:today(),uploadedBy:currentUser.id,driverId:currentUser.id,…form,deleted:false},…prev]);
setShowUpload(false);
};
reader.readAsDataURL(file);
};
const myLogs=logs.filter(l=>!l.deleted&&l.driverId===currentUser.id);
return(
<div className="space-y-5">
<div className="flex items-center justify-between">
<div><h1 className="text-white text-2xl font-bold flex items-center gap-2"><Clock className="text-cyan-400"/>ELD Logs</h1><p className="text-slate-400 text-sm">BlueInk Tech • Hours of Service</p></div>
<Btn onClick={()=>setShowUpload(!showUpload)} color=“blue”><Upload size={15} className="inline mr-1"/>Upload Log</Btn>
</div>
<Card className="p-4 border-cyan-600/30">
<div className="flex items-center justify-between">
<div><h3 className="text-white font-semibold text-sm">BlueInk Tech ELD</h3><p className="text-slate-400 text-xs">Your electronic logging device provider</p></div>
<a href="https://www.blueinktech.com" target="_blank" rel="noreferrer" className="text-cyan-400 text-xs hover:text-cyan-300 flex items-center gap-1"><ExternalLink size={13}/>Open App</a>
</div>
</Card>
{showUpload&&(
<Card className="p-5 border-blue-600/30">
<h3 className="text-white font-semibold mb-4">Upload ELD Log</h3>
<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
<Input label=“Date” type=“date” value={form.date} onChange={v=>set(‘date’,v)} className=“col-span-2”/>
<Input label=“Driving (hrs)” type=“number” value={form.hosDriving} onChange={v=>set(‘hosDriving’,v)}/>
<Input label=“On Duty (hrs)” type=“number” value={form.hosOnDuty} onChange={v=>set(‘hosOnDuty’,v)}/>
<Input label=“Sleeper (hrs)” type=“number” value={form.hosSleeper} onChange={v=>set(‘hosSleeper’,v)}/>
<Input label=“Off Duty (hrs)” type=“number” value={form.hosOffDuty} onChange={v=>set(‘hosOffDuty’,v)}/>
<Input label=“Start Odometer” type=“number” value={form.startOdo} onChange={v=>set(‘startOdo’,v)}/>
<Input label=“End Odometer” type=“number” value={form.endOdo} onChange={v=>set(‘endOdo’,v)}/>
</div>
<Input label=“Notes” value={form.notes} onChange={v=>set(‘notes’,v)} className=“mt-3”/>
<div className="mt-3">
<div onClick={()=>fileRef.current?.click()} className=“border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-lg p-4 text-center cursor-pointer”>
<Upload size={20} className="text-slate-500 mx-auto mb-1"/><p className="text-slate-400 text-sm">Click to attach log file (optional)</p>
<input ref={fileRef} type="file" accept=".pdf,.csv,.xml,image/*" className="hidden" onChange={handleFile}/>
</div>
</div>
<div className="flex gap-2 mt-4">
<Btn onClick={()=>{saveLogs(prev=>[{id:uid(),…form,uploadedAt:today(),driverId:currentUser.id,deleted:false},…prev]); setShowUpload(false);}} color=“blue”>Save Entry</Btn>
<Btn onClick={()=>setShowUpload(false)} color=“slate”>Cancel</Btn>
</div>
</Card>
)}
<div className="space-y-2">
{myLogs.length===0&&<Card className="p-8 text-center"><p className="text-slate-500">No ELD logs uploaded yet</p></Card>}
{myLogs.map(l=>(
<Card key={l.id} className="p-4">
<div className="flex items-center justify-between">
<div>
<p className="text-white font-semibold text-sm">{fmtDate(l.date)}</p>
<div className="flex gap-4 mt-1 text-xs text-slate-400">
{l.hosDriving&&<span>🚛 Driving: {l.hosDriving}h</span>}
{l.hosOnDuty&&<span>⚙️ On Duty: {l.hosOnDuty}h</span>}
{l.hosSleeper&&<span>😴 Sleeper: {l.hosSleeper}h</span>}
{l.hosOffDuty&&<span>🏠 Off: {l.hosOffDuty}h</span>}
</div>
{l.startOdo&&l.endOdo&&<p className="text-slate-500 text-xs">{Number(l.endOdo-l.startOdo).toLocaleString()} miles driven</p>}
{l.fileName&&<p className="text-blue-400 text-xs flex items-center gap-1 mt-1"><FileText size={11}/>{l.fileName}</p>}
</div>
{l.fileData&&<a href={l.fileData} download={l.fileName} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"><Download size={14}/>View</a>}
</div>
</Card>
))}
</div>
</div>
);
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
function ReportsModule({currentUser,loads,pettyCash,serviceRecords,users}){
const isAdmin=currentUser.role===ROLES.DEVELOPER||currentUser.role===ROLES.CARRIER_ADMIN;
const [period,setPeriod]=useState(‘monthly’);
const [driverFilter,setDriverFilter]=useState(isAdmin?‘all’:currentUser.id);
const [year,setYear]=useState(new Date().getFullYear());
const [month,setMonth]=useState(new Date().getMonth()+1);
const filterLoads=(l)=>{
if(l.deleted) return false;
if(driverFilter!==‘all’&&l.driverId!==driverFilter) return false;
if(!l.deliveryDate&&!l.pickupDate) return false;
const d=new Date((l.deliveryDate||l.pickupDate)+‘T12:00:00’);
if(period===‘yearly’) return d.getFullYear()===year;
if(period===‘monthly’) return d.getFullYear()===year&&d.getMonth()+1===month;
if(period===‘weekly’){const now=new Date(); const wkAgo=new Date(now-7*86400000); return d>=wkAgo&&d<=now;}
if(period===‘daily’){return (l.deliveryDate||l.pickupDate)===today();}
return true;
};
const filteredLoads=loads.filter(filterLoads);
const paidLoads=filteredLoads.filter(l=>l.status===‘Paid’);
const revenue=paidLoads.reduce((s,l)=>s+(parseFloat(l.rate)||0),0);
const miles=filteredLoads.reduce((s,l)=>s+(parseFloat(l.miles)||0),0);
const rpm=miles>0?(revenue/miles).toFixed(2):0;
const MONTHS=[‘Jan’,‘Feb’,‘Mar’,‘Apr’,‘May’,‘Jun’,‘Jul’,‘Aug’,‘Sep’,‘Oct’,‘Nov’,‘Dec’];
return(
<div className="space-y-5">
<h1 className="text-white text-2xl font-bold flex items-center gap-2"><BarChart2 className="text-purple-400"/>Reports</h1>
<Card className="p-4">
<div className="flex gap-3 flex-wrap items-end">
<div>
<label className="text-slate-400 text-xs mb-1 block">Period</label>
<div className="flex gap-1">
{[‘daily’,‘weekly’,‘monthly’,‘yearly’].map(p=>(
<button key={p} onClick={()=>setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period===p?'bg-purple-600 text-white':'bg-slate-700 text-slate-400 hover:text-white'}`}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
))}
</div>
</div>
{isAdmin&&<Select label=“Driver” value={driverFilter} onChange={setDriverFilter} options={[‘all’,…users.filter(u=>!u.deleted).map(u=>u.id)]}/>}
{(period===‘monthly’||period===‘yearly’)&&<Select label=“Year” value={String(year)} onChange={v=>setYear(parseInt(v))} options={[‘2024’,‘2025’,‘2026’,‘2027’]}/>}
{period===‘monthly’&&<Select label=“Month” value={String(month)} onChange={v=>setMonth(parseInt(v))} options={MONTHS.map((m,i)=>String(i+1))}/>}
</div>
</Card>
<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
<StatCard label="Total Revenue" value={fmt$(revenue)} icon={TrendingUp} color="text-green-400"/>
<StatCard label=“Total Loads” value={filteredLoads.length} sub={`${paidLoads.length} paid`} icon={Package} color=“text-blue-400”/>
<StatCard label="Total Miles" value={miles>0?miles.toLocaleString():0} icon={Truck} color=“text-amber-400”/>
<StatCard label="Revenue/Mile" value={rpm>0?`$${rpm}`:’-’} icon={DollarSign} color=“text-purple-400”/>
</div>
<Card className="p-5">
<h3 className="text-white font-semibold mb-4">Load Breakdown</h3>
{filteredLoads.length===0?<p className="text-slate-500 text-sm">No loads in this period</p>:(
<div className="space-y-2">
{filteredLoads.map(l=>{
const driver=users.find(u=>u.id===l.driverId);
return(
<div key={l.id} className="flex items-center justify-between py-2 border-b border-slate-700 text-sm">
<div>
<p className="text-white">{l.origin} → {l.destination}</p>
<p className="text-slate-500 text-xs">{l.broker}{isAdmin&&driver?` • ${driver.name}`:’’} • {fmtDate(l.pickupDate)}</p>
</div>
<div className="text-right">
<p className="text-green-400 font-semibold">{fmt$(l.rate)}</p>
<Badge label={l.status} color={STATUS_COLORS[l.status]}/>
</div>
</div>
);
})}
<div className="flex justify-between pt-2 font-bold text-sm">
<span className="text-white">Total</span>
<span className="text-green-400">{fmt$(filteredLoads.reduce((s,l)=>s+(parseFloat(l.rate)||0),0))}</span>
</div>
</div>
)}
</Card>
</div>
);
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function AdminModule({currentUser,users,saveUsers,trucks,saveTrucks}){
const isDev=currentUser.role===ROLES.DEVELOPER;
const [showAdd,setShowAdd]=useState(false);
const [form,setForm]=useState({name:’’,email:’’,phone:’’,password:‘ettr2024’,role:ROLES.DRIVER,carrierRole:‘Driver’,cdlState:’’,truckId:’’});
const set=(k,v)=>setForm(f=>({…f,[k]:v}));
const addUser=()=>{
if(!form.name||!form.email) return;
saveUsers(prev=>[{id:uid(),…form,deleted:false},…prev]);
setShowAdd(false);
setForm({name:’’,email:’’,phone:’’,password:‘ettr2024’,role:ROLES.DRIVER,carrierRole:‘Driver’,cdlState:’’,truckId:’’});
};
const toggleDelete=(id)=>{
if(id===currentUser.id){alert(‘Cannot delete yourself.’);return;}
const u=users.find(u=>u.id===id);
if(!u.deleted){if(!window.confirm(`Deactivate ${u.name}?`)||!window.confirm(‘Are you DOUBLE sure?’)) return;}
saveUsers(prev=>prev.map(u=>u.id===id?{…u,deleted:!u.deleted}:u));
};
return(
<div className="space-y-5">
<div className="flex items-center justify-between">
<div><h1 className="text-white text-2xl font-bold flex items-center gap-2"><Settings className="text-slate-400"/>{isDev?‘System Admin’:‘Carrier Admin’}</h1></div>
<Btn onClick={()=>setShowAdd(!showAdd)} color=“blue”><Plus size={15} className="inline mr-1"/>Add User</Btn>
</div>
<Card className="p-5">
<h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Award size={16} className="text-amber-400"/>Carrier: {CARRIER.name}</h3>
<div className="grid grid-cols-2 gap-3 text-sm">
<div><p className="text-slate-500 text-xs">DOT</p><p className="text-white">{CARRIER.dot}</p></div>
<div><p className="text-slate-500 text-xs">HQ</p><p className="text-white">{CARRIER.address}</p></div>
<div><p className="text-slate-500 text-xs">Active Drivers</p><p className="text-white">{users.filter(u=>!u.deleted).length}</p></div>
</div>
</Card>
{showAdd&&(
<Card className="p-5 border-blue-600/30">
<h3 className="text-white font-semibold mb-4">Add New User</h3>
<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
<Input label=“Full Name *” value={form.name} onChange={v=>set(‘name’,v)}/>
<Input label=“Email *” value={form.email} onChange={v=>set(‘email’,v)}/>
<Input label=“Phone” value={form.phone} onChange={v=>set(‘phone’,v)}/>
<Input label=“Temp Password” value={form.password} onChange={v=>set(‘password’,v)}/>
<Select label=“App Role” value={form.role} onChange={v=>set(‘role’,v)} options={Object.values(ROLES)}/>
<Select label=“Carrier Role” value={form.carrierRole} onChange={v=>set(‘carrierRole’,v)} options={[‘Driver’,‘Lease Operator’,‘Owner Operator’,‘Carrier Admin’,‘Accountant’]}/>
</div>
<div className="flex gap-2 mt-4"><Btn onClick={addUser} color="blue">Create User</Btn><Btn onClick={()=>setShowAdd(false)} color=“slate”>Cancel</Btn></div>
</Card>
)}
<div className="space-y-3">
{users.map(u=>(
<Card key={u.id} className={`p-4 ${u.deleted?'opacity-50':''}`}>
<div className="flex items-center justify-between">
<div className="flex items-center gap-3">
<div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${u.id==='tim_smith'?'bg-slate-700 text-white':'bg-blue-700 text-white'}`}>{u.name[0]}</div>
<div>
<p className="text-white font-semibold text-sm">{u.name} {u.id===currentUser.id&&<span className="text-slate-500 text-xs">(you)</span>}</p>
<p className="text-slate-400 text-xs">{u.email} • {u.role}</p>
</div>
</div>
<div className="flex items-center gap-2">
<Badge label={u.deleted?‘Inactive’:‘Active’} color={u.deleted?‘bg-red-700’:‘bg-green-700’}/>
{isDev&&u.id!==currentUser.id&&(
<button onClick={()=>toggleDelete(u.id)} className={`text-xs px-2 py-1 rounded ${u.deleted?'bg-green-700 text-white hover:bg-green-600':'bg-red-900/50 text-red-400 hover:bg-red-800'}`}>{u.deleted?‘Reactivate’:‘Deactivate’}</button>
)}
</div>
</div>
</Card>
))}
</div>
{isDev&&(
<Card className="p-5 border-red-600/20">
<h3 className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-2"><AlertTriangle size={15}/>Data Safety</h3>
<p className="text-slate-400 text-xs">All records use soft-delete — data is never permanently destroyed. Double confirmation required for all destructive actions.</p>
</Card>
)}
</div>
);
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ETTRApp(){
const [currentUser,setCurrentUser]=useState(null);
const [page,setPage]=useState(‘dashboard’);
const [collapsed,setCollapsed]=useState(false);
const [users,saveUsers,usersLoaded]=useStorage(‘ettr_users’,INITIAL_USERS);
const [pettyCash,savePettyCash,pcLoaded]=useStorage(‘ettr_petty_cash’,INITIAL_PETTY_CASH);
const [loads,saveLoads,loadsLoaded]=useStorage(‘ettr_loads’,[]);
const [trailers,saveTrailers,tLoaded]=useStorage(‘ettr_trailers’,[]);
const [serviceRecords,saveServiceRecords,srLoaded]=useStorage(‘ettr_service’,[]);
const [documents,saveDocuments,docsLoaded]=useStorage(‘ettr_documents’,[]);
const [trucks,saveTrucks,trucksLoaded]=useStorage(‘ettr_trucks’,INITIAL_TRUCKS);
const allLoaded=usersLoaded&&pcLoaded&&loadsLoaded&&tLoaded&&srLoaded&&docsLoaded&&trucksLoaded;

if(!allLoaded) return(
<div className="min-h-screen bg-slate-900 flex items-center justify-center">
<div className="text-center"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"/><p className="text-slate-400">Loading ETTR Fleet…</p></div>
</div>
);
if(!currentUser) return <LoginScreen users={users} onLogin={u=>{setCurrentUser(u); setPage(‘dashboard’);}}/>;

const sideW=collapsed?64:224;
const allData={loads,pettyCash,serviceRecords,trailers,trucks,documents,users};
const liveUser=users.find(u=>u.id===currentUser.id)||currentUser;

const renderPage=()=>{
switch(page){
case ‘dashboard’: return <Dashboard user={liveUser} allData={allData} setPage={setPage}/>;
case ‘profile’: return <ProfileModule user={liveUser} users={users} saveUsers={saveUsers} currentUser={liveUser}/>;
case ‘truck’: return <TruckModule user={liveUser} trucks={trucks} saveTrucks={saveTrucks}/>;
case ‘petty_cash’: return <PettyCashModule currentUser={liveUser} users={users} pettyCash={pettyCash} savePettyCash={savePettyCash}/>;
case ‘loads’: return <LoadsModule currentUser={liveUser} users={users} loads={loads} saveLoads={saveLoads} trucks={trucks}/>;
case ‘trailers’: return <TrailersModule currentUser={liveUser} trailers={trailers} saveTrailers={saveTrailers} users={users} trucks={trucks}/>;
case ‘service’: return <ServiceModule currentUser={liveUser} serviceRecords={serviceRecords} saveServiceRecords={saveServiceRecords} trucks={trucks} users={users}/>;
case ‘documents’: return <DocumentsModule currentUser={liveUser} documents={documents} saveDocuments={saveDocuments} users={users}/>;
case ‘fuel’: return <FuelModule currentUser={liveUser} trucks={trucks}/>;
case ‘eld’: return <ELDModule currentUser={liveUser}/>;
case ‘reports’: return <ReportsModule currentUser={liveUser} loads={loads} pettyCash={pettyCash} serviceRecords={serviceRecords} users={users}/>;
case ‘admin’: return <AdminModule currentUser={liveUser} users={users} saveUsers={saveUsers} trucks={trucks} saveTrucks={saveTrucks}/>;
default: return <Dashboard user={liveUser} allData={allData} setPage={setPage}/>;
}
};

return(
<div className=“min-h-screen bg-slate-900 text-white” style={{fontFamily:“system-ui,sans-serif”}}>
<Sidebar user={liveUser} page={page} setPage={setPage} onLogout={()=>setCurrentUser(null)} collapsed={collapsed} setCollapsed={setCollapsed}/>
<main style={{marginLeft:sideW,transition:‘margin 0.2s’,padding:‘24px’,minHeight:‘100vh’}}>
<div style={{maxWidth:1100}}>
{renderPage()}
</div>
</main>
</div>
);
}
