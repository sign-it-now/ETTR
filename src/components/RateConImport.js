import React, { useState, useRef } from 'react';
import { scanRateCon, fileToBase64, getMimeType, compressImage } from '../services/claudeVision';
import { getConfig, getBrokers, getLoads, updateLoad, updateBroker } from '../services/storage';
import { createLoad, createDocument, createAuditEntry, createBroker } from '../data/models';

// ─── Styles ─────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh', background: '#0f172a', color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    background: '#1e293b', borderBottom: '1px solid #334155',
    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
    position: 'sticky', top: 0, zIndex: 10,
  },
  backBtn: {
    background: 'none', border: 'none', color: '#38bdf8',
    fontSize: '22px', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
  },
  headerTitle: { fontSize: '16px', fontWeight: '700', color: '#e2e8f0' },
  body: { padding: '20px 16px', maxWidth: '480px', margin: '0 auto' },
  uploadBox: {
    border: '2px dashed #334155', borderRadius: '12px',
    padding: '32px 24px', textAlign: 'center',
    background: '#1e293b', marginBottom: '16px',
    cursor: 'pointer',
  },
  btnRow: { display: 'flex', gap: '12px', marginBottom: '16px' },
  uploadBtn: (color) => ({
    flex: 1, background: color, border: 'none', borderRadius: '10px',
    padding: '20px 12px', color: '#fff', fontSize: '14px', fontWeight: '600',
    cursor: 'pointer', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '8px',
  }),
  manualBtn: {
    width: '100%', background: '#1e293b', border: '1px solid #334155',
    borderRadius: '10px', padding: '14px', color: '#94a3b8',
    fontSize: '14px', cursor: 'pointer',
  },
  card: {
    background: '#1e293b', borderRadius: '10px', border: '1px solid #334155',
    padding: '16px', marginBottom: '12px',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '10px',
  },
  cardTitle: { fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' },
  editBtn: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: '6px',
    color: '#38bdf8', fontSize: '12px', padding: '4px 10px', cursor: 'pointer',
  },
  field: { marginBottom: '10px' },
  label: { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' },
  input: {
    width: '100%', background: '#0f172a', border: '1px solid #334155',
    borderRadius: '6px', color: '#e2e8f0', padding: '8px 10px',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' },
  infoVal: { fontSize: '14px', color: '#e2e8f0', marginBottom: '4px' },
  infoSub: { fontSize: '12px', color: '#64748b' },
  saveBtn: {
    background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '6px',
    fontSize: '12px', fontWeight: '700', padding: '5px 10px', cursor: 'pointer', marginTop: '8px',
  },
  createBtn: {
    width: '100%', background: '#0284c7', color: '#fff', border: 'none',
    borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700',
    cursor: 'pointer', marginTop: '8px',
  },
  scanBox: {
    background: '#1e293b', borderRadius: '12px', padding: '32px 24px',
    textAlign: 'center', border: '1px solid #334155',
  },
  progressBar: (pct) => ({
    width: '100%', height: '8px', background: '#334155',
    borderRadius: '4px', overflow: 'hidden', margin: '16px 0',
    position: 'relative',
  }),
  progressFill: (pct) => ({
    height: '100%', background: '#38bdf8', borderRadius: '4px',
    width: `${pct}%`, transition: 'width 0.4s ease',
  }),
  checkItem: (done) => ({
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '13px', color: done ? '#86efac' : '#64748b',
    marginBottom: '6px', textAlign: 'left',
  }),
  errorBox: {
    background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '8px',
    padding: '12px 14px', color: '#fca5a5', fontSize: '13px', marginTop: '12px',
  },
  successBadge: {
    background: '#14532d', border: '1px solid #166534', borderRadius: '8px',
    padding: '10px 14px', color: '#86efac', fontSize: '14px', fontWeight: '600',
    textAlign: 'center', marginBottom: '16px',
  },
};

// ─── Field editor helpers ────────────────────────────────────────────────────
const TextField = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div style={S.field}>
    {label && <label style={S.label}>{label}</label>}
    <input
      style={S.input}
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || ''}
    />
  </div>
);

