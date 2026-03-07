// ─────────────────────────────────────────────────────────────────────────────
// ETTR — CONSTANTS, STAGE DEFINITIONS, SHARED UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = {
  DEV:     "developer",
  CARRIER: "carrier_admin",
  DRIVER:  "driver",
};

export const STAGES = [
  { key:"rate_con",   label:"Rate Con Received",  icon:"📋", color:"#3b82f6",
    desc:"Upload photo of rate confirmation from broker",
    action:"Rate Con Received — Upload Now", who:"both" },
  { key:"accepted",   label:"Rate Con Accepted",   icon:"✅", color:"#06b6d4",
    desc:"Confirm acceptance and notify broker",
    action:"Accept & Notify Broker", who:"both" },
  { key:"dispatched", label:"Dispatched to Driver", icon:"📡", color:"#8b5cf6",
    desc:"Carrier assigns and dispatches load to driver",
    action:"Dispatch to Driver", who:"carrier" },
  { key:"drv_accept", label:"Driver Accepted",      icon:"🤝", color:"#a78bfa",
    desc:"Driver confirms acceptance of this load",
    action:"I Accept This Load", who:"driver" },
  { key:"at_pickup",  label:"At Pickup",            icon:"🏭", color:"#f59e0b",
    desc:"Driver arrived at shipper — get and upload unsigned BOL",
    action:"I'm At the Shipper", who:"driver" },
  { key:"in_transit", label:"In Transit",            icon:"🚛", color:"#f97316",
    desc:"Load picked up, BOL signed by shipper — heading to receiver",
    action:"Load Picked Up — In Transit", who:"driver" },
  { key:"delivered",  label:"Delivered",             icon:"📦", color:"#84cc16",
    desc:"Delivered to receiver — upload signed BOL and any receipts",
    action:"Confirm Delivery", who:"driver" },
  { key:"billing",    label:"Ready to Bill",         icon:"🧾", color:"#ec4899",
    desc:"Generate ETTR invoice and email billing package to broker",
    action:"Submit Billing Package", who:"both" },
  { key:"invoiced",   label:"Invoiced",              icon:"📤", color:"#f43f5e",
    desc:"Invoice sent to broker — awaiting payment",
    action:"Mark Invoice Sent", who:"carrier" },
  { key:"paid",       label:"Paid",                  icon:"💰", color:"#22c55e",
    desc:"Payment received from broker",
    action:"Record Payment", who:"carrier" },
];

export const STAGE_KEYS = STAGES.map(s => s.key);
export const stageIdx  = k => STAGE_KEYS.indexOf(k);
export const nextStage = k => STAGE_KEYS[stageIdx(k) + 1] || k;
export const prevStage = k => STAGE_KEYS[stageIdx(k) - 1] || k;

export const BROKERS = [
  "CNA Transportation","Echo Global Logistics","Coyote Logistics",
  "CH Robinson","Landstar","TQL","Convoy","Worldwide Express",
];

export const PETTY_CATS = [
  "Repairs & Maintenance","Fuel","Tires","Permits & Fees",
  "Supplies","Lodging","Meals","Other",
];

// ── Utility functions ────────────────────────────────────────────────────────
export const fmt = n =>
  Number(n || 0).toLocaleString("en-US", { style:"currency", currency:"USD" });

export const today = () => new Date().toISOString().split("T")[0];

export const brokerName = l =>
  (l.brokerCustom?.trim()) ? l.brokerCustom : l.broker;

export const calcLoad = (load, users) => {
  const driver    = users.find(u => u.id === load.driverId);
  const pct       = driver?.commissionPct || 0;
  const carrierCut  = (load.grossRate * pct) / 100;
  const driverNet   = load.grossRate - carrierCut;
  const comcheck    = load.comcheck ? Number(load.comcheck.amount) : 0;
  const invoiceTotal = load.grossRate - comcheck;
  const expenses    = (load.expenses || []).reduce((s, e) => s + Number(e.amount), 0);
  const driverProfit = driverNet - expenses - (load.lumperAmount || 0) - (load.detentionAmount || 0);
  return { pct, carrierCut, driverNet, comcheck, invoiceTotal, expenses, driverProfit };
};
