// ─── Load Status Map (ordered) ─────────────────────────────────────────────
export const STATUS_MAP = [
  { key: 'rate_con_upload',   label: 'Rate Con Upload',   color: '#6b7280', bg: '#f3f4f6' },
  { key: 'rate_con_received', label: 'Rate Con Received', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'accepted',          label: 'Accepted',          color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'dispatched',        label: 'Dispatched',        color: '#0e7490', bg: '#cffafe' },
  { key: 'picked_up',         label: 'Picked Up',         color: '#b45309', bg: '#fef3c7' },
  { key: 'in_transit',        label: 'In Transit',        color: '#c2410c', bg: '#ffedd5' },
  { key: 'delivered',         label: 'Delivered',         color: '#15803d', bg: '#dcfce7' },
  { key: 'invoiced',          label: 'Invoiced',          color: '#059669', bg: '#d1fae5' },
  { key: 'paid',              label: 'Paid',              color: '#14532d', bg: '#bbf7d0' },
];

export const STATUS_INDEX = Object.fromEntries(
  STATUS_MAP.map((s, i) => [s.key, i])
);

export const getStatus = (key) => STATUS_MAP.find((s) => s.key === key) || STATUS_MAP[0];

// ─── UUID helper ───────────────────────────────────────────────────────────
const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// ─── Load number generator ─────────────────────────────────────────────────
export const generateLoadNumber = (existingLoads = []) => {
  const year = new Date().getFullYear();
  const prefix = `ETTR-${year}-`;
  const existing = existingLoads
    .map((l) => l.loadNumber)
    .filter((n) => n && n.startsWith(prefix))
    .map((n) => parseInt(n.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
};

// ─── Invoice number generator ──────────────────────────────────────────────
export const generateInvoiceNumber = (existingInvoices = []) => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const existing = existingInvoices
    .map((i) => i.invoiceNumber)
    .filter((n) => n && n.startsWith(prefix))
    .map((n) => parseInt(n.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
};

// ─── Factory: Broker ───────────────────────────────────────────────────────
export const createBroker = (overrides = {}) => ({
  id: uuid(),
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  mcNumber: '',
  dotNumber: '',
  paymentTerms: 'Net 30',
  createdAt: new Date().toISOString(),
  history: {
    totalLoads: 0,
    completedLoads: 0,
    cancelledLoads: 0,
    rateConChanges: 0,
    averageRate: 0,
    averagePaymentDays: null,
    lastLoadDate: null,
    rateConChangeLog: [],
    paymentHistory: [],
    notes: [],
  },
  ...overrides,
});

// ─── Factory: Driver ───────────────────────────────────────────────────────
export const createDriver = (overrides = {}) => ({
  id: uuid(),
  name: '',
  email: '',
  phone: '',
  role: 'driver',
  isActive: true,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ─── Factory: Document ─────────────────────────────────────────────────────
export const createDocument = (overrides = {}) => ({
  id: uuid(),
  type: 'other',         // 'rate_con' | 'bol_signed' | 'receipt' | 'other'
  version: 1,
  isCurrent: true,
  fileName: '',
  base64Data: '',
  mimeType: 'application/pdf',
  uploadedAt: new Date().toISOString(),
  uploadedBy: '',
  replaceReason: '',
  replacedPreviousId: null,
  replacedAt: null,
  replacedById: null,
  deletedAt: null,
  deleteReason: '',
  ...overrides,
});

// ─── Factory: Charge ───────────────────────────────────────────────────────
export const createCharge = (overrides = {}) => ({
  id: uuid(),
  type: 'lumper',        // 'lumper' | 'detention' | 'layover' | 'other'
  amount: 0,
  description: '',
  receiptDocumentId: null,
  createdAt: new Date().toISOString(),
  createdBy: '',
  ...overrides,
});

// ─── Factory: Audit Entry ──────────────────────────────────────────────────
export const createAuditEntry = (userId, action, details = '', extra = {}) => ({
  id: uuid(),
  timestamp: new Date().toISOString(),
  userId,
  action,
  details,
  ...extra,
});

// ─── Factory: Load ─────────────────────────────────────────────────────────
export const createLoad = (overrides = {}, existingLoads = []) => {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    loadNumber: generateLoadNumber(existingLoads),
    status: 'rate_con_upload',
    broker: {
      id: '',
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
    },
    reference: {
      brokerLoadNumber: '',
      referenceNumber: '',
      poNumber: '',
    },
    rate: {
      amount: 0,
      type: 'flat',
      miles: 0,
      ratePerMile: 0,
    },
    pickup: {
      facilityName: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      date: '',
      time: '',
      contactName: '',
      contactPhone: '',
      appointmentRequired: false,
      referenceNumber: '',
    },
    delivery: {
      facilityName: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      date: '',
      time: '',
      contactName: '',
      contactPhone: '',
      appointmentRequired: false,
      referenceNumber: '',
    },
    commodity: '',
    weight: '',
    equipment: '',
    specialInstructions: '',
    assignedDriverId: null,
    charges: [],
    documents: [],
    auditLog: [],
    notes: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

// ─── Factory: Invoice ──────────────────────────────────────────────────────
export const createInvoice = (overrides = {}, existingInvoices = []) => {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    invoiceNumber: generateInvoiceNumber(existingInvoices),
    loadId: '',
    brokerId: '',
    baseRate: 0,
    additionalCharges: [],
    totalAmount: 0,
    status: 'draft',     // 'draft' | 'sent' | 'paid'
    generatedAt: now,
    sentAt: null,
    paidAt: null,
    pdfBase64: '',
    attachedDocuments: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};
