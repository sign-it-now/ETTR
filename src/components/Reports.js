import React, { useState } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = {
  money: (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  month: (isoYYYYMM) => {
    if (!isoYYYYMM || isoYYYYMM === 'unknown') return '—';
    const [y, m] = isoYYYYMM.split('-');
    return new Date(Number(y), Number(m) - 1, 1)
      .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  },
  pct: (a, b) => b > 0 ? Math.round((a / b) * 100) + '%' : '—',
};

const PRE_2026 = new Date('2026-01-01T00:00:00.000Z');

// ─── Styles ─────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh', background: '#0f172a', color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '16px', paddingBottom: '96px',
  },
  sectionTitle: {
    fontSize: '11px', fontWeight: '700', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    marginBottom: '10px', marginTop: '20px',
  },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  statCard: (accent) => ({
    background: '#1e293b', border: '1px solid #334155', borderRadius: '10px',
    padding: '14px 14px 12px', borderLeft: `3px solid ${accent}`,
  }),
  statValue: (color) => ({
    fontSize: '21px', fontWeight: '800', color: color || '#e2e8f0', lineHeight: 1.1,
  }),
  statLabel: { fontSize: '11px', fontWeight: '600', color: '#64748b', marginTop: '4px' },
  statSub: { fontSize: '11px', color: '#475569', marginTop: '2px' },
  // table
  table: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: '10px', overflow: 'hidden',
  },
  tHead: (cols) => ({
    display: 'grid', gridTemplateColumns: cols,
    padding: '8px 14px', background: '#0f172a',
    borderBottom: '1px solid #334155',
  }),
  tRow: (shade, cols) => ({
    display: 'grid', gridTemplateColumns: cols,
    padding: '10px 14px',
    background: shade ? '#162032' : '#1e293b',
    borderBottom: '1px solid #1a2438',
  }),
  th: { fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' },
  thRight: { fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' },
  td: { fontSize: '13px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tdMuted: { fontSize: '12px', color: '#64748b', textAlign: 'right' },
  tdRight: { fontSize: '13px', color: '#e2e8f0', textAlign: 'right' },
  tdGreen: { fontSize: '13px', color: '#4ade80', textAlign: 'right', fontWeight: '600' },
  tdAmber: { fontSize: '13px', color: '#fb923c', textAlign: 'right', fontWeight: '600' },
  // empty state
  empty: {
    textAlign: 'center', color: '#475569', padding: '28px 16px',
    background: '#1e293b', borderRadius: '10px', border: '1px solid #334155', fontSize: '13px',
  },
  // cleanup
  cleanupCard: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: '10px', padding: '14px',
  },
  oldList: {
    maxHeight: '120px', overflowY: 'auto', background: '#0f172a',
    borderRadius: '6px', padding: '8px 10px', margin: '8px 0',
  },
  deleteBtn: {
    width: '100%', background: '#7f1d1d', border: '1px solid #991b1b',
    borderRadius: '8px', color: '#fca5a5', padding: '12px',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '4px',
  },
  // modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    background: '#1e293b', borderRadius: '16px 16px 0 0',
    padding: '20px 20px 40px', width: '100%', maxWidth: '480px',
    border: '1px solid #334155',
  },
  modalTitle: { fontSize: '16px', fontWeight: '700', color: '#e2e8f0', marginBottom: '10px' },
  modalBtn: (bg) => ({
    width: '100%', background: bg, border: 'none', borderRadius: '8px',
    padding: '14px', color: '#fff', fontSize: '15px', fontWeight: '700',
    cursor: 'pointer', marginTop: '8px',
  }),
  cancelBtn: {
    width: '100%', background: 'none', border: '1px solid #334155',
    borderRadius: '8px', padding: '14px', color: '#64748b',
    fontSize: '15px', cursor: 'pointer', marginTop: '8px',
  },
};

