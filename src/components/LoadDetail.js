import React, { useState, useRef } from 'react';
import { STATUS_MAP, getStatus, createDocument, createCharge, createAuditEntry, createBroker } from '../data/models';
import { updateLoad, getLoads, getDrivers, getConfig, updateBroker } from '../services/storage';
import { scanRateCon, fileToBase64, getMimeType, compressImage } from '../services/claudeVision';

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' },
  header: { background: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 20 },
  backBtn: { background: 'none', border: 'none', color: '#38bdf8', fontSize: '22px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  headerMeta: { flex: 1, minWidth: 0 },
  loadNum: { fontSize: '15px', fontWeight: '800', color: '#e2e8f0' },
  statusBadge: (s) => ({ display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px', background: s.bg, color: s.color, marginTop: '2px' }),
  body: { padding: '0 0 120px' },
  // Timeline
  timelineWrap: { overflowX: 'auto', padding: '14px 16px 10px', scrollbarWidth: 'none', display: 'flex', gap: 0, alignItems: 'center', background: '#1e293b', borderBottom: '1px solid #334155' },
  timelineStep: (active, done) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '64px', cursor: 'default', opacity: active || done ? 1 : 0.4 }),
  timelineDot: (active, done, color) => ({ width: '24px', height: '24px', borderRadius: '50%', background: done ? color : active ? color : '#334155', border: active ? `3px solid ${color}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', boxShadow: active ? `0 0 0 3px ${color}33` : 'none', transition: 'all 0.2s', flexShrink: 0 }),
  timelineLine: (done) => ({ flex: 1, height: '2px', background: done ? '#38bdf8' : '#334155', minWidth: '16px', transition: 'background 0.2s' }),
  timelineLabel: { fontSize: '9px', color: '#94a3b8', marginTop: '4px', textAlign: 'center', maxWidth: '60px', lineHeight: 1.2 },
  // Tabs
  tabBar: { display: 'flex', background: '#1e293b', borderBottom: '1px solid #334155', position: 'sticky', top: '57px', zIndex: 10 },
  tab: (active) => ({ flex: 1, padding: '12px 4px', background: 'none', border: 'none', borderBottom: active ? '2px solid #38bdf8' : '2px solid transparent', color: active ? '#38bdf8' : '#64748b', fontSize: '13px', fontWeight: active ? '700' : '400', cursor: 'pointer' }),
  // Cards
  section: { margin: '12px 16px 0', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' },
  sectionHead: { padding: '10px 14px', borderBottom: '1px solid #334155', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionBody: { padding: '12px 14px' },
  row: { display: 'flex', gap: '8px', marginBottom: '8px' },
  col: { flex: 1, minWidth: 0 },
  lbl: { fontSize: '11px', color: '#475569', marginBottom: '2px' },
  val: { fontSize: '13px', color: '#e2e8f0', wordBreak: 'break-word' },
  valMuted: { fontSize: '13px', color: '#64748b' },
  // Doc card
  docCard: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px' },
  docCardLocked: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px', opacity: 0.7 },
  docActions: { display: 'flex', gap: '8px', marginTop: '10px' },
  docBtn: (color) => ({ background: 'none', border: `1px solid ${color || '#334155'}`, borderRadius: '6px', color: color || '#94a3b8', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }),
  uploadBox: { border: '2px dashed #334155', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer', color: '#64748b', fontSize: '13px' },
  // Charges
  chargeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e293b' },
  chargeLbl: { fontSize: '13px', color: '#e2e8f0' },
  chargeAmt: { fontSize: '14px', fontWeight: '700', color: '#e2e8f0' },
  chargeType: { fontSize: '11px', color: '#64748b', marginTop: '2px', textTransform: 'capitalize' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: '4px' },
  totalLbl: { fontSize: '13px', fontWeight: '700', color: '#94a3b8' },
  totalAmt: { fontSize: '18px', fontWeight: '800', color: '#38bdf8' },
  // Input
  input: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', padding: '8px 10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', padding: '8px 10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: '60px' },
  select: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', padding: '8px 10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', appearance: 'none' },
  // Action btn
  actionBar: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', padding: '12px 16px', background: '#0f172a', borderTop: '1px solid #334155', zIndex: 30 },
  actionBtn: (color) => ({ width: '100%', background: color || '#0284c7', border: 'none', borderRadius: '10px', padding: '16px', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }),
  // Modal overlay
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  modal: { background: '#1e293b', borderRadius: '16px 16px 0 0', padding: '20px 20px 40px', width: '100%', maxWidth: '480px', border: '1px solid #334155' },
  modalTitle: { fontSize: '16px', fontWeight: '700', color: '#e2e8f0', marginBottom: '12px' },
  modalBtn: (color) => ({ width: '100%', background: color || '#ef4444', border: 'none', borderRadius: '8px', padding: '14px', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }),
  cancelBtn: { width: '100%', background: 'none', border: '1px solid #334155', borderRadius: '8px', padding: '14px', color: '#64748b', fontSize: '15px', cursor: 'pointer', marginTop: '8px' },
  auditEntry: { display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '12px' },
  auditDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#334155', flexShrink: 0, marginTop: '4px' },
};

const fmt = {
  money: (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }),
  date: (d) => { if (!d) return '—'; try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; } },
  time: (t) => { if (!t) return ''; try { const [h, m] = t.split(':'); const hr = parseInt(h, 10); return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; } catch { return t; } },
  datetime: (iso) => { if (!iso) return '—'; try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return iso; } },
};

// ─── Status Timeline ──────────────────────────────────────────────────────────
const StatusTimeline = ({ currentStatus }) => {
  const currentIdx = STATUS_MAP.findIndex((s) => s.key === currentStatus);
  return (
    <div style={S.timelineWrap} className="no-scrollbar">
      {STATUS_MAP.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && <div style={S.timelineLine(i <= currentIdx)} />}
            <div style={S.timelineStep(active, done)}>
              <div style={S.timelineDot(active, done, step.color)}>
                {done ? '✓' : active ? '●' : ''}
              </div>
              <div style={{ ...S.timelineLabel, color: active ? step.color : undefined }}>
                {step.label}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Details Tab ─────────────────────────────────────────────────────────────
const DetailsTab = ({ load, drivers, currentUser, onLoadUpdated, onViewBroker }) => {
  const [editingDriver, setEditingDriver] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState(load.assignedDriverId || '');
  const [note, setNote] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const assignedDriver = drivers.find((d) => d.id === load.assignedDriverId);

  const handleAssignDriver = () => {
    const updated = {
      ...load,
      assignedDriverId: selectedDriverId || null,
      auditLog: [
        ...load.auditLog,
        createAuditEntry(currentUser?.id, 'driver_assigned', selectedDriverId
          ? `Assigned to ${drivers.find((d) => d.id === selectedDriverId)?.name || selectedDriverId}`
          : 'Driver unassigned'),
      ],
    };
    updateLoad(updated);
    onLoadUpdated(updated);
    setEditingDriver(false);
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    const updated = {
      ...load,
      notes: [...(load.notes || []), note.trim()],
      auditLog: [...load.auditLog, createAuditEntry(currentUser?.id, 'note_added', note.trim())],
    };
    updateLoad(updated);
    onLoadUpdated(updated);
    setNote('');
  };

  const InfoRow = ({ label, value }) => (
    <div style={{ marginBottom: '10px' }}>
      <div style={S.lbl}>{label}</div>
      <div style={value ? S.val : S.valMuted}>{value || '—'}</div>
    </div>
  );

  const LocationBlock = ({ data, type }) => (
    <div style={S.section}>
      <div style={S.sectionHead}>{type === 'pickup' ? '🟢 Pickup' : '🔴 Delivery'}</div>
      <div style={S.sectionBody}>
        <div style={S.row}>
          <div style={S.col}><InfoRow label="Facility" value={data?.facilityName} /></div>
        </div>
        <div style={S.row}>
          <div style={S.col}>
            <div style={S.lbl}>Address</div>
            <div style={S.val}>{[data?.address, data?.city, data?.state, data?.zip].filter(Boolean).join(', ') || '—'}</div>
          </div>
        </div>
        <div style={S.row}>
          <div style={S.col}><InfoRow label="Date" value={data?.date ? fmt.date(data.date) : null} /></div>
          <div style={S.col}><InfoRow label="Time" value={data?.time ? fmt.time(data.time) : null} /></div>
        </div>
        {data?.contactName && (
          <div style={S.row}>
            <div style={S.col}><InfoRow label="Contact" value={data.contactName} /></div>
            <div style={S.col}><InfoRow label="Phone" value={data.contactPhone} /></div>
          </div>
        )}
        {data?.appointmentRequired && (
          <div style={{ fontSize: '12px', color: '#fb923c', marginTop: '4px' }}>⚠️ Appointment required</div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Broker */}
      <div style={S.section}>
        <div style={S.sectionHead}>
          🏢 Broker
          {onViewBroker && load.broker?.id && (
            <button style={S.docBtn()} onClick={() => onViewBroker(load.broker.id)}>
              View Profile →
            </button>
          )}
        </div>
        <div style={S.sectionBody}>
          <div style={S.row}>
            <div style={S.col}><InfoRow label="Company" value={load.broker?.companyName} /></div>
            <div style={S.col}><InfoRow label="Contact" value={load.broker?.contactName} /></div>
          </div>
          <div style={S.row}>
            <div style={S.col}><InfoRow label="Email" value={load.broker?.email} /></div>
            <div style={S.col}><InfoRow label="Phone" value={load.broker?.phone} /></div>
          </div>
          {load.broker?.mcNumber && <InfoRow label="MC#" value={load.broker.mcNumber} />}
        </div>
      </div>

      {/* Rate */}
      <div style={S.section}>
        <div style={S.sectionHead}>💰 Rate</div>
        <div style={S.sectionBody}>
          <div style={S.row}>
            <div style={S.col}>
              <div style={S.lbl}>Base Rate</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#38bdf8' }}>{fmt.money(load.rate?.amount)}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{load.rate?.type === 'flat' ? 'Flat Rate' : 'Per Mile'}</div>
            </div>
            <div style={S.col}>
              {load.rate?.miles > 0 && <InfoRow label="Miles" value={`${load.rate.miles} mi`} />}
              {load.rate?.ratePerMile > 0 && <InfoRow label="Rate/Mile" value={`$${load.rate.ratePerMile}`} />}
            </div>
          </div>
        </div>
      </div>

      {/* Reference */}
      <div style={S.section}>
        <div style={S.sectionHead}>📋 Reference</div>
        <div style={S.sectionBody}>
          <div style={S.row}>
            <div style={S.col}><InfoRow label="Broker Load #" value={load.reference?.brokerLoadNumber} /></div>
            <div style={S.col}><InfoRow label="PO #" value={load.reference?.poNumber} /></div>
          </div>
          {load.reference?.referenceNumber && <InfoRow label="Reference #" value={load.reference.referenceNumber} />}
        </div>
      </div>

      {/* Freight */}
      {(load.commodity || load.weight || load.equipment) && (
        <div style={S.section}>
          <div style={S.sectionHead}>📦 Freight</div>
          <div style={S.sectionBody}>
            <div style={S.row}>
              <div style={S.col}><InfoRow label="Commodity" value={load.commodity} /></div>
              <div style={S.col}><InfoRow label="Weight" value={load.weight} /></div>
            </div>
            <InfoRow label="Equipment" value={load.equipment} />
            {load.specialInstructions && <InfoRow label="Special Instructions" value={load.specialInstructions} />}
          </div>
        </div>
      )}

      <LocationBlock data={load.pickup} type="pickup" />
      <LocationBlock data={load.delivery} type="delivery" />

      {/* Driver assignment */}
      <div style={S.section}>
        <div style={S.sectionHead}>
          👤 Driver
          {isAdmin && (
            <button style={S.docBtn()} onClick={() => setEditingDriver(!editingDriver)}>
              {editingDriver ? 'Cancel' : 'Change'}
            </button>
          )}
        </div>
        <div style={S.sectionBody}>
          {editingDriver ? (
            <>
              <select style={S.select} value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)}>
                <option value="">— Unassigned —</option>
                {drivers.filter((d) => d.isActive).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button style={{ ...S.actionBtn('#0284c7'), marginTop: '10px', padding: '10px', fontSize: '14px' }} onClick={handleAssignDriver}>
                Save Assignment
              </button>
            </>
          ) : (
            <div style={S.val}>{assignedDriver ? assignedDriver.name : <span style={S.valMuted}>Not assigned</span>}</div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div style={S.section}>
        <div style={S.sectionHead}>📝 Notes</div>
        <div style={S.sectionBody}>
          {(load.notes || []).length === 0 && (
            <div style={S.valMuted}>No notes yet</div>
          )}
          {(load.notes || []).map((n, i) => (
            <div key={i} style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', paddingBottom: '8px', borderBottom: i < load.notes.length - 1 ? '1px solid #1e293b' : 'none' }}>
              {n}
            </div>
          ))}
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <input style={{ ...S.input, flex: 1 }} placeholder="Add a note..." value={note} onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} />
            <button style={{ background: '#0284c7', border: 'none', borderRadius: '6px', color: '#fff', padding: '0 14px', cursor: 'pointer', fontSize: '13px' }} onClick={handleAddNote}>Add</button>
          </div>
        </div>
      </div>

      {/* Audit log */}
      <div style={S.section}>
        <div style={S.sectionHead}>🕐 Activity</div>
        <div style={S.sectionBody}>
          {[...(load.auditLog || [])].reverse().map((entry) => (
            <div key={entry.id || entry.timestamp} style={S.auditEntry}>
              <div style={S.auditDot} />
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{entry.details || entry.action}</div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>{fmt.datetime(entry.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ─── Documents Tab ────────────────────────────────────────────────────────────
const DocumentsTab = ({ load, currentUser, onLoadUpdated }) => {
  const fileRef = useRef();
  const cameraRef = useRef();
  const bolCameraRef = useRef();
  const replaceFileRef = useRef();
  const [uploadTarget, setUploadTarget] = useState(null); // 'bol_unsigned' | 'bol_signed' | 'receipt'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReplaceFlow, setShowReplaceFlow] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [replaceReason, setReplaceReason] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);

  const isAdmin = currentUser?.role === 'admin';
  const isLocked = ['invoiced', 'paid'].includes(load.status);
  const docs = load.documents || [];

  const currentRateCon = docs.find((d) => d.type === 'rate_con' && d.isCurrent && !d.deletedAt);
  const previousRateCons = docs.filter((d) => d.type === 'rate_con' && (!d.isCurrent || d.deletedAt));
  const unsignedBOLs = docs.filter((d) => d.type === 'bol_unsigned' && !d.deletedAt);
  const signedBOLs = docs.filter((d) => d.type === 'bol_signed' && !d.deletedAt);
  const receipts = docs.filter((d) => d.type === 'receipt' && !d.deletedAt);

  const handleUploadFile = async (file, type) => {
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const base64Data = await fileToBase64(compressed);
      const mimeType = getMimeType(compressed);
      const doc = createDocument({
        type,
        fileName: file.name,
        base64Data,
        mimeType,
        uploadedBy: currentUser?.id || '',
        uploadedAt: new Date().toISOString(),
      });
      const updated = {
        ...load,
        documents: [...docs, doc],
        auditLog: [...load.auditLog, createAuditEntry(currentUser?.id, 'document_uploaded', `Uploaded ${type}: ${file.name}`)],
      };
      updateLoad(updated);
      onLoadUpdated(updated);
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setUploading(false);
      setUploadTarget(null);
    }
  };

  const handleDeleteRateCon = () => {
    const updatedDocs = docs.map((d) =>
      d.id === currentRateCon?.id
        ? { ...d, deletedAt: new Date().toISOString(), deleteReason }
        : d
    );
    const updated = {
      ...load,
      status: 'rate_con_upload',
      documents: updatedDocs,
      auditLog: [...load.auditLog, createAuditEntry(currentUser?.id, 'rate_con_deleted', deleteReason || 'Rate con deleted')],
    };
    updateLoad(updated);
    onLoadUpdated(updated);
    setShowDeleteConfirm(false);
    setDeleteReason('');
  };

  const handleReplaceRateCon = async (file) => {
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const base64Data = await fileToBase64(compressed);
      const mimeType = getMimeType(compressed);

      const prevVersions = docs.filter((d) => d.type === 'rate_con');
      const newVersion = prevVersions.length + 1;

      // Mark old as not current
      const updatedDocs = docs.map((d) =>
        d.type === 'rate_con' && d.isCurrent
          ? { ...d, isCurrent: false, replacedAt: new Date().toISOString(), replaceReason }
          : d
      );

      const newDoc = createDocument({
        type: 'rate_con',
        version: newVersion,
        isCurrent: true,
        fileName: file.name,
        base64Data,
        mimeType,
        uploadedBy: currentUser?.id || '',
        replacedPreviousId: currentRateCon?.id || null,
        replaceReason,
      });

      const updated = {
        ...load,
        documents: [...updatedDocs, newDoc],
        status: load.status === 'rate_con_upload' ? 'rate_con_received' : load.status,
        auditLog: [...load.auditLog, createAuditEntry(currentUser?.id, 'rate_con_replaced', replaceReason || 'Rate con replaced', { newDocId: newDoc.id, previousDocId: currentRateCon?.id })],
      };
      updateLoad(updated);
      onLoadUpdated(updated);
    } catch (e) {
      console.error('Replace failed:', e);
    } finally {
      setUploading(false);
      setShowReplaceFlow(false);
      setReplaceReason('');
    }
  };

  const handleInitialRateConUpload = async (file) => {
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const base64Data = await fileToBase64(compressed);
      const mimeType = getMimeType(compressed);
      const doc = createDocument({
        type: 'rate_con',
        version: 1,
        isCurrent: true,
        fileName: file.name,
        base64Data,
        mimeType,
        uploadedBy: currentUser?.id || '',
      });
      const updated = {
        ...load,
        documents: [...docs, doc],
        status: 'rate_con_received',
        auditLog: [...load.auditLog, createAuditEntry(currentUser?.id, 'rate_con_uploaded', `Rate con uploaded: ${file.name}`)],
      };
      updateLoad(updated);
      onLoadUpdated(updated);
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setUploading(false);
    }
  };

  const openDoc = (doc) => setViewDoc(doc);

  const DocViewer = ({ doc, onClose }) => (
    <div style={{ ...S.overlay, alignItems: 'center', background: 'rgba(0,0,0,0.92)' }}>
      <div style={{ width: '100%', maxWidth: '480px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#1e293b' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{doc.fileName}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '18px', cursor: 'pointer', marginLeft: '8px' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
          {doc.mimeType?.startsWith('image/') ? (
            <img src={`data:${doc.mimeType};base64,${doc.base64Data}`} alt={doc.fileName} style={{ maxWidth: '100%', maxHeight: '100%' }} />
          ) : doc.mimeType === 'application/pdf' ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
              <div>{doc.fileName}</div>
              <a
                href={`data:application/pdf;base64,${doc.base64Data}`}
                download={doc.fileName}
                style={{ display: 'block', marginTop: '12px', color: '#38bdf8', fontSize: '13px' }}
              >
                Download PDF
              </a>
            </div>
          ) : (
            <div style={{ color: '#64748b' }}>Cannot preview this file type</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {viewDoc && <DocViewer doc={viewDoc} onClose={() => setViewDoc(null)} />}

      {/* ── Rate Confirmation ──────────────────── */}
      <div style={{ margin: '12px 16px 0' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          Rate Confirmation
        </div>

        {!currentRateCon ? (
          <div style={{ ...S.docCard, border: '2px dashed #334155', textAlign: 'center', padding: '20px' }}>
            {uploading ? (
              <div style={{ color: '#64748b' }}>Uploading...</div>
            ) : (
              <>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>No rate con attached</div>
                {isAdmin && (
                  <>
                    <button style={S.docBtn('#0284c7')} onClick={() => cameraRef.current.click()}>📷 Take Photo</button>
                    {' '}
                    <button style={S.docBtn('#0284c7')} onClick={() => fileRef.current.click()}>📁 Choose File</button>
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && handleInitialRateConUpload(e.target.files[0])} />
                    <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && handleInitialRateConUpload(e.target.files[0])} />
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <div style={isLocked ? S.docCardLocked : S.docCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>
                  📄 {currentRateCon.fileName}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                  v{currentRateCon.version} • Uploaded {fmt.datetime(currentRateCon.uploadedAt)}
                  {currentRateCon.replaceReason && ` • "${currentRateCon.replaceReason}"`}
                </div>
              </div>
              {isLocked && <span style={{ fontSize: '16px' }}>🔒</span>}
            </div>
            {isLocked && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Locked — load has been invoiced</div>}
            <div style={S.docActions}>
              <button style={S.docBtn('#38bdf8')} onClick={() => openDoc(currentRateCon)}>👁 View</button>
              {isAdmin && !isLocked && (
                <>
                  <button style={S.docBtn('#fb923c')} onClick={() => setShowReplaceFlow(true)}>🔄 Replace</button>
                  <button style={S.docBtn('#ef4444')} onClick={() => setShowDeleteConfirm(true)}>🗑 Delete</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Previous versions */}
        {previousRateCons.length > 0 && (
          <div style={{ marginTop: '6px' }}>
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Previous versions</div>
            {previousRateCons.map((doc) => (
              <div key={doc.id} style={{ ...S.docCard, opacity: 0.6, padding: '10px 12px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  📄 {doc.fileName} — v{doc.version || 1}
                  {doc.deletedAt ? ` — Deleted ${fmt.datetime(doc.deletedAt)}` : ''}
                  {doc.replaceReason ? ` — "${doc.replaceReason}"` : ''}
                </div>
                <div style={S.docActions}>
                  <button style={{ ...S.docBtn('#64748b'), fontSize: '11px', padding: '4px 8px' }} onClick={() => openDoc(doc)}>👁 View</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BOL at Pickup (Unsigned) ──────────── */}
      <div style={{ margin: '16px 16px 0' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>BOL — Pickup Photo</span>
          {unsignedBOLs.length > 0 && (
            <button style={S.docBtn('#b45309')} onClick={() => { setUploadTarget('bol_unsigned'); bolCameraRef.current.click(); }}>+ Add</button>
          )}
        </div>
        {unsignedBOLs.length === 0 ? (
          <div style={{ ...S.docCard, border: '2px dashed #334155', textAlign: 'center', padding: '16px' }}>
            {uploading && uploadTarget === 'bol_unsigned' ? (
              <div style={{ color: '#64748b' }}>Uploading...</div>
            ) : (
              <>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>Photo of BOL when picking up load</div>
                <button style={S.docBtn('#b45309')} onClick={() => { setUploadTarget('bol_unsigned'); bolCameraRef.current.click(); }}>📷 Take Photo</button>
                {' '}
                <button style={S.docBtn('#b45309')} onClick={() => { setUploadTarget('bol_unsigned'); fileRef.current.click(); }}>📁 Choose File</button>
              </>
            )}
          </div>
        ) : (
          unsignedBOLs.map((doc) => (
            <div key={doc.id} style={S.docCard}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>📄 {doc.fileName}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>BOL at Pickup • {fmt.datetime(doc.uploadedAt)}</div>
              <div style={S.docActions}>
                <button style={S.docBtn('#38bdf8')} onClick={() => openDoc(doc)}>👁 View</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Signed BOL — Delivery ─────────────── */}
      <div style={{ margin: '16px 16px 0' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Signed BOL — Delivery</span>
          {signedBOLs.length > 0 && (
            <button style={S.docBtn('#15803d')} onClick={() => { setUploadTarget('bol_signed'); bolCameraRef.current.click(); }}>+ Add</button>
          )}
        </div>
        {['delivered', 'invoiced'].includes(load.status) && signedBOLs.length === 0 && (
          <div style={{ background: '#451a03', border: '1px solid #92400e', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', fontSize: '12px', color: '#fbbf24' }}>
            ⚠️ Signed BOL required for complete invoice package
          </div>
        )}
        {signedBOLs.length === 0 ? (
          <div style={{ ...S.docCard, border: '2px dashed #334155', textAlign: 'center', padding: '16px' }}>
            {uploading && uploadTarget === 'bol_signed' ? (
              <div style={{ color: '#64748b' }}>Uploading...</div>
            ) : (
              <>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>Upload signed BOL after delivery</div>
                <button style={S.docBtn('#15803d')} onClick={() => { setUploadTarget('bol_signed'); bolCameraRef.current.click(); }}>📷 Take Photo</button>
                {' '}
                <button style={S.docBtn('#15803d')} onClick={() => { setUploadTarget('bol_signed'); fileRef.current.click(); }}>📁 Choose File</button>
              </>
            )}
          </div>
        ) : (
          signedBOLs.map((doc) => (
            <div key={doc.id} style={S.docCard}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>✅ {doc.fileName}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Signed BOL • {fmt.datetime(doc.uploadedAt)}</div>
              <div style={S.docActions}>
                <button style={S.docBtn('#38bdf8')} onClick={() => openDoc(doc)}>👁 View</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Receipts ──────────────────────────── */}
      <div style={{ margin: '16px 16px 0' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Receipts</span>
          <button style={S.docBtn()} onClick={() => { setUploadTarget('receipt'); fileRef.current.click(); }}>+ Add</button>
        </div>
        {receipts.length === 0 ? (
          <div style={{ ...S.docCard, textAlign: 'center', color: '#475569', fontSize: '13px' }}>No receipts added</div>
        ) : (
          receipts.map((doc) => (
            <div key={doc.id} style={S.docCard}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>🧾 {doc.fileName}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Uploaded {fmt.datetime(doc.uploadedAt)}</div>
              <div style={S.docActions}>
                <button style={S.docBtn('#38bdf8')} onClick={() => openDoc(doc)}>👁 View</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Hidden file inputs (shared for BOL + receipt uploads) */}
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files[0] && uploadTarget) { handleUploadFile(e.target.files[0], uploadTarget); e.target.value = ''; } }} />

      {/* BOL camera input (unsigned + signed BOL photo capture) */}
      <input ref={bolCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files[0] && uploadTarget) { handleUploadFile(e.target.files[0], uploadTarget); e.target.value = ''; } }} />

      {/* Replace flow */}
      <input ref={replaceFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files[0]) { handleReplaceRateCon(e.target.files[0]); e.target.value = ''; } }} />

      {/* ── Delete rate con modal ── */}
      {showDeleteConfirm && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setShowDeleteConfirm(false)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>⚠️ Delete Rate Confirmation?</div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px' }}>
              The load will revert to "Rate Con Upload" status. The file will be kept in version history.
            </p>
            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Reason (optional)</label>
            <input style={S.input} placeholder="e.g. Broker cancelled load" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />
            <button style={S.modalBtn('#ef4444')} onClick={handleDeleteRateCon}>🗑 Delete Rate Con</button>
            <button style={S.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Replace rate con modal ── */}
      {showReplaceFlow && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setShowReplaceFlow(false)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>🔄 Replace Rate Confirmation</div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px' }}>
              The previous version will be kept in history.
            </p>
            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Reason for replacement</label>
            <input style={S.input} placeholder="e.g. Broker agreed to higher rate" value={replaceReason} onChange={(e) => setReplaceReason(e.target.value)} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button style={{ ...S.modalBtn('#0284c7'), flex: 1, marginTop: 0 }} onClick={() => replaceFileRef.current.click()}>
                {uploading ? 'Uploading...' : '📁 Choose File'}
              </button>
            </div>
            <button style={S.cancelBtn} onClick={() => setShowReplaceFlow(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Charges Tab ─────────────────────────────────────────────────────────────
const ChargesTab = ({ load, currentUser, onLoadUpdated }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState('lumper');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const baseRate = Number(load.rate?.amount || 0);
  const charges = load.charges || [];
  const chargesTotal = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
  const grandTotal = baseRate + chargesTotal;

  const handleAdd = () => {
    if (!amount || isNaN(Number(amount))) return;
    const charge = createCharge({
      type,
      amount: Number(amount),
      description: description || type,
      createdBy: currentUser?.id || '',
    });
    const updated = {
      ...load,
      charges: [...charges, charge],
      auditLog: [...load.auditLog, createAuditEntry(currentUser?.id, 'charge_added', `Added ${type}: $${amount}`)],
    };
    updateLoad(updated);
    onLoadUpdated(updated);
    setShowAdd(false);
    setAmount('');
    setDescription('');
    setType('lumper');
  };

  const handleRemove = (chargeId) => {
    const charge = charges.find((c) => c.id === chargeId);
    const updated = {
      ...load,
      charges: charges.filter((c) => c.id !== chargeId),
      auditLog: [...load.auditLog, createAuditEntry(currentUser?.id, 'charge_removed', `Removed ${charge?.type}: $${charge?.amount}`)],
    };
    updateLoad(updated);
    onLoadUpdated(updated);
  };

  const CHARGE_TYPES = ['lumper', 'detention', 'layover', 'fuel_surcharge', 'other'];

  return (
    <div style={{ margin: '12px 16px 0' }}>
      {/* Base rate row */}
      <div style={S.section}>
        <div style={S.sectionBody}>
          <div style={S.chargeRow}>
            <div>
              <div style={S.chargeLbl}>Base Rate</div>
              <div style={S.chargeType}>Flat Rate</div>
            </div>
            <div style={S.chargeAmt}>{fmt.money(baseRate)}</div>
          </div>

          {charges.map((charge) => (
            <div key={charge.id} style={S.chargeRow}>
              <div>
                <div style={S.chargeLbl}>{charge.description || charge.type}</div>
                <div style={S.chargeType}>{charge.type.replace('_', ' ')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={S.chargeAmt}>{fmt.money(charge.amount)}</div>
                <button
                  onClick={() => handleRemove(charge.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          <div style={S.totalRow}>
            <div style={S.totalLbl}>TOTAL</div>
            <div style={S.totalAmt}>{fmt.money(grandTotal)}</div>
          </div>
        </div>
      </div>

      {/* Add charge */}
      {showAdd ? (
        <div style={{ ...S.section, marginTop: '12px' }}>
          <div style={S.sectionHead}>Add Charge</div>
          <div style={S.sectionBody}>
            <div style={{ marginBottom: '10px' }}>
              <div style={S.lbl}>Type</div>
              <select style={S.select} value={type} onChange={(e) => setType(e.target.value)}>
                {CHARGE_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div style={S.row}>
              <div style={S.col}>
                <div style={S.lbl}>Amount ($)</div>
                <input style={S.input} type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div style={S.col}>
                <div style={S.lbl}>Description</div>
                <input style={S.input} placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button style={{ ...S.actionBtn('#0284c7'), flex: 1, padding: '10px', fontSize: '14px' }} onClick={handleAdd}>Add Charge</button>
              <button style={{ flex: 1, background: 'none', border: '1px solid #334155', borderRadius: '8px', color: '#64748b', padding: '10px', cursor: 'pointer', fontSize: '14px' }} onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <button
          style={{ width: '100%', marginTop: '12px', background: '#1e293b', border: '1px dashed #334155', borderRadius: '10px', color: '#38bdf8', fontSize: '14px', padding: '14px', cursor: 'pointer' }}
          onClick={() => setShowAdd(true)}
        >
          + Add Charge (lumper, detention, etc.)
        </button>
      )}
    </div>
  );
};

// ─── Action Button ────────────────────────────────────────────────────────────
const ACTION_MAP = {
  rate_con_upload:    { label: '📄 Upload Rate Con',     color: '#7c3aed', roles: ['admin'] },
  rate_con_received:  { label: '✓ Accept Load',          color: '#1d4ed8', roles: ['admin'] },
  accepted:           { label: '🚛 Dispatch to Driver',  color: '#0e7490', roles: ['admin'] },
  dispatched:         { label: '📦 Mark Picked Up',      color: '#b45309', roles: ['admin', 'driver'] },
  picked_up:          { label: '🚗 Mark In Transit',     color: '#c2410c', roles: ['admin', 'driver'] },
  in_transit:         { label: '✅ Mark Delivered',       color: '#15803d', roles: ['admin', 'driver'] },
  delivered:          { label: '🧾 Create Invoice',       color: '#059669', roles: ['admin'] },
  invoiced:           { label: '💵 Mark as Paid',        color: '#14532d', roles: ['admin'] },
  paid:               null,
};

const NEXT_STATUS = {
  rate_con_received: 'accepted',
  accepted: 'dispatched',
  dispatched: 'picked_up',
  picked_up: 'in_transit',
  in_transit: 'delivered',
  delivered: 'invoiced',
  invoiced: 'paid',
};

// ─── Main LoadDetail Component ────────────────────────────────────────────────
const LoadDetail = ({ load: initialLoad, currentUser, drivers, brokers, onBack, onLoadUpdated, onCreateInvoice, onViewBroker, onDeleteLoad }) => {
  const [load, setLoad] = useState(initialLoad);
  const [activeTab, setActiveTab] = useState('details');
  const [advancing, setAdvancing] = useState(false);
  const [showNoBolWarning, setShowNoBolWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const status = getStatus(load.status);
  const isAdmin = currentUser?.role === 'admin';
  const action = ACTION_MAP[load.status];
  const canAct = action && (isAdmin || action.roles.includes('driver'));

  const handleLoadChange = (updated) => {
    setLoad(updated);
    onLoadUpdated && onLoadUpdated(updated);
  };

  const handleAdvanceStatus = () => {
    if (load.status === 'rate_con_upload') {
      setActiveTab('documents');
      return;
    }
    if (load.status === 'delivered') {
      const hasSignedBol = (load.documents || []).some((d) => d.type === 'bol_signed' && !d.deletedAt);
      if (!hasSignedBol) {
        setShowNoBolWarning(true);
        return;
      }
      onCreateInvoice && onCreateInvoice(load);
      return;
    }
    // Auto-add broker to master list when accepting a load
    if (load.status === 'rate_con_received' && load.broker?.companyName) {
      const exists = (brokers || []).some(
        (b) => b.id === load.broker.id ||
               b.companyName?.toLowerCase().trim() === load.broker.companyName.toLowerCase().trim()
      );
      if (!exists) {
        const newBroker = createBroker({
          ...(load.broker.id ? { id: load.broker.id } : {}),
          companyName: load.broker.companyName,
          contactName: load.broker.contactName || '',
          email: load.broker.email || '',
          phone: load.broker.phone || '',
        });
        updateBroker(newBroker);
      }
    }

    const nextStatus = NEXT_STATUS[load.status];
    if (!nextStatus) return;

    setAdvancing(true);
    const statusInfo = getStatus(nextStatus);
    const updated = {
      ...load,
      status: nextStatus,
      auditLog: [...load.auditLog, createAuditEntry(currentUser?.id, 'status_changed', `Status updated to ${statusInfo.label}`)],
    };
    updateLoad(updated);
    setLoad(updated);
    onLoadUpdated && onLoadUpdated(updated);
    setTimeout(() => setAdvancing(false), 400);
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={S.headerMeta}>
          <div style={S.loadNum}>{load.loadNumber}</div>
          <span style={S.statusBadge(status)}>{status.label}</span>
        </div>
        {isAdmin && onDeleteLoad && (
          <button
            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '20px', cursor: 'pointer', padding: '4px 6px', lineHeight: 1 }}
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete load"
          >🗑</button>
        )}
      </div>

      {/* Status timeline */}
      <StatusTimeline currentStatus={load.status} />

      {/* Tab bar */}
      <div style={S.tabBar}>
        <button style={S.tab(activeTab === 'details')} onClick={() => setActiveTab('details')}>Details</button>
        <button style={S.tab(activeTab === 'documents')} onClick={() => setActiveTab('documents')}>
          Documents {(load.documents || []).length > 0 ? `(${load.documents.length})` : ''}
        </button>
        <button style={S.tab(activeTab === 'charges')} onClick={() => setActiveTab('charges')}>
          Charges {(load.charges || []).length > 0 ? `(${load.charges.length})` : ''}
        </button>
      </div>

      {/* Tab content */}
      <div style={S.body}>
        {activeTab === 'details' && (
          <DetailsTab load={load} drivers={drivers} currentUser={currentUser} onLoadUpdated={handleLoadChange} onViewBroker={onViewBroker} />
        )}
        {activeTab === 'documents' && (
          <DocumentsTab load={load} currentUser={currentUser} onLoadUpdated={handleLoadChange} />
        )}
        {activeTab === 'charges' && (
          <ChargesTab load={load} currentUser={currentUser} onLoadUpdated={handleLoadChange} />
        )}
      </div>

      {/* Action button */}
      {canAct && action && (
        <div style={S.actionBar}>
          <button
            style={{ ...S.actionBtn(action.color), opacity: advancing ? 0.7 : 1 }}
            onClick={handleAdvanceStatus}
            disabled={advancing}
          >
            {advancing ? 'Updating...' : action.label}
          </button>
        </div>
      )}

      {/* Delete load confirmation modal */}
      {showDeleteConfirm && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setShowDeleteConfirm(false)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>🗑 Delete Load?</div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.6 }}>
              <strong style={{ color: '#e2e8f0' }}>{load.loadNumber}</strong> and all its documents will be permanently removed. This cannot be undone.
            </p>
            <button
              style={{ ...S.modalBtn('#ef4444'), marginTop: 0 }}
              onClick={() => { setShowDeleteConfirm(false); onDeleteLoad(load.id); }}
            >
              Delete Load
            </button>
            <button style={S.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* No signed BOL warning modal */}
      {showNoBolWarning && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setShowNoBolWarning(false)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>⚠️ No Signed BOL Attached</div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.6 }}>
              A complete invoice package should include the signed BOL from delivery.
              Upload the signed BOL in the Documents tab before creating the invoice.
            </p>
            <button
              style={{ ...S.modalBtn('#0284c7'), marginTop: 0 }}
              onClick={() => { setShowNoBolWarning(false); setActiveTab('documents'); }}
            >
              📄 Go to Documents
            </button>
            <button
              style={{ ...S.modalBtn('#1e293b'), marginTop: '8px' }}
              onClick={() => { setShowNoBolWarning(false); onCreateInvoice && onCreateInvoice(load); }}
            >
              Create Invoice Anyway
            </button>
            <button style={S.cancelBtn} onClick={() => setShowNoBolWarning(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadDetail;
