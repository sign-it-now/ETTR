import { SEED_DATA } from '../data/seedData';

const NS = 'ettr_';

// ─── Low-level helpers ─────────────────────────────────────────────────────
const get = (key) => {
  try {
    const val = localStorage.getItem(NS + key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

const set = (key, value) => {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('[storage] Failed to save', key, e);
    return false;
  }
};

const remove = (key) => localStorage.removeItem(NS + key);

// ─── Config (GitHub repo + Claude API key + user) ──────────────────────────
export const getConfig = () => get('config');
export const saveConfig = (config) => set('config', config);
export const clearConfig = () => remove('config');

// ─── Current user session ──────────────────────────────────────────────────
export const getCurrentUser = () => get('currentUser');
export const saveCurrentUser = (user) => set('currentUser', user);
export const clearCurrentUser = () => remove('currentUser');

// ─── Data collections ──────────────────────────────────────────────────────
const DATA_KEYS = ['loads', 'drivers', 'brokers', 'invoices'];

export const getData = (key) => get(key);
export const saveData = (key, data) => set(key, data);

// Convenience getters
export const getLoads    = () => { const v = get('loads');    return Array.isArray(v) ? v : []; };
export const saveLoads = (loads) => set('loads', loads);

export const getDrivers  = () => { const v = get('drivers');  return Array.isArray(v) ? v : []; };
export const saveDrivers = (drivers) => set('drivers', drivers);

export const getBrokers  = () => { const v = get('brokers');  return Array.isArray(v) ? v : []; };
export const saveBrokers = (brokers) => set('brokers', brokers);

export const getInvoices = () => { const v = get('invoices'); return Array.isArray(v) ? v : []; };
export const saveInvoices = (invoices) => set('invoices', invoices);

// Load all data collections at once
export const getAllData = () => ({
  loads: getLoads(),
  drivers: getDrivers(),
  brokers: getBrokers(),
  invoices: getInvoices(),
});

// Overwrite all data (used after GitHub pull)
export const saveAllData = ({ loads, drivers, brokers, invoices }) => {
  if (loads !== undefined) saveLoads(loads);
  if (drivers !== undefined) saveDrivers(drivers);
  if (brokers !== undefined) saveBrokers(brokers);
  if (invoices !== undefined) saveInvoices(invoices);
};

// ─── SHA cache (GitHub file SHAs needed for updates) ──────────────────────
export const getShaCache = () => get('shaCache') || {};
export const saveShaCache = (cache) => set('shaCache', cache);
export const updateSha = (filename, sha) => {
  const cache = getShaCache();
  cache[filename] = sha;
  saveShaCache(cache);
};
export const getSha = (filename) => getShaCache()[filename] || null;

// ─── Pending changes queue (offline writes) ───────────────────────────────
export const getPendingChanges = () => get('pendingChanges') || [];
export const addPendingChange = (filename) => {
  const pending = getPendingChanges();
  if (!pending.includes(filename)) {
    pending.push(filename);
    set('pendingChanges', pending);
  }
};
export const clearPendingChanges = () => remove('pendingChanges');
export const removePendingChange = (filename) => {
  const pending = getPendingChanges().filter((f) => f !== filename);
  set('pendingChanges', pending);
};

// ─── Last sync timestamp ───────────────────────────────────────────────────
export const getLastSync = () => get('lastSync');
export const saveLastSync = (ts = new Date().toISOString()) => set('lastSync', ts);

// ─── Initialization ────────────────────────────────────────────────────────
// Populate localStorage with seed data if collections are empty.
// Returns true if data was initialized, false if already had data.
export const initializeIfEmpty = () => {
  let initialized = false;
  if (!get('loads') || getLoads().length === 0) {
    saveLoads(SEED_DATA.loads);
    initialized = true;
  }
  if (!get('drivers') || getDrivers().length === 0) {
    saveDrivers(SEED_DATA.drivers);
    initialized = true;
  }
  if (!get('brokers') || getBrokers().length === 0) {
    saveBrokers(SEED_DATA.brokers);
    initialized = true;
  }
  if (!get('invoices') || getInvoices().length === 0) {
    saveInvoices(SEED_DATA.invoices);
    initialized = true;
  }
  return initialized;
};

// Full reset to seed data (Settings → "Reset to test data")
export const resetToSeedData = () => {
  saveLoads(SEED_DATA.loads);
  saveDrivers(SEED_DATA.drivers);
  saveBrokers(SEED_DATA.brokers);
  saveInvoices(SEED_DATA.invoices);
  clearPendingChanges();
};

// ─── Update a single load in localStorage ─────────────────────────────────
export const updateLoad = (updatedLoad) => {
  const loads = getLoads();
  const idx = loads.findIndex((l) => l.id === updatedLoad.id);
  if (idx >= 0) {
    loads[idx] = { ...updatedLoad, updatedAt: new Date().toISOString() };
  } else {
    loads.push({ ...updatedLoad, updatedAt: new Date().toISOString() });
  }
  saveLoads(loads);
  addPendingChange('loads.json');
  return loads;
};

// ─── Delete a single load from localStorage ───────────────────────────────
export const deleteLoad = (loadId) => {
  const loads = getLoads().filter((l) => l.id !== loadId);
  saveLoads(loads);
  addPendingChange('loads.json');
};

// ─── Bulk delete multiple loads from localStorage ─────────────────────────
export const deleteLoads = (loadIds) => {
  const idSet = new Set(loadIds);
  const loads = getLoads().filter((l) => !idSet.has(l.id));
  saveLoads(loads);
  addPendingChange('loads.json');
};

// ─── Update a single invoice in localStorage ──────────────────────────────
export const updateInvoice = (updatedInvoice) => {
  const invoices = getInvoices();
  const idx = invoices.findIndex((i) => i.id === updatedInvoice.id);
  if (idx >= 0) {
    invoices[idx] = { ...updatedInvoice, updatedAt: new Date().toISOString() };
  } else {
    invoices.push({ ...updatedInvoice, updatedAt: new Date().toISOString() });
  }
  saveInvoices(invoices);
  addPendingChange('invoices.json');
  return invoices;
};

// ─── Update a single broker in localStorage ────────────────────────────────
export const updateBroker = (updatedBroker) => {
  const brokers = getBrokers();
  const idx = brokers.findIndex((b) => b.id === updatedBroker.id);
  if (idx >= 0) {
    brokers[idx] = updatedBroker;
  } else {
    brokers.push(updatedBroker);
  }
  saveBrokers(brokers);
  addPendingChange('brokers.json');
  return brokers;
};

export const storage = {
  getConfig,
  saveConfig,
  clearConfig,
  getCurrentUser,
  saveCurrentUser,
  clearCurrentUser,
  getData,
  saveData,
  getLoads,
  saveLoads,
  getDrivers,
  saveDrivers,
  getBrokers,
  saveBrokers,
  getInvoices,
  saveInvoices,
  getAllData,
  saveAllData,
  getShaCache,
  saveShaCache,
  updateSha,
  getSha,
  getPendingChanges,
  addPendingChange,
  clearPendingChanges,
  removePendingChange,
  getLastSync,
  saveLastSync,
  initializeIfEmpty,
  resetToSeedData,
  updateLoad,
  updateInvoice,
  updateBroker,
};

export default storage;