// ─── Reports ────────────────────────────────────────────────────────────────
const Reports = ({ loads, invoices, currentUser, onDeleteLoads }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const isAdmin = currentUser?.role === 'admin';

  // ── Financial totals (from invoices) ──────────────────────────────────────
  const totalBilled   = invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const collected     = invoices.filter(i => i.status === 'paid')
                          .reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const outstanding   = invoices.filter(i => i.status !== 'paid')
                          .reduce((s, i) => s + Number(i.totalAmount || 0), 0);

  // In pipeline: delivered loads awaiting invoice
  const pipeline      = loads
    .filter(l => l.status === 'delivered')
    .reduce((s, l) => {
      const charges = (l.charges || []).reduce((cs, c) => cs + Number(c.amount || 0), 0);
      return s + Number(l.rate?.amount || 0) + charges;
    }, 0);

  // Load counts
  const totalLoads     = loads.length;
  const activeLoads    = loads.filter(l =>
    !['invoiced', 'paid'].includes(l.status)).length;
  const completedLoads = loads.filter(l =>
    ['invoiced', 'paid'].includes(l.status)).length;

  // ── Monthly breakdown (grouped by invoice generatedAt month) ──────────────
  const monthlyMap = {};
  for (const inv of invoices) {
    const key = inv.generatedAt ? inv.generatedAt.slice(0, 7) : null;
    if (!key) continue;
    if (!monthlyMap[key]) monthlyMap[key] = { billed: 0, collected: 0, count: 0 };
    monthlyMap[key].billed += Number(inv.totalAmount || 0);
    if (inv.status === 'paid') monthlyMap[key].collected += Number(inv.totalAmount || 0);
    monthlyMap[key].count++;
  }
  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12);

  // ── By Broker ─────────────────────────────────────────────────────────────
  const brokerMap = {};
  for (const inv of invoices) {
    const load = loads.find(l => l.id === inv.loadId);
    const name = load?.broker?.companyName || 'Unknown Broker';
    if (!brokerMap[name]) brokerMap[name] = { billed: 0, collected: 0, count: 0 };
    brokerMap[name].billed += Number(inv.totalAmount || 0);
    if (inv.status === 'paid') brokerMap[name].collected += Number(inv.totalAmount || 0);
    brokerMap[name].count++;
  }
  const brokerRows = Object.entries(brokerMap)
    .sort(([, a], [, b]) => b.billed - a.billed)
    .slice(0, 10);

  // ── Pre-2026 loads (data cleanup) ─────────────────────────────────────────
  const oldLoads = loads.filter(l => {
    const dateStr = l.createdAt || l.pickup?.date;
    if (!dateStr) return false;
    return new Date(dateStr) < PRE_2026;
  });

  const handleDeleteOld = () => {
    onDeleteLoads && onDeleteLoads(oldLoads.map(l => l.id));
    setShowDeleteModal(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>

      {/* ── Financial Summary ─────────────────────────────────────────── */}
      <div style={S.sectionTitle}>Financial Summary</div>
      <div style={S.statGrid}>
        <div style={S.statCard('#38bdf8')}>
          <div style={S.statValue('#38bdf8')}>{fmt.money(totalBilled)}</div>
          <div style={S.statLabel}>Total Billed</div>
        </div>
        <div style={S.statCard('#4ade80')}>
          <div style={S.statValue('#4ade80')}>{fmt.money(collected)}</div>
          <div style={S.statLabel}>Collected</div>
          {totalBilled > 0 && (
            <div style={S.statSub}>{fmt.pct(collected, totalBilled)} of billed</div>
          )}
        </div>
        <div style={S.statCard('#fb923c')}>
          <div style={S.statValue('#fb923c')}>{fmt.money(outstanding)}</div>
          <div style={S.statLabel}>Outstanding</div>
        </div>
        <div style={S.statCard('#a78bfa')}>
          <div style={S.statValue('#a78bfa')}>{fmt.money(pipeline)}</div>
          <div style={S.statLabel}>Ready to Invoice</div>
        </div>
      </div>

      {/* ── Load Activity ─────────────────────────────────────────────── */}
      <div style={{ ...S.statGrid, marginTop: '8px' }}>
        <div style={S.statCard('#334155')}>
          <div style={S.statValue('#e2e8f0')}>{totalLoads}</div>
          <div style={S.statLabel}>Total Loads</div>
        </div>
        <div style={S.statCard('#334155')}>
          <div style={S.statValue('#e2e8f0')}>
            {activeLoads}
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}> active</span>
          </div>
          <div style={S.statLabel}>{completedLoads} invoiced / paid</div>
        </div>
      </div>

      {/* ── No data yet ───────────────────────────────────────────────── */}
      {invoices.length === 0 && (
        <div style={{ ...S.empty, marginTop: '16px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
          Reports populate as loads are invoiced and marked paid.
        </div>
      )}

      {/* ── Monthly Breakdown ─────────────────────────────────────────── */}
      {monthly.length > 0 && (
        <>
          <div style={S.sectionTitle}>Monthly Breakdown</div>
          <div style={S.table}>
            <div style={S.tHead('1fr 42px 80px 84px')}>
              <div style={S.th}>Month</div>
              <div style={S.thRight}>Loads</div>
              <div style={S.thRight}>Billed</div>
              <div style={S.thRight}>Collected</div>
            </div>
            {monthly.map(([key, row], i) => (
              <div key={key} style={S.tRow(i % 2 === 1, '1fr 42px 80px 84px')}>
                <div style={S.td}>{fmt.month(key)}</div>
                <div style={S.tdMuted}>{row.count}</div>
                <div style={S.tdRight}>{fmt.money(row.billed)}</div>
                <div style={row.collected >= row.billed ? S.tdGreen : S.tdAmber}>
                  {fmt.money(row.collected)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── By Broker ─────────────────────────────────────────────────── */}
      {brokerRows.length > 0 && (
        <>
          <div style={S.sectionTitle}>By Broker</div>
          <div style={S.table}>
            <div style={S.tHead('1fr 42px 80px 72px')}>
              <div style={S.th}>Broker</div>
              <div style={S.thRight}>Loads</div>
              <div style={S.thRight}>Billed</div>
              <div style={S.thRight}>Collected</div>
            </div>
            {brokerRows.map(([name, row], i) => (
              <div key={name} style={S.tRow(i % 2 === 1, '1fr 42px 80px 72px')}>
                <div style={S.td}>{name}</div>
                <div style={S.tdMuted}>{row.count}</div>
                <div style={S.tdRight}>{fmt.money(row.billed)}</div>
                <div style={row.collected > 0 ? S.tdGreen : S.tdMuted}>
                  {row.collected > 0 ? fmt.money(row.collected) : '—'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Data Management (admin only) ──────────────────────────────── */}
      {isAdmin && (
        <>
          <div style={S.sectionTitle}>Data Management</div>
          <div style={S.cleanupCard}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>
              Pre-2026 Loads
            </div>
            {oldLoads.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#4ade80' }}>
                ✓ No loads before Jan 1, 2026 found
              </div>
            ) : (
              <>
                <div style={{ fontSize: '13px', color: '#fb923c' }}>
                  {oldLoads.length} load{oldLoads.length !== 1 ? 's' : ''} found before Jan 1, 2026
                </div>
                <div style={S.oldList}>
                  {oldLoads.map(l => (
                    <div key={l.id} style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '3px' }}>
                      {l.loadNumber} — {l.broker?.companyName || '—'} — {l.status}
                    </div>
                  ))}
                </div>
                <button style={S.deleteBtn} onClick={() => setShowDeleteModal(true)}>
                  🗑 Delete {oldLoads.length} Pre-2026 Load{oldLoads.length !== 1 ? 's' : ''}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Delete modal ──────────────────────────────────────────────── */}
      {showDeleteModal && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>🗑 Delete {oldLoads.length} Pre-2026 Load{oldLoads.length !== 1 ? 's' : ''}?</div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 14px', lineHeight: 1.6 }}>
              All loads created before <strong style={{ color: '#e2e8f0' }}>January 1, 2026</strong> will be permanently removed. This cannot be undone.
            </p>
            <button style={S.modalBtn('#ef4444')} onClick={handleDeleteOld}>
              Delete {oldLoads.length} Load{oldLoads.length !== 1 ? 's' : ''}
            </button>
            <button style={S.cancelBtn} onClick={() => setShowDeleteModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
