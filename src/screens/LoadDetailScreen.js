import { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { generateId } from '../services/storage';

const STATUS_ORDER = [
  'rate_con_received',
  'accepted',
  'dispatched',
  'picked_up',
  'in_transit',
  'delivered',
  'invoiced',
  'paid',
];

const STATUS_LABELS = {
  rate_con_received: 'Rate Con Received',
  accepted: 'Accepted',
  dispatched: 'Dispatched',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  invoiced: 'Invoiced',
  paid: 'Paid',
};

const STATUS_COLORS = {
  rate_con_received: 'bg-purple-600',
  accepted: 'bg-blue-600',
  dispatched: 'bg-cyan-600',
  picked_up: 'bg-yellow-600',
  in_transit: 'bg-orange-600',
  delivered: 'bg-green-600',
  invoiced: 'bg-emerald-600',
  paid: 'bg-green-800',
};

// Action button label for each status → next status
const ACTION_LABELS = {
  rate_con_received: 'Accept Load',
  accepted: 'Mark Dispatched',
  dispatched: 'Confirm Pickup',
  picked_up: 'Start Transit',
  in_transit: 'Confirm Delivery',
  delivered: 'Create Invoice',
};

const DOC_TYPES = [
  { key: 'rate_con', label: 'Rate Confirmation' },
  { key: 'bol_unsigned', label: 'BOL (Unsigned)' },
  { key: 'bol_signed', label: 'BOL (Signed)' },
  { key: 'lumper_receipt', label: 'Lumper Receipt' },
  { key: 'scale_ticket', label: 'Scale Ticket' },
  { key: 'other', label: 'Other' },
];

const CHARGE_TYPES = [
  { value: 'lumper', label: 'Lumper' },
  { value: 'detention', label: 'Detention' },
  { value: 'layover', label: 'Layover' },
  { value: 'fuel_surcharge', label: 'Fuel Surcharge' },
  { value: 'toll', label: 'Toll' },
  { value: 'other', label: 'Other' },
];

function fmt$(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-slate-800 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-white font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function LoadDetailScreen({ nav, loadId }) {
  const { loads, drivers, brokers, currentUser, updateLoad, addInvoice } = useData();
  const [activeTab, setActiveTab] = useState('details');
  const [addingCharge, setAddingCharge] = useState(false);
  const [newCharge, setNewCharge] = useState({ type: 'lumper', amount: '', description: '' });
  const [addingNote, setAddingNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const fileInputRef = useRef(null);
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = loads.find((l) => l.id === loadId);
  if (!load) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Load not found.</div>
      </div>
    );
  }

  const broker = brokers.find((b) => b.id === load.brokerId);
  const driver = drivers.find((d) => d.id === load.assignedDriverId);
  const isAdmin = currentUser?.role === 'admin';
  const currentIdx = STATUS_ORDER.indexOf(load.status);
  const canAdvance =
    load.status in ACTION_LABELS &&
    (isAdmin || !['accepted', 'invoiced'].includes(load.status));

  const totalCharges = (load.charges || []).reduce((s, c) => s + Number(c.amount || 0), 0);
  const baseRate = load.rate?.amount || 0;
  const grandTotal = baseRate + totalCharges;

  async function handleAdvance() {
    if (!canAdvance) return;
    setActionLoading(true);
    if (load.status === 'delivered') {
      // Create invoice
      const invoice = await addInvoice({
        loadId: load.id,
        brokerId: load.brokerId,
        baseRate,
        additionalCharges: totalCharges,
        totalAmount: grandTotal,
      });
      await updateLoad(load.id, { status: 'invoiced' });
      nav('invoice', { loadId: load.id, invoiceId: invoice.id });
    } else {
      const nextStatus = STATUS_ORDER[currentIdx + 1];
      await updateLoad(load.id, { status: nextStatus });
    }
    setActionLoading(false);
  }

  async function handleAddCharge() {
    if (!newCharge.amount) return;
    const charge = {
      ...newCharge,
      id: generateId('charge'),
      amount: parseFloat(newCharge.amount),
    };
    await updateLoad(load.id, { charges: [...(load.charges || []), charge] });
    setNewCharge({ type: 'lumper', amount: '', description: '' });
    setAddingCharge(false);
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;
    const note = {
      id: generateId('note'),
      text: newNote.trim(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id,
    };
    await updateLoad(load.id, { notes: [...(load.notes || []), note] });
    setNewNote('');
    setAddingNote(false);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !uploadingDocType) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const doc = {
        id: generateId('doc'),
        type: uploadingDocType,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.id,
        base64Data: ev.target.result,
      };
      await updateLoad(load.id, { documents: [...(load.documents || []), doc] });
      setUploadingDocType(null);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-28">
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 z-40">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => nav('dashboard')} className="text-slate-400 hover:text-white text-xl leading-none">
            &#8592;
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-sm">{load.loadNumber}</div>
            {load.referenceNumber && (
              <div className="text-xs text-slate-500">{load.referenceNumber}</div>
            )}
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${STATUS_COLORS[load.status] || 'bg-slate-600'}`}>
            {STATUS_LABELS[load.status] || load.status}
          </span>
          {isAdmin && (
            <button
              onClick={() => nav('create-load', { loadId: load.id })}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Progress timeline */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center overflow-x-auto gap-0 no-scrollbar">
          {STATUS_ORDER.map((s, i) => {
            const done = currentIdx > i;
            const active = currentIdx === i;
            return (
              <div key={s} className="flex items-center shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full ${done ? 'bg-emerald-500' : active ? 'bg-blue-500' : 'bg-slate-700'}`} />
                {i < STATUS_ORDER.length - 1 && (
                  <div className={`h-0.5 w-6 ${done ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Step {currentIdx + 1} of {STATUS_ORDER.length}: {STATUS_LABELS[load.status]}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 mb-4">
          {['details', 'documents', 'charges'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Details Tab ── */}
        {activeTab === 'details' && (
          <div className="space-y-3">
            {/* Broker */}
            {broker && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Broker</div>
                <InfoRow label="Company" value={broker.companyName} />
                <InfoRow label="Contact" value={broker.contactName} />
                <InfoRow label="Email" value={broker.email} />
                <InfoRow label="Phone" value={broker.phone} />
                <InfoRow label="Terms" value={broker.paymentTerms} />
                {broker.phone && (
                  <div className="flex gap-2 mt-3">
                    <a href={`tel:${broker.phone}`} className="flex-1 text-center text-xs bg-blue-600 text-white py-2 rounded-lg font-semibold">
                      Call
                    </a>
                    {broker.email && (
                      <a href={`mailto:${broker.email}`} className="flex-1 text-center text-xs bg-slate-700 text-white py-2 rounded-lg font-semibold">
                        Email
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pickup */}
            {load.shipper && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Pickup</div>
                <InfoRow label="Shipper" value={load.shipper.name} />
                <InfoRow label="Address" value={load.shipper.address} />
                <InfoRow label="Date" value={load.shipper.pickupDate} />
                <InfoRow label="Time" value={load.shipper.pickupTime} />
                <InfoRow label="Contact" value={load.shipper.contactName} />
                <InfoRow label="Phone" value={load.shipper.contactPhone} />
                {load.shipper.contactPhone && (
                  <a href={`tel:${load.shipper.contactPhone}`} className="block text-center text-xs bg-blue-600 text-white py-2 rounded-lg font-semibold mt-3">
                    Call Shipper
                  </a>
                )}
              </div>
            )}

            {/* Delivery */}
            {load.consignee && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Delivery</div>
                <InfoRow label="Consignee" value={load.consignee.name} />
                <InfoRow label="Address" value={load.consignee.address} />
                <InfoRow label="Date" value={load.consignee.deliveryDate} />
                <InfoRow label="Time" value={load.consignee.deliveryTime} />
                <InfoRow label="Contact" value={load.consignee.contactName} />
                <InfoRow label="Phone" value={load.consignee.contactPhone} />
                {load.consignee.contactPhone && (
                  <a href={`tel:${load.consignee.contactPhone}`} className="block text-center text-xs bg-blue-600 text-white py-2 rounded-lg font-semibold mt-3">
                    Call Consignee
                  </a>
                )}
              </div>
            )}

            {/* Rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Rate</div>
              <InfoRow label="Base Rate" value={fmt$(load.rate?.amount)} />
              <InfoRow label="Miles" value={load.rate?.miles ? `${load.rate.miles} mi` : null} />
              {load.rate?.miles && load.rate?.amount && (
                <InfoRow
                  label="Per Mile"
                  value={`$${(load.rate.amount / load.rate.miles).toFixed(2)}/mi`}
                />
              )}
              <InfoRow label="Rate Type" value={load.rate?.type} />
              {driver && <InfoRow label="Driver" value={driver.name} />}
            </div>

            {/* Notes */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Notes</div>
                <button
                  onClick={() => setAddingNote(true)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  + Add
                </button>
              </div>
              {(load.notes || []).map((note) => {
                const author = drivers.find((d) => d.id === note.createdBy);
                return (
                  <div key={note.id} className="py-2 border-b border-slate-800 last:border-0">
                    <div className="text-sm text-white">{note.text}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {author?.name || 'Unknown'} · {new Date(note.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
              {addingNote && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    placeholder="Add a note..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddNote} className="flex-1 bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg">Save</button>
                    <button onClick={() => setAddingNote(false)} className="flex-1 bg-slate-700 text-white text-xs font-semibold py-2 rounded-lg">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Documents Tab ── */}
        {activeTab === 'documents' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileUpload}
              capture="environment"
            />
            {DOC_TYPES.map((dt) => {
              const uploaded = (load.documents || []).filter((d) => d.type === dt.key);
              return (
                <div key={dt.key} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-white">{dt.label}</div>
                    <button
                      onClick={() => {
                        setUploadingDocType(dt.key);
                        fileInputRef.current?.click();
                      }}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium"
                    >
                      Upload
                    </button>
                  </div>
                  {uploaded.length === 0 && (
                    <div className="text-xs text-slate-600">No file uploaded</div>
                  )}
                  {uploaded.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between py-2 border-t border-slate-800">
                      <div className="text-xs text-slate-400 truncate flex-1">{doc.fileName}</div>
                      {doc.base64Data && (
                        <button
                          onClick={() => setViewingDoc(doc)}
                          className="text-xs text-blue-400 hover:text-blue-300 ml-2 shrink-0"
                        >
                          View
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Charges Tab ── */}
        {activeTab === 'charges' && (
          <div className="space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between py-2 border-b border-slate-800 text-sm">
                <span className="text-slate-400">Base Rate</span>
                <span className="text-white font-semibold">{fmt$(baseRate)}</span>
              </div>
              {(load.charges || []).map((charge) => (
                <div key={charge.id} className="flex justify-between items-center py-2 border-b border-slate-800 text-sm">
                  <div>
                    <div className="text-white capitalize">{charge.type}</div>
                    {charge.description && (
                      <div className="text-xs text-slate-500">{charge.description}</div>
                    )}
                  </div>
                  <span className="text-amber-400 font-semibold">{fmt$(charge.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-3 text-sm font-bold">
                <span className="text-slate-300">Total</span>
                <span className="text-emerald-400 text-base">{fmt$(grandTotal)}</span>
              </div>
            </div>

            {addingCharge ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="text-sm font-semibold text-white mb-2">Add Charge</div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Type</label>
                  <select
                    value={newCharge.type}
                    onChange={(e) => setNewCharge({ ...newCharge, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                  >
                    {CHARGE_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Amount</label>
                  <input
                    type="number"
                    value={newCharge.amount}
                    onChange={(e) => setNewCharge({ ...newCharge, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={newCharge.description}
                    onChange={(e) => setNewCharge({ ...newCharge, description: e.target.value })}
                    placeholder="e.g. Unloading fee at receiver"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddCharge} className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl">Save</button>
                  <button onClick={() => setAddingCharge(false)} className="flex-1 bg-slate-700 text-white text-sm font-semibold py-2.5 rounded-xl">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingCharge(true)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold py-3 rounded-xl transition-colors"
              >
                + Add Charge
              </button>
            )}
          </div>
        )}
      </div>

      {/* Document viewer modal */}
      {viewingDoc && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingDoc(null)}
        >
          <div className="max-w-full max-h-full">
            <div className="text-white text-sm text-center mb-2">{viewingDoc.fileName}</div>
            {viewingDoc.base64Data?.startsWith('data:image') ? (
              <img src={viewingDoc.base64Data} alt={viewingDoc.fileName} className="max-h-[80vh] rounded-xl" />
            ) : (
              <div className="text-slate-400 text-center">
                <p className="mb-3">PDF document</p>
                <a
                  href={viewingDoc.base64Data}
                  download={viewingDoc.fileName}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  Download
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action button */}
      {canAdvance && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 border-t border-slate-800 z-40">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleAdvance}
              disabled={actionLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-colors"
            >
              {actionLoading ? 'Updating...' : ACTION_LABELS[load.status]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
