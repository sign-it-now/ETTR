import { useState } from 'react';
import { useData } from '../context/DataContext';

const RATE_TYPES = ['flat', 'per_mile'];

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, ...props }) {
  return (
    <input
      value={value}
      onChange={onChange}
      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
      {...props}
    />
  );
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
    >
      {children}
    </select>
  );
}

export default function CreateLoadScreen({ nav, loadId }) {
  const { loads, drivers, brokers, addLoad, updateLoad, addBroker, currentUser } = useData();

  const existing = loadId ? loads.find((l) => l.id === loadId) : null;

  const [form, setForm] = useState({
    referenceNumber: existing?.referenceNumber || '',
    brokerId: existing?.brokerId || '',
    assignedDriverId: existing?.assignedDriverId || '',
    // Shipper
    shipperName: existing?.shipper?.name || '',
    shipperAddress: existing?.shipper?.address || '',
    pickupDate: existing?.shipper?.pickupDate || '',
    pickupTime: existing?.shipper?.pickupTime || '',
    shipperContact: existing?.shipper?.contactName || '',
    shipperPhone: existing?.shipper?.contactPhone || '',
    // Consignee
    consigneeName: existing?.consignee?.name || '',
    consigneeAddress: existing?.consignee?.address || '',
    deliveryDate: existing?.consignee?.deliveryDate || '',
    deliveryTime: existing?.consignee?.deliveryTime || '',
    consigneeContact: existing?.consignee?.contactName || '',
    consigneePhone: existing?.consignee?.contactPhone || '',
    // Rate
    rateAmount: existing?.rate?.amount || '',
    rateType: existing?.rate?.type || 'flat',
    miles: existing?.rate?.miles || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // New broker quick-add
  const [addingBroker, setAddingBroker] = useState(false);
  const [newBroker, setNewBroker] = useState({ companyName: '', contactName: '', email: '', phone: '', paymentTerms: 'Net 30' });

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.rateAmount) { setError('Rate amount is required'); return; }
    setError('');
    setSaving(true);

    const loadData = {
      referenceNumber: form.referenceNumber,
      brokerId: form.brokerId,
      assignedDriverId: form.assignedDriverId,
      shipper: {
        name: form.shipperName,
        address: form.shipperAddress,
        pickupDate: form.pickupDate,
        pickupTime: form.pickupTime,
        contactName: form.shipperContact,
        contactPhone: form.shipperPhone,
      },
      consignee: {
        name: form.consigneeName,
        address: form.consigneeAddress,
        deliveryDate: form.deliveryDate,
        deliveryTime: form.deliveryTime,
        contactName: form.consigneeContact,
        contactPhone: form.consigneePhone,
      },
      rate: {
        amount: parseFloat(form.rateAmount) || 0,
        type: form.rateType,
        miles: parseInt(form.miles) || 0,
      },
    };

    if (existing) {
      await updateLoad(existing.id, loadData);
      nav('load-detail', { loadId: existing.id });
    } else {
      const newLoad = await addLoad(loadData);
      nav('load-detail', { loadId: newLoad.id });
    }
    setSaving(false);
  }

  async function handleAddBroker() {
    if (!newBroker.companyName) return;
    const b = await addBroker(newBroker);
    setField('brokerId', b.id);
    setAddingBroker(false);
    setNewBroker({ companyName: '', contactName: '', email: '', phone: '', paymentTerms: 'Net 30' });
  }

  const activeDrivers = drivers.filter((d) => d.isActive);

  return (
    <div className="min-h-screen bg-slate-950 pb-28">
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 z-40">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => nav(existing ? 'load-detail' : 'dashboard', existing ? { loadId: existing.id } : {})} className="text-slate-400 hover:text-white text-xl leading-none">
            &#8592;
          </button>
          <span className="font-bold text-white">{existing ? 'Edit Load' : 'New Load'}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {/* Broker */}
        <section>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Broker</div>
          <div className="space-y-3">
            <Field label="Select Broker">
              {addingBroker ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-sm font-semibold text-white">Add New Broker</div>
                  <Input value={newBroker.companyName} onChange={(e) => setNewBroker({ ...newBroker, companyName: e.target.value })} placeholder="Company name *" />
                  <Input value={newBroker.contactName} onChange={(e) => setNewBroker({ ...newBroker, contactName: e.target.value })} placeholder="Contact name" />
                  <Input type="email" value={newBroker.email} onChange={(e) => setNewBroker({ ...newBroker, email: e.target.value })} placeholder="Email" />
                  <Input type="tel" value={newBroker.phone} onChange={(e) => setNewBroker({ ...newBroker, phone: e.target.value })} placeholder="Phone" />
                  <Input value={newBroker.paymentTerms} onChange={(e) => setNewBroker({ ...newBroker, paymentTerms: e.target.value })} placeholder="Payment terms (Net 30)" />
                  <div className="flex gap-2">
                    <button onClick={handleAddBroker} className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl">Add Broker</button>
                    <button onClick={() => setAddingBroker(false)} className="flex-1 bg-slate-700 text-white text-sm font-semibold py-2.5 rounded-xl">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={form.brokerId} onChange={(e) => setField('brokerId', e.target.value)}>
                    <option value="">-- Select broker --</option>
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>{b.companyName}</option>
                    ))}
                  </Select>
                  <button onClick={() => setAddingBroker(true)} className="shrink-0 bg-slate-700 text-white text-xs px-3 py-2 rounded-xl">+ New</button>
                </div>
              )}
            </Field>
            <Field label="Broker Reference #">
              <Input value={form.referenceNumber} onChange={(e) => setField('referenceNumber', e.target.value)} placeholder="BRK-12345" />
            </Field>
          </div>
        </section>

        {/* Driver assignment (admin only) */}
        <section>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Driver Assignment</div>
          <Field label="Assign Driver">
            <Select value={form.assignedDriverId} onChange={(e) => setField('assignedDriverId', e.target.value)}>
              <option value="">-- Unassigned --</option>
              {activeDrivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </Field>
        </section>

        {/* Pickup */}
        <section>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Pickup (Shipper)</div>
          <div className="space-y-3">
            <Field label="Company Name"><Input value={form.shipperName} onChange={(e) => setField('shipperName', e.target.value)} placeholder="Widget Factory" /></Field>
            <Field label="Address"><Input value={form.shipperAddress} onChange={(e) => setField('shipperAddress', e.target.value)} placeholder="123 Main St, Chicago, IL 60601" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pickup Date"><Input type="date" value={form.pickupDate} onChange={(e) => setField('pickupDate', e.target.value)} /></Field>
              <Field label="Pickup Time"><Input type="time" value={form.pickupTime} onChange={(e) => setField('pickupTime', e.target.value)} /></Field>
            </div>
            <Field label="Contact Name"><Input value={form.shipperContact} onChange={(e) => setField('shipperContact', e.target.value)} placeholder="John Smith" /></Field>
            <Field label="Contact Phone"><Input type="tel" value={form.shipperPhone} onChange={(e) => setField('shipperPhone', e.target.value)} placeholder="555-111-2222" /></Field>
          </div>
        </section>

        {/* Delivery */}
        <section>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Delivery (Consignee)</div>
          <div className="space-y-3">
            <Field label="Company Name"><Input value={form.consigneeName} onChange={(e) => setField('consigneeName', e.target.value)} placeholder="Mega Distribution" /></Field>
            <Field label="Address"><Input value={form.consigneeAddress} onChange={(e) => setField('consigneeAddress', e.target.value)} placeholder="456 Warehouse Way, St. Louis, MO 63101" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Delivery Date"><Input type="date" value={form.deliveryDate} onChange={(e) => setField('deliveryDate', e.target.value)} /></Field>
              <Field label="Delivery Time"><Input type="time" value={form.deliveryTime} onChange={(e) => setField('deliveryTime', e.target.value)} /></Field>
            </div>
            <Field label="Contact Name"><Input value={form.consigneeContact} onChange={(e) => setField('consigneeContact', e.target.value)} placeholder="Jane Doe" /></Field>
            <Field label="Contact Phone"><Input type="tel" value={form.consigneePhone} onChange={(e) => setField('consigneePhone', e.target.value)} placeholder="555-333-4444" /></Field>
          </div>
        </section>

        {/* Rate */}
        <section>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Rate</div>
          <div className="space-y-3">
            <Field label="Rate Amount *">
              <Input
                type="number"
                value={form.rateAmount}
                onChange={(e) => setField('rateAmount', e.target.value)}
                placeholder="1850.00"
                step="0.01"
              />
            </Field>
            <Field label="Rate Type">
              <Select value={form.rateType} onChange={(e) => setField('rateType', e.target.value)}>
                <option value="flat">Flat Rate</option>
                <option value="per_mile">Per Mile</option>
              </Select>
            </Field>
            <Field label="Miles">
              <Input type="number" value={form.miles} onChange={(e) => setField('miles', e.target.value)} placeholder="297" />
            </Field>
          </div>
        </section>

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 border-t border-slate-800 z-40">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-colors"
          >
            {saving ? 'Saving...' : existing ? 'Save Changes' : 'Create Load'}
          </button>
        </div>
      </div>
    </div>
  );
}
