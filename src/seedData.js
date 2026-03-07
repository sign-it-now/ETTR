// ─────────────────────────────────────────────────────────────────────────────
// ETTR — SEED DATA (initial data, used only when localStorage is empty)
// ─────────────────────────────────────────────────────────────────────────────
import { ROLES } from "./constants";

export const SEED_USERS = [
  { id:"tim",   name:"Tim Smith",      email:"tim@ettr.com",   password:"ettr2024",
    role:ROLES.DEV,     carrierRole:"Lease Operator",          phone:"618-974-8695",
    cdl:"", cdlExpiry:"", medExpiry:"", truckId:"pete777", commissionPct:20, deleted:false },
  { id:"bruce", name:"Bruce Edgerton", email:"bruce@ettr.com", password:"ettr2024",
    role:ROLES.CARRIER, carrierRole:"Carrier / Owner-Operator", phone:"715-509-0114",
    cdl:"", cdlExpiry:"", medExpiry:"", truckId:"kwbruce", commissionPct:0,  deleted:false },
];

export const SEED_TRUCKS = [
  { id:"pete777", driverId:"tim",   unit:"#777", make:"Peterbilt", model:"579",
    year:2013, color:"White", vin:"1XP-BDP9X-3-ED234685",
    mileage:996058, plate:"", state:"IL", eld:"BlueInk Tech", notes:"" },
  { id:"kwbruce", driverId:"bruce", unit:"",     make:"Kenworth",  model:"T680",
    year:null, color:"Blue",  vin:"",
    mileage:0,      plate:"", state:"WI", eld:"",             notes:"" },
];

export const SEED_PETTY = [
  { id:"pc001", date:"2026-01-30",
    description:"Mike's Inc — Truck #777 Major Repair",
    vendor:"Mike's Inc — South Roxana, IL",
    amount:15477.45, category:"Repairs & Maintenance",
    paidBy:"Bruce", status:"unpaid",
    receiptUrl:null, receiptName:null, paidDate:null,
    notes:"DOT inspection, kingpins, radiator, air springs, shocks, trans cooler — Unit now passes DOT.",
    deleted:false },
];

export const SEED_LOADS = [
  { id:"load001", driverId:"tim",
    broker:"CNA Transportation", brokerCustom:"",
    brokerContact:"billing@cnatrans.com",
    loadNumber:"CNA-2026-0041",
    origin:"Chicago, IL", destination:"Memphis, TN",
    shipper:"ABC Warehouse, Chicago IL",
    receiver:"XYZ Distribution, Memphis TN",
    commodity:"General Freight",
    pickupDate:"2026-02-10", deliveryDate:"2026-02-11",
    grossRate:2400, stage:"paid",
    comcheck:{ number:"CC-88821", amount:300, dateIssued:"2026-02-10" },
    docs:{ rateCon:null, bolUnsigned:null, bolSigned:null, lumper:null, pod:null, invoice:null },
    docNames:{ rateCon:"RateCon_CNA0041.pdf", bolUnsigned:null,
               bolSigned:"BOL_signed.jpg", lumper:null,
               pod:"POD_Memphis.jpg", invoice:"ETTR_Invoice.pdf" },
    lumperAmount:0, detentionAmount:0, expenses:[],
    stageHistory:{
      rate_con:"2026-02-09", accepted:"2026-02-09", dispatched:"2026-02-09",
      drv_accept:"2026-02-09", at_pickup:"2026-02-10", in_transit:"2026-02-10",
      delivered:"2026-02-11", billing:"2026-02-12", invoiced:"2026-02-12", paid:"2026-02-19",
    },
    paidAmount:2100, notes:"First load of 2026.", deleted:false },
];
