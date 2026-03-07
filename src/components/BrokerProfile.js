import React from 'react';
import { getStatus } from '../data/models';

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: '40px' },
  header: { background: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 20 },
  backBtn: { background: 'none', border: 'none', color: '#38bdf8', fontSize: '22px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  headerName: { fontSize: '15px', fontWeight: '800', color: '#e2e8f0', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  section: { margin: '12px 16px 0', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' },
  sectionHead: { padding: '10px 14px', borderBottom: '1px solid #334155', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' },
  sectionBody: { padding: '12px 14px' },
  // Stats row
  statsRow: { display: 'flex', gap: '8px', margin: '12px 16px 0' },
  stat: { flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 8px', textAlign: 'center' },
  statVal: (color) => ({ fontSize: '20px', fontWeight: '800', color: color || '#38bdf8' }),
  statLbl: { fontSize: '10px', color: '#475569', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' },
  // Info rows
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' },
  infoLabel: { fontSize: '12px', color: '#475569', flexShrink: 0, marginRight: '12px', paddingTop: '1px' },
  infoValue: { fontSize: '13px', color: '#e2e8f0', textAlign: 'right', wordBreak: 'break-word', maxWidth: '60%' },
  link: { fontSize: '13px', color: '#38bdf8', textDecoration: 'none' },
  // Mini load card
  miniCard: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  miniLeft: { flex: 1, minWidth: 0 },
  miniNum: { fontSize: '13px', fontWeight: '700', color: '#e2e8f0' },
  miniRoute: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  miniMeta: { fontSize: '11px', color: '#475569', marginTop: '3px' },
  miniRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', paddingLeft: '8px', flexShrink: 0 },
  statusBadge: (s) => ({ display: 'inline-block', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '10px', background: s.bg, color: s.color }),
  miniAmt: { fontSize: '13px', fontWeight: '700', color: '#e2e8f0' },
  arrow: { fontSize: '16px', color: '#334155', paddingTop: '6px' },
  empty: { textAlign: 'center', color: '#475569', padding: '32px 16px', fontSize: '13px' },
  reliabilityBadge: (ok) => ({ fontSize: '12px', fontWeight: '700', padding: '3px 8px', borderRadius: '10px', background: ok ? '#14532d' : '#450a0a', color: ok ? '#86efac' : '#fca5a5' }),
};

const fmt = {
  money: (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  date: (d) => {
    if (!d) return '';
    try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return d; }
  },
};

const BrokerProfile = ({ broker, loads, currentUser, onBack, onSelectLoad }) => {
  // ── Compute live stats from loads ──────────────────────────────────────────
  const brokerLoads = (loads || []).filter((l) => l.broker?.id === broker.id);

  const completedLoads = brokerLoads.filter((l) => ['invoiced', 'paid'].includes(l.status));

  const totalBilled = completedLoads.reduce((s, l) => {
    const charges = (l.charges || []).reduce((cs, c) => cs + Number(c.amount || 0), 0);
    return s + Number(l.rate?.amount || 0) + charges;
  }, 0);

  const avgRate = brokerLoads.length > 0
    ? brokerLoads.reduce((s, l) => s + Number(l.rate?.amount || 0), 0) / brokerLoads.length
    : 0;

  const rateConChanges = brokerLoads.reduce((n, l) =>
    n + (l.documents || []).filter((d) => d.type === 'rate_con' && (!d.isCurrent || d.deletedAt)).length
  , 0);

  const isReliable = rateConChanges <= 2;

  // Sort loads newest first
  const sortedLoads = [...brokerLoads].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );

  return (
    <div style={S.page}>
      {/* ── Header ── */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={S.headerName}>{broker.companyName || 'Unknown Broker'}</div>
        <span style={S.reliabilityBadge(isReliable)}>
          {isReliable ? '✓ Reliable' : '⚠️ Caution'}
        </span>
      </div>

      {/* ── Stats ── */}
      <div style={S.statsRow}>
        <div style={S.stat}>
          <div style={S.statVal()}>{brokerLoads.length}</div>
          <div style={S.statLbl}>Total Loads</div>
        </div>
        <div style={S.stat}>
          <div style={S.statVal()}>{fmt.money(avgRate)}</div>
          <div style={S.statLbl}>Avg Rate</div>
        </div>
        <div style={S.stat}>
          <div style={S.statVal(rateConChanges > 0 ? '#ef4444' : '#4ade80')}>{rateConChanges}</div>
          <div style={S.statLbl}>RC Changes</div>
        </div>
      </div>

      {/* ── Extra stat: Total Billed ── */}
      {totalBilled > 0 && (
        <div style={{ margin: '8px 16px 0', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Total Billed ({completedLoads.length} invoiced)</span>
          <span style={{ fontSize: '16px', fontWeight: '800', color: '#38bdf8' }}>{fmt.money(totalBilled)}</span>
        </div>
      )}

      {/* ── Contact ── */}
      <div style={S.section}>
        <div style={S.sectionHead}>🏢 Contact</div>
        <div style={S.sectionBody}>
          {broker.contactName && (
            <div style={S.infoRow}>
              <span style={S.infoLabel}>Contact</span>
              <span style={S.infoValue}>{broker.contactName}</span>
            </div>
          )}
          {broker.email && (
            <div style={S.infoRow}>
              <span style={S.infoLabel}>Email</span>
              <a href={`mailto:${broker.email}`} style={S.link}>{broker.email}</a>
            </div>
          )}
          {broker.phone && (
            <div style={S.infoRow}>
              <span style={S.infoLabel}>Phone</span>
              <a href={`tel:${broker.phone}`} style={S.link}>{broker.phone}</a>
            </div>
          )}
          {broker.address && (
            <div style={S.infoRow}>
              <span style={S.infoLabel}>Address</span>
              <span style={S.infoValue}>{broker.address}</span>
            </div>
          )}
          {broker.mcNumber && (
            <div style={S.infoRow}>
              <span style={S.infoLabel}>MC#</span>
              <span style={S.infoValue}>{broker.mcNumber}</span>
            </div>
          )}
          {broker.dotNumber && (
            <div style={S.infoRow}>
              <span style={S.infoLabel}>DOT#</span>
              <span style={S.infoValue}>{broker.dotNumber}</span>
            </div>
          )}
          <div style={{ ...S.infoRow, marginBottom: 0 }}>
            <span style={S.infoLabel}>Terms</span>
            <span style={{ ...S.infoValue, color: '#38bdf8', fontWeight: '700' }}>
              {broker.paymentTerms || 'Net 30'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Load History ── */}
      <div style={S.section}>
        <div style={S.sectionHead}>📋 Load History ({brokerLoads.length})</div>
        <div style={S.sectionBody}>
          {sortedLoads.length === 0 ? (
            <div style={S.empty}>No loads with this broker yet.</div>
          ) : (
            sortedLoads.map((load) => {
              const status = getStatus(load.status);
              const loadTotal = (load.charges || []).reduce((s, c) => s + Number(c.amount || 0), 0) + Number(load.rate?.amount || 0);
              return (
                <div key={load.id} style={S.miniCard} onClick={() => onSelectLoad(load)}>
                  <div style={S.miniLeft}>
                    <div style={S.miniNum}>{load.loadNumber}</div>
                    <div style={S.miniRoute}>
                      {[load.pickup?.city, load.pickup?.state].filter(Boolean).join(', ') || '—'}
                      {' → '}
                      {[load.delivery?.city, load.delivery?.state].filter(Boolean).join(', ') || '—'}
                    </div>
                    <div style={S.miniMeta}>
                      {fmt.date(load.pickup?.date)}
                      {load.rate?.miles > 0 ? ` · ${load.rate.miles} mi` : ''}
                    </div>
                  </div>
                  <div style={S.miniRight}>
                    <span style={S.statusBadge(status)}>{status.label}</span>
                    <span style={S.miniAmt}>{fmt.money(loadTotal)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default BrokerProfile;
