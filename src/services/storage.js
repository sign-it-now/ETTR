// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers + offline queue management
// ─────────────────────────────────────────────────────────────────────────────

const KEYS = {
  LOADS: 'ettr_loads',
  DRIVERS: 'ettr_drivers',
  BROKERS: 'ettr_brokers',
  INVOICES: 'ettr_invoices',
  SYNC_QUEUE: 'ettr_sync_queue',
  LAST_SYNCED: 'ettr_last_synced',
  GITHUB_CONFIG: 'ettr_github_config',
  USER_SESSION: 'ettr_user_session',
};

// ── Low-level read/write ──────────────────────────────────────────────────────

function readLS(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeLS(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

// ── Data helpers ──────────────────────────────────────────────────────────────

export function getLoads() {
  return readLS(KEYS.LOADS, []);
}

export function saveLoads(loads) {
  return writeLS(KEYS.LOADS, loads);
}

export function getDrivers() {
  return readLS(KEYS.DRIVERS, []);
}

export function saveDrivers(drivers) {
  return writeLS(KEYS.DRIVERS, drivers);
}

export function getBrokers() {
  return readLS(KEYS.BROKERS, []);
}

export function saveBrokers(brokers) {
  return writeLS(KEYS.BROKERS, brokers);
}

export function getInvoices() {
  return readLS(KEYS.INVOICES, []);
}

export function saveInvoices(invoices) {
  return writeLS(KEYS.INVOICES, invoices);
}

// ── GitHub config ─────────────────────────────────────────────────────────────

export function getGithubConfig() {
  return readLS(KEYS.GITHUB_CONFIG, null);
}

export function saveGithubConfig(config) {
  return writeLS(KEYS.GITHUB_CONFIG, config);
}

export function clearGithubConfig() {
  removeLS(KEYS.GITHUB_CONFIG);
}

// ── User session ──────────────────────────────────────────────────────────────

export function getUserSession() {
  return readLS(KEYS.USER_SESSION, null);
}

export function saveUserSession(session) {
  return writeLS(KEYS.USER_SESSION, session);
}

export function clearUserSession() {
  removeLS(KEYS.USER_SESSION);
}

// ── Last synced timestamp ─────────────────────────────────────────────────────

export function getLastSynced() {
  return readLS(KEYS.LAST_SYNCED, null);
}

export function saveLastSynced(timestamp = new Date().toISOString()) {
  return writeLS(KEYS.LAST_SYNCED, timestamp);
}

// ── Offline sync queue ────────────────────────────────────────────────────────
// Each queued item: { id, file, content, timestamp }

export function getSyncQueue() {
  return readLS(KEYS.SYNC_QUEUE, []);
}

export function queueSync(file, content) {
  const queue = getSyncQueue();
  // Replace existing entry for same file (latest wins)
  const filtered = queue.filter((q) => q.file !== file);
  filtered.push({
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    file,
    content,
    timestamp: new Date().toISOString(),
  });
  writeLS(KEYS.SYNC_QUEUE, filtered);
}

export function clearSyncQueue() {
  removeLS(KEYS.SYNC_QUEUE);
}

export function removeSyncQueueItem(file) {
  const queue = getSyncQueue().filter((q) => q.file !== file);
  writeLS(KEYS.SYNC_QUEUE, queue);
}

// ── ID generator ──────────────────────────────────────────────────────────────

export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

// ── Load number generator ─────────────────────────────────────────────────────

export function generateLoadNumber(loads) {
  const year = new Date().getFullYear();
  const existing = loads
    .map((l) => l.loadNumber)
    .filter((n) => n && n.startsWith(`ETTR-${year}-`))
    .map((n) => parseInt(n.split('-')[2], 10))
    .filter((n) => !isNaN(n));
  const next = existing.length ? Math.max(...existing) + 1 : 1;
  return `ETTR-${year}-${String(next).padStart(3, '0')}`;
}

// ── Invoice number generator ──────────────────────────────────────────────────

export function generateInvoiceNumber(invoices) {
  const year = new Date().getFullYear();
  const existing = invoices
    .map((i) => i.invoiceNumber)
    .filter((n) => n && n.startsWith(`INV-${year}-`))
    .map((n) => parseInt(n.split('-')[2], 10))
    .filter((n) => !isNaN(n));
  const next = existing.length ? Math.max(...existing) + 1 : 1;
  return `INV-${year}-${String(next).padStart(3, '0')}`;
}
