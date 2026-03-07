import React, { useState } from 'react';
import LoadCard from './LoadCard';
import { STATUS_MAP } from '../data/models';

const formatMoney = (n) =>
  Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

const IN_PROGRESS_STATUSES = ['rate_con_received', 'accepted', 'dispatched', 'picked_up', 'in_transit'];
const ACTIVE_STATUSES = [...IN_PROGRESS_STATUSES, 'delivered'];

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color }) => (
  <div style={{
    background: '#1e293b', border: '1px solid #334155', borderRadius: '10px',
    padding: '12px 14px', flex: 1, minWidth: 0,
  }}>
    <div style={{ fontSize: '22px', fontWeight: '800', color: color || '#e2e8f0' }}>{value}</div>
    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginTop: '2px' }}>{label}</div>
    {sub && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{sub}</div>}
  </div>
);

// ─── Filter tab ──────────────────────────────────────────────────────────────
const FilterTab = ({ label, active, count, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? '#0284c7' : '#1e293b',
      border: active ? '1px solid #0369a1' : '1px solid #334155',
      borderRadius: '20px',
      padding: '6px 14px',
      color: active ? '#fff' : '#64748b',
      fontSize: '12px',
      fontWeight: active ? '700' : '400',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
    }}
  >
    {label}
    {count > 0 && (
      <span style={{
        background: active ? 'rgba(255,255,255,0.25)' : '#334155',
        borderRadius: '10px', padding: '0 5px', fontSize: '11px', fontWeight: '700',
      }}>
        {count}
      </span>
    )}
  </button>
);

// ─── Dashboard ───────────────────────────────────────────────────────────────
const Dashboard = ({ loads, drivers, currentUser, onNewLoad, onSelectLoad, showAll = false }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Role-based visibility
  const visibleLoads = currentUser?.role === 'driver'
    ? loads.filter((l) => l.assignedDriverId === currentUser.id)
    : loads;

  // Text search
  const searchLower = search.toLowerCase().trim();
  const searchFiltered = searchLower
    ? visibleLoads.filter((l) =>
        [l.loadNumber, l.broker?.companyName, l.pickup?.city, l.pickup?.state,
         l.delivery?.city, l.delivery?.state, l.reference?.brokerLoadNumber]
          .some((v) => v?.toLowerCase().includes(searchLower))
      )
    : visibleLoads;

  const inProgress = visibleLoads.filter((l) => IN_PROGRESS_STATUSES.includes(l.status)).length;
  const toInvoice = visibleLoads.filter((l) => l.status === 'delivered').length;
  const needsUpload = visibleLoads.filter((l) => l.status === 'rate_con_upload').length;
  const invoiced = visibleLoads.filter((l) => ['invoiced', 'paid'].includes(l.status));

  const outstanding = visibleLoads
    .filter((l) => l.status === 'invoiced')
    .reduce((sum, l) => {
      const charges = (l.charges || []).reduce((s, c) => s + Number(c.amount || 0), 0);
      return sum + Number(l.rate?.amount || 0) + charges;
    }, 0);

  // Filter loads by tab — when showAll, "all" includes every status
  const FILTERS = {
    all: showAll ? () => true : (l) => ACTIVE_STATUSES.includes(l.status) || l.status === 'rate_con_upload',
    needs_upload: (l) => l.status === 'rate_con_upload',
    in_transit: (l) => ['picked_up', 'in_transit'].includes(l.status),
    delivered: (l) => l.status === 'delivered',
    invoiced: (l) => ['invoiced', 'paid'].includes(l.status),
  };

  // Sort: needs action first, then by updated date desc
  const sortedLoads = [...searchFiltered]
    .filter(FILTERS[filter] || FILTERS.all)
    .sort((a, b) => {
      const priority = { rate_con_upload: 0, delivered: 1 };
      const pa = priority[a.status] ?? 2;
      const pb = priority[b.status] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

  const tabCounts = {
    all: searchFiltered.filter(FILTERS.all).length,
    needs_upload: searchFiltered.filter((l) => l.status === 'rate_con_upload').length,
    in_transit: searchFiltered.filter(FILTERS.in_transit).length,
    delivered: searchFiltered.filter((l) => l.status === 'delivered').length,
    invoiced: searchFiltered.filter(FILTERS.invoiced).length,
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '24px' }}>
      {/* ── Stats row ─────────────────────────────────────────────── */}
      {currentUser?.role === 'admin' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
          <StatCard label="In Progress" value={inProgress} color="#38bdf8" />
          <StatCard label="To Invoice" value={toInvoice} color="#4ade80" />
          <StatCard label="Outstanding" value={formatMoney(outstanding)} sub="invoiced" color="#fb923c" />
        </div>
      )}

      {/* ── New Load button ───────────────────────────────────────── */}
      {currentUser?.role === 'admin' && (
        <button
          onClick={onNewLoad}
          style={{
            width: '100%', background: '#0c2a4a', border: '2px dashed #0284c7',
            borderRadius: '10px', padding: '16px', color: '#38bdf8',
            fontSize: '15px', fontWeight: '700', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '20px' }}>＋</span> New Load — Import Rate Con
        </button>
      )}

      {/* ── Search ────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', pointerEvents: 'none', lineHeight: 1 }}>🔍</span>
        <input
          style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', padding: '9px 32px 9px 32px', fontSize: '14px', outline: 'none' }}
          placeholder="Search loads, brokers, cities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px', padding: '2px', lineHeight: 1 }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px',
        marginBottom: '12px', scrollbarWidth: 'none',
      }}>
        <FilterTab label={showAll ? 'All' : 'All Active'} active={filter === 'all'} count={tabCounts.all} onClick={() => setFilter('all')} />
        {tabCounts.needs_upload > 0 && (
          <FilterTab label="Needs Upload" active={filter === 'needs_upload'} count={tabCounts.needs_upload} onClick={() => setFilter('needs_upload')} />
        )}
        <FilterTab label="In Transit" active={filter === 'in_transit'} count={tabCounts.in_transit} onClick={() => setFilter('in_transit')} />
        <FilterTab label="Delivered" active={filter === 'delivered'} count={tabCounts.delivered} onClick={() => setFilter('delivered')} />
        <FilterTab label="Invoiced" active={filter === 'invoiced'} count={tabCounts.invoiced} onClick={() => setFilter('invoiced')} />
      </div>

      {/* ── Load cards ────────────────────────────────────────────── */}
      {sortedLoads.length === 0 ? (
        <div style={{
          textAlign: 'center', color: '#475569', padding: '40px 16px',
          background: '#1e293b', borderRadius: '10px', border: '1px solid #334155',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>🚛</div>
          {search
            ? <div style={{ fontSize: '15px', color: '#64748b' }}>No loads match "{search}"</div>
            : filter === 'all'
              ? <div style={{ fontSize: '15px', color: '#64748b' }}>No active loads — tap New Load to get started</div>
              : <div style={{ fontSize: '15px', color: '#64748b' }}>No loads in this category</div>
          }
        </div>
      ) : (
        sortedLoads.map((load) => (
          <LoadCard
            key={load.id}
            load={load}
            drivers={drivers}
            onClick={onSelectLoad}
          />
        ))
      )}
    </div>
  );
};

export default Dashboard;
