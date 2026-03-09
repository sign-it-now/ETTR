import React, { useState } from 'react';
import { downloadInvoicePDF } from '../services/pdfGenerator';
import { updateInvoice, updateLoad } from '../services/storage';
import { createAuditEntry } from '../data/models';

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: '180px' },
  header: { background: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 20 },
  backBtn: { background: 'none', border: 'none', color: '#38bdf8', fontSize: '22px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  invNum: { fontSize: '15px', fontWeight: '800', color: '#e2e8f0', flex: 1 },
  statusBadge: (color, bg) => ({ display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '12px', background: bg, color: color }),
  // White card
  card: { background: '#fff', color: '#0f172a', margin: '16px', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 32px rgba(0,0,0,0.4)' },
  // Typography
  h1: { fontSize: '28px', fontWeight: '900', letterSpacing: '-0.02em', color: '#0f172a' },
  sub: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  sectionLabel: { fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' },
  boldName: { fontSize: '14px', fontWeight: '700', color: '#0f172a' },
  detail: { fontSize: '12px', color: '#475569', lineHeight: '1.6' },
  // Route block
  routeBlock: { background: '#f8fafc', borderRadius: '10px', padding: '16px', margin: '16px 0' },
  routeRow: { display: 'flex', alignItems: 'flex-start', gap: '8px' },
  routeCity: { flex: 1, minWidth: 0 },
  routeArrow: { fontSize: '18px', color: '#94a3b8', paddingTop: '2px', flexShrink: 0 },
  // Table
  tableHead: { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' },
  tableHeadCell: { fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' },
  tableRow: (shade) => ({ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', padding: '10px 0', background: shade ? '#f8fafc' : 'transparent', borderBottom: '1px solid #f1f5f9' }),
  tableCell: { fontSize: '13px', color: '#0f172a' },
  tableCellRight: { fontSize: '13px', color: '#0f172a', textAlign: 'right', fontWeight: '600' },
  tableCellMid: { fontSize: '12px', color: '#64748b', minWidth: '80px', textAlign: 'right' },
  // Total
  totalRow: { display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', marginTop: '4px', borderTop: '2px solid #e2e8f0' },
  totalLabel: { fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px', textAlign: 'right' },
  totalAmount: { fontSize: '28px', fontWeight: '900', color: '#0f172a', textAlign: 'right' },
  // Documents
  docItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9' },
  docName: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155' },
  docCheck: { color: '#10b981', fontWeight: '700', fontSize: '14px' },
  docType: { fontSize: '11px', color: '#94a3b8' },
  // Footer of card
  cardFooter: { borderTop: '1px solid #e2e8f0', marginTop: '16px', paddingTop: '12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' },
  // Action bar
  actionBar: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', padding: '12px 16px', background: '#0f172a', borderTop: '1px solid #334155', zIndex: 30 },
  btn: (color, text) => ({ background: color, border: 'none', borderRadius: '10px', padding: '14px', color: text || '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', flex: 1 }),
  btnDisabled: { background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '14px', color: '#475569', fontSize: '14px', fontWeight: '700', cursor: 'not-allowed', flex: 1, opacity: 0.6 },
  btnRow: { display: 'flex', gap: '8px', marginBottom: '8px' },
  btnNote: { textAlign: 'center', fontSize: '11px', color: '#475569', marginTop: '4px' },
  divider: { borderTop: '1px solid #e2e8f0', margin: '16px 0' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
};

const STATUS_STYLES = {
  draft: { color: '#475569', bg: '#f1f5f9' },
  sent:  { color: '#1d4ed8', bg: '#dbeafe' },
  paid:  { color: '#14532d', bg: '#bbf7d0' },
};

const DOC_TYPE_LABELS = {
  rate_con:     'Rate Confirmation',
  bol_unsigned: 'BOL (Pickup)',
  bol_signed:   'Signed BOL',
  receipt:      'Receipt',
  other:        'Document',
};

const CHARGE_TYPE_LABELS = {
  lumper:        'Lumper',
  detention:     'Detention',
  layover:       'Layover',
  fuel_surcharge:'Fuel Surcharge',
  comcheck:      'Comcheck / Cash Advance',
  other:         'Other',
};

const fmt = {
  money: (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }),
  date: (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
  },
  shortDate: (d) => {
    if (!d) return 'N/A';
    try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return d; }
  },
};

const InvoiceDetail = ({ invoice: initialInvoice, load: initialLoad, broker, driver, currentUser, onBack, onInvoiceUpdated, onLoadUpdated }) => {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [load, setLoad] = useState(initialLoad);
  const [pdfLoading, setPdfLoading] = useState(false);

  const statusStyle = STATUS_STYLES[invoice.status] || STATUS_STYLES.draft;
  const charges = load?.charges || [];
  const docs = (load?.documents || []).filter((d) => d.fileName && !d.deletedAt);
  const activeDocs = (load?.documents || []).filter((d) => !d.deletedAt);
  const imageDocs = docs.filter((d) => d.base64Data?.startsWith('data:image'));

  // ── Invoice package validation ─────────────────────────────────────────────
  const hasRateCon    = activeDocs.some((d) => d.type === 'rate_con' && d.isCurrent !== false);
  const hasSignedBol  = activeDocs.some((d) => d.type === 'bol_signed');
  const lumperCharges = charges.filter((c) => c.type === 'lumper' || c.type === 'comcheck');
  const hasLumperReceipts = activeDocs.some((d) => d.type === 'receipt');
  const lumperReceiptsOk  = lumperCharges.length === 0 || hasLumperReceipts;

  const isReadyToSend = hasRateCon && hasSignedBol && lumperReceiptsOk;

  const missingItems = [
    !hasRateCon          && { label: 'Rate Confirmation', hint: 'Upload in the Documents tab' },
    !hasSignedBol        && { label: 'Signed BOL',        hint: 'Upload after delivery in Documents' },
    !lumperReceiptsOk    && { label: 'Lumper / Comcheck Receipt(s)', hint: 'Upload receipts in the Documents tab' },
  ].filter(Boolean);

  // ── Total ─────────────────────────────────────────────────────────────────
  const freightAmount  = Number(load?.rate?.amount || 0);
  const chargesTotal   = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
  const invoiceTotal   = invoice.totalAmount ?? (freightAmount + chargesTotal);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!isReadyToSend) return;
    setPdfLoading(true);
    try {
      await downloadInvoicePDF(load, invoice, broker, driver);
    } catch (e) {
      alert('PDF generation failed: ' + e.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = () => {
    if (!isReadyToSend) return;
    window.print();
  };

  const handleEmail = () => {
    if (!isReadyToSend || !broker?.email) return;
    const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} – ${load?.loadNumber}`);
    const pickupCity   = load?.pickup?.city   || load?.pickup?.facilityName   || '';
    const deliveryCity = load?.delivery?.city || load?.delivery?.facilityName || '';
    const pickupDate   = fmt.shortDate(load?.pickup?.date);
    const deliveryDate = fmt.shortDate(load?.delivery?.date);
    const body = encodeURIComponent(
      `Hello ${broker.contactName || 'Team'},\n\n` +
      `Please find attached Invoice ${invoice.invoiceNumber} for Load ${load?.loadNumber}.\n\n` +
      `Route:      ${pickupCity} → ${deliveryCity}\n` +
      `Pickup:     ${pickupDate}\n` +
      `Delivery:   ${deliveryDate}\n` +
      `Amount Due: ${fmt.money(invoice.totalAmount)}\n` +
      `Terms:      ${broker.paymentTerms || 'Net 30'}\n\n` +
      `Please remit payment to ETTR.\n\nThank you for your business!\n\nETTR`
    );
    window.open(`mailto:${broker.email}?subject=${subject}&body=${body}`);
    const updated = { ...invoice, status: 'sent', sentAt: new Date().toISOString() };
    updateInvoice(updated);
    setInvoice(updated);
    onInvoiceUpdated && onInvoiceUpdated(updated);
  };

  const handleMarkPaid = () => {
    const now = new Date().toISOString();
    const updatedInv = { ...invoice, status: 'paid', paidAt: now };
    updateInvoice(updatedInv);
    setInvoice(updatedInv);
    onInvoiceUpdated && onInvoiceUpdated(updatedInv);

    if (load) {
      const updatedLoad = {
        ...load,
        status: 'paid',
        auditLog: [
          ...(load.auditLog || []),
          createAuditEntry(currentUser?.id, 'status_changed', 'Marked as paid — invoice settled'),
        ],
      };
      updateLoad(updatedLoad);
      setLoad(updatedLoad);
      onLoadUpdated && onLoadUpdated(updatedLoad);
    }
  };

  return (
    <div style={S.page}>
      {/* ── Header ── */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={S.invNum}>{invoice.invoiceNumber}</div>
        <span style={S.statusBadge(statusStyle.color, statusStyle.bg)}>
          {invoice.status?.toUpperCase()}
        </span>
      </div>

      {/* ── Blocking banner when package is incomplete ── */}
      {!isReadyToSend && (
        <div style={{ background: '#7c2d12', borderBottom: '1px solid #9a3412', padding: '12px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#fed7aa', marginBottom: '4px' }}>
            🚫 Invoice cannot be saved, printed, or emailed — missing required documents:
          </div>
          {missingItems.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span style={{ color: '#fca5a5', fontSize: '11px', fontWeight: '700' }}>✗</span>
              <span style={{ fontSize: '11px', color: '#fed7aa' }}><strong>{item.label}</strong> — {item.hint}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Invoice preview card ── */}
      <div style={S.card}>
        {/* Letterhead */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={S.h1}>ETTR</div>
            <div style={S.sub}>Carrier Operations</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#334155' }}>INVOICE</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{invoice.invoiceNumber}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{fmt.date(invoice.generatedAt)}</div>
          </div>
        </div>

        {/* Bill To + Load Details */}
        <div style={S.twoCol}>
          <div>
            <div style={S.sectionLabel}>Bill To</div>
            <div style={S.boldName}>{broker?.companyName || 'Unknown Broker'}</div>
            <div style={S.detail}>
              {[broker?.contactName, broker?.email, broker?.phone, broker?.address]
                .filter(Boolean)
                .map((line, i) => <div key={i}>{line}</div>)}
            </div>
          </div>
          <div>
            <div style={S.sectionLabel}>Load Details</div>
            <div style={S.detail}>
              <div><strong>Load #:</strong> {load?.loadNumber}</div>
              {load?.reference?.brokerLoadNumber && <div><strong>Broker Load #:</strong> {load.reference.brokerLoadNumber}</div>}
              <div><strong>Pickup:</strong> {fmt.shortDate(load?.pickup?.date)}</div>
              <div><strong>Delivery:</strong> {fmt.shortDate(load?.delivery?.date)}</div>
              {driver && <div><strong>Driver:</strong> {driver.name}</div>}
              {broker?.paymentTerms && <div><strong>Terms:</strong> {broker.paymentTerms}</div>}
            </div>
          </div>
        </div>

        {/* Route */}
        <div style={S.routeBlock}>
          <div style={S.sectionLabel}>Route</div>
          <div style={S.routeRow}>
            <div style={S.routeCity}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{load?.pickup?.facilityName || 'Pickup'}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {[load?.pickup?.city, load?.pickup?.state].filter(Boolean).join(', ')}
              </div>
            </div>
            <div style={S.routeArrow}>→</div>
            <div style={{ ...S.routeCity, textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{load?.delivery?.facilityName || 'Delivery'}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {[load?.delivery?.city, load?.delivery?.state].filter(Boolean).join(', ')}
              </div>
            </div>
          </div>
          {load?.rate?.miles > 0 && (
            <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>{load.rate.miles} miles</div>
          )}
        </div>

        {/* ── Billing Preview — line items ── */}
        <div style={S.sectionLabel}>Billing Preview</div>
        <div>
          <div style={S.tableHead}>
            <div style={S.tableHeadCell}>Description</div>
            <div style={{ ...S.tableHeadCell, textAlign: 'right' }}>Type</div>
            <div style={{ ...S.tableHeadCell, textAlign: 'right' }}>Amount</div>
          </div>

          {/* Base freight */}
          <div style={S.tableRow(false)}>
            <div style={S.tableCell}>Freight Charges</div>
            <div style={S.tableCellMid}>{load?.rate?.type === 'per_mile' ? 'Per mile' : 'Flat rate'}</div>
            <div style={S.tableCellRight}>{fmt.money(freightAmount)}</div>
          </div>

          {/* Additional charges (lumper, detention, comcheck, etc.) */}
          {charges.map((c, i) => (
            <div key={c.id} style={S.tableRow((i + 1) % 2 === 0)}>
              <div style={S.tableCell}>{c.description || CHARGE_TYPE_LABELS[c.type] || c.type?.replace(/_/g, ' ')}</div>
              <div style={S.tableCellMid}>{CHARGE_TYPE_LABELS[c.type] || c.type?.replace(/_/g, ' ')}</div>
              <div style={S.tableCellRight}>{fmt.money(c.amount)}</div>
            </div>
          ))}

          {charges.length === 0 && (
            <div style={{ padding: '10px 0', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
              No additional charges — freight rate only
            </div>
          )}

          <div style={S.totalRow}>
            <div>
              <div style={S.totalLabel}>Total Amount Due</div>
              <div style={S.totalAmount}>{fmt.money(invoiceTotal)}</div>
            </div>
          </div>
        </div>

        {/* ── Invoice Package Checklist ── */}
        <div style={S.divider} />
        <div style={S.sectionLabel}>Invoice Package</div>
        <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 14px', marginTop: '8px' }}>
          {[
            { ok: true,              label: 'ETTR Invoice',                 sub: invoice.invoiceNumber },
            { ok: hasRateCon,        label: 'Rate Confirmation',            sub: hasRateCon        ? null : 'Missing — upload in Documents tab' },
            { ok: hasSignedBol,      label: 'Signed BOL',                   sub: hasSignedBol      ? null : 'Missing — upload after delivery' },
            ...(lumperCharges.length > 0 ? [{
              ok: hasLumperReceipts,
              label: `Lumper / Comcheck Receipt${lumperCharges.length > 1 ? 's' : ''} (${lumperCharges.length} charge${lumperCharges.length > 1 ? 's' : ''})`,
              sub: hasLumperReceipts ? null : 'Missing — upload receipts in Documents tab',
            }] : []),
          ].map(({ ok, label, sub }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: ok ? '#10b981' : '#ef4444', fontWeight: '700', marginTop: '1px' }}>{ok ? '✓' : '✗'}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: ok ? '600' : '500', color: ok ? '#0f172a' : '#7f1d1d' }}>{label}</div>
                {sub && <div style={{ fontSize: '11px', color: ok ? '#64748b' : '#b91c1c', marginTop: '1px' }}>{sub}</div>}
              </div>
            </div>
          ))}
          {!isReadyToSend && (
            <div style={{ marginTop: '8px', padding: '8px 10px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '600' }}>
                Complete the checklist above before this invoice can be saved, printed, or emailed.
              </div>
            </div>
          )}
        </div>

        {/* Attached docs */}
        {docs.length > 0 && (
          <>
            <div style={S.divider} />
            <div style={S.sectionLabel}>Attached Documents</div>
            {docs.map((d) => (
              <div key={d.id} style={S.docItem}>
                <div style={S.docName}>
                  <span style={S.docCheck}>✓</span>
                  <span>{d.fileName}</span>
                </div>
                <span style={S.docType}>{DOC_TYPE_LABELS[d.type] || d.type}</span>
              </div>
            ))}
            {docs.some((d) => d.base64Data?.startsWith('data:application/pdf')) && (
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic' }}>
                * PDF documents are listed separately; attach originals when forwarding.
              </p>
            )}
          </>
        )}

        {/* Card footer */}
        <div style={S.cardFooter}>
          Thank you for your business. Please remit payment within {broker?.paymentTerms || 'Net 30'}.
        </div>
      </div>

      {/* ── Action bar ── */}
      <div style={S.actionBar}>
        {/* Row 1: Download + Print */}
        <div style={S.btnRow}>
          <button
            style={isReadyToSend ? S.btn('#0284c7') : S.btnDisabled}
            onClick={handleDownloadPDF}
            disabled={!isReadyToSend || pdfLoading}
            title={isReadyToSend ? 'Download PDF' : 'Complete invoice package to enable'}
          >
            {pdfLoading ? 'Building PDF...' : '⬇ Download PDF'}
          </button>
          <button
            style={isReadyToSend ? S.btn('#334155') : S.btnDisabled}
            onClick={handlePrint}
            disabled={!isReadyToSend}
            title={isReadyToSend ? 'Print' : 'Complete invoice package to enable'}
          >
            🖨 Print
          </button>
        </div>

        {/* Row 2: Email + Mark Paid */}
        {(broker?.email || invoice.status !== 'paid') && (
          <div style={S.btnRow}>
            {broker?.email && (
              <button
                style={isReadyToSend ? S.btn('#059669') : S.btnDisabled}
                onClick={handleEmail}
                disabled={!isReadyToSend}
                title={isReadyToSend ? 'Email to broker' : 'Complete invoice package to enable'}
              >
                ✉ Email to Broker
              </button>
            )}
            {invoice.status !== 'paid' && (
              <button style={S.btn('#1e293b', '#e2e8f0')} onClick={handleMarkPaid}>✅ Mark as Paid</button>
            )}
          </div>
        )}

        {/* Status note */}
        {!isReadyToSend ? (
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#f97316', marginTop: '4px', fontWeight: '600' }}>
            🚫 Missing required documents — upload in the Documents tab
          </div>
        ) : imageDocs.length > 0 && !pdfLoading ? (
          <div style={S.btnNote}>
            PDF includes {imageDocs.length} image document{imageDocs.length > 1 ? 's' : ''}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InvoiceDetail;