// ─── Upload Screen ───────────────────────────────────────────────────────────
const UploadScreen = ({ onFileSelected, onManual }) => {
  const cameraRef = useRef();
  const fileRef = useRef();

  return (
    <div style={S.body}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>📄</div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0' }}>
          Import Rate Confirmation
        </div>
        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
          Take a photo or upload a file — Claude will extract all the details
        </div>
      </div>

      <div style={S.btnRow}>
        <button style={S.uploadBtn('#0369a1')} onClick={() => cameraRef.current.click()}>
          <span style={{ fontSize: '32px' }}>📷</span>
          <span>Take Photo</span>
          <span style={{ fontSize: '11px', opacity: 0.7 }}>Camera</span>
        </button>
        <button style={S.uploadBtn('#0f766e')} onClick={() => fileRef.current.click()}>
          <span style={{ fontSize: '32px' }}>📁</span>
          <span>Choose File</span>
          <span style={{ fontSize: '11px', opacity: 0.7 }}>PDF or Image</span>
        </button>
      </div>

      <div style={{ textAlign: 'center', color: '#475569', fontSize: '12px', margin: '12px 0' }}>
        Accepted: PDF, JPG, PNG, WEBP
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
        <div style={{ flex: 1, height: '1px', background: '#334155' }} />
        <span style={{ color: '#475569', fontSize: '12px' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: '#334155' }} />
      </div>

      <button style={S.manualBtn} onClick={onManual}>
        ✏️ Enter Details Manually
      </button>

      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files[0] && onFileSelected(e.target.files[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files[0] && onFileSelected(e.target.files[0])}
      />
    </div>
  );
};

// ─── Scanning Screen ─────────────────────────────────────────────────────────
const ScanningScreen = ({ progress, step, previewUrl, error, onRetry }) => {
  const steps = [
    'Preparing document',
    'Sending to Claude Vision',
    'Extracting broker info',
    'Extracting pickup & delivery',
    'Extracting rate & terms',
    'Done!',
  ];
  const currentIdx = steps.findIndex((s) => s === step || step?.startsWith(s.split(' ')[0]));

  return (
    <div style={S.body}>
      <div style={S.scanBox}>
        {previewUrl && (
          <div style={{ marginBottom: '16px' }}>
            <img
              src={previewUrl}
              alt="Rate con preview"
              style={{ maxHeight: '140px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain' }}
            />
          </div>
        )}
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>
          🔍 Scanning Rate Confirmation...
        </div>
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>{step || 'Starting...'}</div>

        <div style={S.progressBar(progress)}>
          <div style={S.progressFill(progress)} />
        </div>

        <div style={{ marginTop: '12px' }}>
          {steps.slice(0, -1).map((s, i) => {
            const done = i <= (currentIdx - 1);
            const active = i === currentIdx;
            return (
              <div key={s} style={S.checkItem(done)}>
                <span>{done ? '✓' : active ? '⏳' : '○'}</span>
                <span style={{ color: active ? '#e2e8f0' : undefined }}>{s}</span>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={S.errorBox}>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>Scan failed</div>
            {error}
            <button
              onClick={onRetry}
              style={{ ...S.editBtn, display: 'block', marginTop: '10px', color: '#fca5a5' }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Review Screen ───────────────────────────────────────────────────────────
const ReviewScreen = ({ extracted, currentUser, onCreateLoad, onBack, isManual }) => {
  const existingBrokers = getBrokers();
  const [form, setForm] = useState(() => buildForm(extracted));
  const [editing, setEditing] = useState(isManual ? 'all' : null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [brokerSaved, setBrokerSaved] = useState(false);

  function buildForm(data) {
    return {
      broker: {
        companyName: data?.broker?.companyName || '',
        contactName: data?.broker?.contactName || '',
        email: data?.broker?.email || '',
        phone: data?.broker?.phone || '',
        mcNumber: data?.broker?.mcNumber || '',
      },
      reference: {
        brokerLoadNumber: data?.reference?.brokerLoadNumber || '',
        referenceNumber: data?.reference?.referenceNumber || '',
        poNumber: data?.reference?.poNumber || '',
      },
      rate: {
        amount: data?.rate?.amount || 0,
        type: data?.rate?.type || 'flat',
        miles: data?.rate?.miles || 0,
        ratePerMile: data?.rate?.ratePerMile || 0,
      },
      pickup: {
        facilityName: data?.pickup?.facilityName || '',
        address: data?.pickup?.address || '',
        city: data?.pickup?.city || '',
        state: data?.pickup?.state || '',
        zip: data?.pickup?.zip || '',
        date: data?.pickup?.date || '',
        time: data?.pickup?.time || '',
        contactName: data?.pickup?.contactName || '',
        contactPhone: data?.pickup?.contactPhone || '',
        appointmentRequired: data?.pickup?.appointmentRequired || false,
      },
      delivery: {
        facilityName: data?.delivery?.facilityName || '',
        address: data?.delivery?.address || '',
        city: data?.delivery?.city || '',
        state: data?.delivery?.state || '',
        zip: data?.delivery?.zip || '',
        date: data?.delivery?.date || '',
        time: data?.delivery?.time || '',
        contactName: data?.delivery?.contactName || '',
        contactPhone: data?.delivery?.contactPhone || '',
        appointmentRequired: data?.delivery?.appointmentRequired || false,
      },
      commodity: data?.commodity || '',
      weight: data?.weight || '',
      equipment: data?.equipment || '',
      specialInstructions: data?.specialInstructions || '',
      assignedDriverId: '',
    };
  }

  const set = (section, field, val) => {
    if (field === undefined) {
      setForm((f) => ({ ...f, [section]: val }));
    } else {
      setForm((f) => ({ ...f, [section]: { ...f[section], [field]: val } }));
    }
  };

  const handleSaveBroker = () => {
    if (!form.broker.companyName) return;
    const match = existingBrokers.find(
      (b) => b.companyName.toLowerCase() === form.broker.companyName.toLowerCase()
    );
    if (!match) {
      const newBroker = createBroker({
        ...form.broker,
        history: { totalLoads: 0, completedLoads: 0, cancelledLoads: 0, rateConChanges: 0, averageRate: 0, averagePaymentDays: null, lastLoadDate: null, rateConChangeLog: [], paymentHistory: [], notes: [] },
      });
      updateBroker(newBroker);
    }
    setBrokerSaved(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const existingLoads = getLoads();
      const brokers = getBrokers();

      // Find or use broker id
      const matchedBroker = brokers.find(
        (b) => b.companyName.toLowerCase() === form.broker.companyName.toLowerCase()
      );
      const brokerId = matchedBroker?.id || '';

      const load = createLoad({
        status: 'rate_con_received',
        broker: { id: brokerId, ...form.broker },
        reference: form.reference,
        rate: {
          ...form.rate,
          amount: Number(form.rate.amount),
          miles: Number(form.rate.miles),
          ratePerMile: Number(form.rate.ratePerMile),
        },
        pickup: form.pickup,
        delivery: form.delivery,
        commodity: form.commodity,
        weight: form.weight,
        equipment: form.equipment,
        specialInstructions: form.specialInstructions,
        assignedDriverId: form.assignedDriverId || null,
        auditLog: [
          createAuditEntry(
            currentUser?.id || 'unknown',
            'load_created',
            isManual ? 'Load created manually' : 'Load created from rate con scan'
          ),
        ],
      }, existingLoads);

      updateLoad(load);
      onCreateLoad(load);
    } catch (e) {
      setSaveError(e.message);
      setSaving(false);
    }
  };

  const isEditing = (section) => editing === 'all' || editing === section;

  const renderInfo = (lines) => (
    <div>
      {lines.map((line, i) => line ? <div key={i} style={S.infoVal}>{line}</div> : null)}
    </div>
  );

  return (
    <div style={{ ...S.body, paddingBottom: '24px' }}>
      {!isManual && (
        <div style={S.successBadge}>✅ Rate Confirmation Scanned — Review details below</div>
      )}

      {/* Broker */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>🏢 Broker</span>
          <button style={S.editBtn} onClick={() => setEditing(isEditing('broker') && !isManual ? null : 'broker')}>
            {isEditing('broker') && !isManual ? 'Done ✓' : 'Edit ✏️'}
          </button>
        </div>
        {isEditing('broker') ? (
          <>
            <TextField label="Company Name" value={form.broker.companyName} onChange={(v) => set('broker', 'companyName', v)} />
            <TextField label="Contact Name" value={form.broker.contactName} onChange={(v) => set('broker', 'contactName', v)} />
            <div style={S.row2}>
              <TextField label="Email" value={form.broker.email} onChange={(v) => set('broker', 'email', v)} type="email" />
              <TextField label="Phone" value={form.broker.phone} onChange={(v) => set('broker', 'phone', v)} type="tel" />
            </div>
            <TextField label="MC Number" value={form.broker.mcNumber} onChange={(v) => set('broker', 'mcNumber', v)} placeholder="MC-123456" />
            {!brokerSaved && (
              <button style={S.saveBtn} onClick={handleSaveBroker}>
                💾 Save to Brokers
              </button>
            )}
            {brokerSaved && <div style={{ fontSize: '12px', color: '#86efac', marginTop: '6px' }}>✓ Saved to broker list</div>}
          </>
        ) : (
          renderInfo([
            form.broker.companyName,
            form.broker.contactName,
            [form.broker.email, form.broker.phone].filter(Boolean).join(' | '),
            form.broker.mcNumber ? `MC: ${form.broker.mcNumber}` : '',
          ])
        )}
      </div>

      {/* Rate */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>💰 Rate</span>
          <button style={S.editBtn} onClick={() => setEditing(isEditing('rate') && !isManual ? null : 'rate')}>
            {isEditing('rate') && !isManual ? 'Done ✓' : 'Edit ✏️'}
          </button>
        </div>
        {isEditing('rate') ? (
          <>
            <div style={S.row2}>
              <TextField label="Amount ($)" value={form.rate.amount} onChange={(v) => set('rate', 'amount', v)} type="number" />
              <div style={S.field}>
                <label style={S.label}>Type</label>
                <select
                  style={{ ...S.input, appearance: 'none' }}
                  value={form.rate.type}
                  onChange={(e) => set('rate', 'type', e.target.value)}
                >
                  <option value="flat">Flat Rate</option>
                  <option value="per_mile">Per Mile</option>
                </select>
              </div>
            </div>
            <div style={S.row2}>
              <TextField label="Miles" value={form.rate.miles} onChange={(v) => set('rate', 'miles', v)} type="number" />
              <TextField label="Rate/Mile ($)" value={form.rate.ratePerMile} onChange={(v) => set('rate', 'ratePerMile', v)} type="number" />
            </div>
          </>
        ) : (
          renderInfo([
            `$${Number(form.rate.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} (${form.rate.type === 'flat' ? 'Flat Rate' : 'Per Mile'})`,
            form.rate.miles ? `${form.rate.miles} miles${form.rate.ratePerMile ? ` • $${form.rate.ratePerMile}/mile` : ''}` : '',
          ])
        )}
      </div>

      {/* Reference */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>📋 Reference</span>
          <button style={S.editBtn} onClick={() => setEditing(isEditing('reference') && !isManual ? null : 'reference')}>
            {isEditing('reference') && !isManual ? 'Done ✓' : 'Edit ✏️'}
          </button>
        </div>
        {isEditing('reference') ? (
          <>
            <TextField label="Broker Load #" value={form.reference.brokerLoadNumber} onChange={(v) => set('reference', 'brokerLoadNumber', v)} />
            <div style={S.row2}>
              <TextField label="Reference #" value={form.reference.referenceNumber} onChange={(v) => set('reference', 'referenceNumber', v)} />
              <TextField label="PO #" value={form.reference.poNumber} onChange={(v) => set('reference', 'poNumber', v)} />
            </div>
          </>
        ) : (
          renderInfo([
            form.reference.brokerLoadNumber ? `Broker Load #: ${form.reference.brokerLoadNumber}` : '',
            form.reference.poNumber ? `PO #: ${form.reference.poNumber}` : '',
            form.reference.referenceNumber ? `Ref #: ${form.reference.referenceNumber}` : '',
          ])
        )}
      </div>

      {/* Pickup */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>🟢 Pickup</span>
          <button style={S.editBtn} onClick={() => setEditing(isEditing('pickup') && !isManual ? null : 'pickup')}>
            {isEditing('pickup') && !isManual ? 'Done ✓' : 'Edit ✏️'}
          </button>
        </div>
        {isEditing('pickup') ? (
          <>
            <TextField label="Facility Name" value={form.pickup.facilityName} onChange={(v) => set('pickup', 'facilityName', v)} />
            <TextField label="Address" value={form.pickup.address} onChange={(v) => set('pickup', 'address', v)} />
            <div style={S.row3}>
              <TextField label="City" value={form.pickup.city} onChange={(v) => set('pickup', 'city', v)} />
              <TextField label="State" value={form.pickup.state} onChange={(v) => set('pickup', 'state', v)} />
              <TextField label="Zip" value={form.pickup.zip} onChange={(v) => set('pickup', 'zip', v)} />
            </div>
            <div style={S.row2}>
              <TextField label="Date" value={form.pickup.date} onChange={(v) => set('pickup', 'date', v)} type="date" />
              <TextField label="Time" value={form.pickup.time} onChange={(v) => set('pickup', 'time', v)} type="time" />
            </div>
            <div style={S.row2}>
              <TextField label="Contact Name" value={form.pickup.contactName} onChange={(v) => set('pickup', 'contactName', v)} />
              <TextField label="Contact Phone" value={form.pickup.contactPhone} onChange={(v) => set('pickup', 'contactPhone', v)} type="tel" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
              <input type="checkbox" checked={form.pickup.appointmentRequired}
                onChange={(e) => set('pickup', 'appointmentRequired', e.target.checked)} />
              Appointment required
            </label>
          </>
        ) : (
          renderInfo([
            form.pickup.facilityName,
            [form.pickup.address, form.pickup.city, form.pickup.state, form.pickup.zip].filter(Boolean).join(', '),
            form.pickup.date ? `📅 ${formatDate(form.pickup.date)}${form.pickup.time ? ` @ ${formatTime(form.pickup.time)}` : ''}` : '',
            form.pickup.contactName ? `👤 ${form.pickup.contactName}${form.pickup.contactPhone ? ` | ${form.pickup.contactPhone}` : ''}` : '',
            form.pickup.appointmentRequired ? '⚠️ Appointment required' : '',
          ])
        )}
      </div>

      {/* Delivery */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>🔴 Delivery</span>
          <button style={S.editBtn} onClick={() => setEditing(isEditing('delivery') && !isManual ? null : 'delivery')}>
            {isEditing('delivery') && !isManual ? 'Done ✓' : 'Edit ✏️'}
          </button>
        </div>
        {isEditing('delivery') ? (
          <>
            <TextField label="Facility Name" value={form.delivery.facilityName} onChange={(v) => set('delivery', 'facilityName', v)} />
            <TextField label="Address" value={form.delivery.address} onChange={(v) => set('delivery', 'address', v)} />
            <div style={S.row3}>
              <TextField label="City" value={form.delivery.city} onChange={(v) => set('delivery', 'city', v)} />
              <TextField label="State" value={form.delivery.state} onChange={(v) => set('delivery', 'state', v)} />
              <TextField label="Zip" value={form.delivery.zip} onChange={(v) => set('delivery', 'zip', v)} />
            </div>
            <div style={S.row2}>
              <TextField label="Date" value={form.delivery.date} onChange={(v) => set('delivery', 'date', v)} type="date" />
              <TextField label="Time" value={form.delivery.time} onChange={(v) => set('delivery', 'time', v)} type="time" />
            </div>
            <div style={S.row2}>
              <TextField label="Contact Name" value={form.delivery.contactName} onChange={(v) => set('delivery', 'contactName', v)} />
              <TextField label="Contact Phone" value={form.delivery.contactPhone} onChange={(v) => set('delivery', 'contactPhone', v)} type="tel" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
              <input type="checkbox" checked={form.delivery.appointmentRequired}
                onChange={(e) => set('delivery', 'appointmentRequired', e.target.checked)} />
              Appointment required
            </label>
          </>
        ) : (
          renderInfo([
            form.delivery.facilityName,
            [form.delivery.address, form.delivery.city, form.delivery.state, form.delivery.zip].filter(Boolean).join(', '),
            form.delivery.date ? `📅 ${formatDate(form.delivery.date)}${form.delivery.time ? ` @ ${formatTime(form.delivery.time)}` : ''}` : '',
            form.delivery.contactName ? `👤 ${form.delivery.contactName}${form.delivery.contactPhone ? ` | ${form.delivery.contactPhone}` : ''}` : '',
            form.delivery.appointmentRequired ? '⚠️ Appointment required' : '',
          ])
        )}
      </div>

      {/* Commodity / Equipment */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>📦 Freight Details</span>
          <button style={S.editBtn} onClick={() => setEditing(isEditing('freight') && !isManual ? null : 'freight')}>
            {isEditing('freight') && !isManual ? 'Done ✓' : 'Edit ✏️'}
          </button>
        </div>
        {isEditing('freight') ? (
          <>
            <TextField label="Commodity" value={form.commodity} onChange={(v) => set('commodity', undefined, v)} />
            <div style={S.row2}>
              <TextField label="Weight" value={form.weight} onChange={(v) => set('weight', undefined, v)} placeholder="e.g. 42,000 lbs" />
              <TextField label="Equipment" value={form.equipment} onChange={(v) => set('equipment', undefined, v)} placeholder="e.g. Dry Van 53'" />
            </div>
            <TextField label="Special Instructions" value={form.specialInstructions} onChange={(v) => set('specialInstructions', undefined, v)} />
          </>
        ) : (
          renderInfo([
            form.commodity,
            [form.weight, form.equipment].filter(Boolean).join(' • '),
            form.specialInstructions ? `Note: ${form.specialInstructions}` : '',
          ])
        )}
      </div>

      {saveError && <div style={S.errorBox}>✗ {saveError}</div>}

      <button
        style={{ ...S.createBtn, opacity: saving ? 0.7 : 1 }}
        onClick={handleCreate}
        disabled={saving}
      >
        {saving ? 'Creating load...' : '🚛 Create Load'}
      </button>
    </div>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return '';
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
};
const formatTime = (t) => {
  if (!t) return '';
  try {
    const [h, m] = t.split(':');
    const hr = parseInt(h, 10);
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  } catch { return t; }
};

// ─── Main RateConImport Component ────────────────────────────────────────────
const RateConImport = ({ currentUser, onLoadCreated, onBack }) => {
  const [phase, setPhase] = useState('upload');       // upload | scanning | review
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState('');
  const [scanError, setScanError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isManual, setIsManual] = useState(false);

  const handleFileSelected = async (file) => {
    setSelectedFile(file);
    setScanError('');

    // Show preview for images
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl('');
    }

    setPhase('scanning');
    await runScan(file);
  };

  const runScan = async (file) => {
    const config = getConfig();
    const apiKey = config?.claudeApiKey;

    const progressSteps = [
      { pct: 10, label: 'Preparing document' },
      { pct: 30, label: 'Sending to Claude Vision' },
      { pct: 55, label: 'Extracting broker info' },
      { pct: 70, label: 'Extracting pickup & delivery' },
      { pct: 85, label: 'Extracting rate & terms' },
      { pct: 100, label: 'Done!' },
    ];

    let stepIdx = 0;
    const advanceProgress = () => {
      if (stepIdx < progressSteps.length) {
        const { pct, label } = progressSteps[stepIdx++];
        setScanProgress(pct);
        setScanStep(label);
      }
    };

    // Animate progress loosely in sync with the API call
    advanceProgress();
    const ticker = setInterval(() => advanceProgress(), 1400);

    try {
      const result = await scanRateCon(file, apiKey, (msg) => {
        setScanStep(msg);
      });
      clearInterval(ticker);
      setScanProgress(100);
      setScanStep('Done!');
      setExtracted(result);
      setTimeout(() => setPhase('review'), 600);
    } catch (e) {
      clearInterval(ticker);
      setScanError(e.message);
    }
  };

  const handleManual = () => {
    setIsManual(true);
    setExtracted({});
    setPhase('review');
  };

  const handleLoadCreated = (load) => {
    onLoadCreated(load);
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={S.headerTitle}>
          {phase === 'upload' && 'New Load'}
          {phase === 'scanning' && 'Scanning...'}
          {phase === 'review' && (isManual ? 'Enter Load Details' : 'Review Rate Con')}
        </div>
      </div>

      {phase === 'upload' && (
        <UploadScreen onFileSelected={handleFileSelected} onManual={handleManual} />
      )}
      {phase === 'scanning' && (
        <ScanningScreen
          progress={scanProgress}
          step={scanStep}
          previewUrl={previewUrl}
          error={scanError}
          onRetry={() => { setScanError(''); setScanProgress(0); runScan(selectedFile); }}
        />
      )}
      {phase === 'review' && (
        <ReviewScreen
          extracted={extracted}
          currentUser={currentUser}
          onCreateLoad={handleLoadCreated}
          onBack={() => setPhase('upload')}
          isManual={isManual}
        />
      )}
    </div>
  );
};

export default RateConImport;
