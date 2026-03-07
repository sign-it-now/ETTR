import { useState } from 'react';
import { useData } from '../context/DataContext';

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

const FILTER_PILLS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'rate_con_received', label: 'Rate Con' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'invoiced', label: 'Invoiced' },
];

function cityFromAddress(address) {
  if (!address) return '';
  const parts = address.split(',');
  return parts[parts.length >= 2 ? parts.length - 2 : 0].trim();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMoney(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

function SyncButton({ syncStatus, online, lastSynced, onSync }) {
  // Label and color based on current state
  if (!online) {
    return (
      <button
        onClick={onSync}
        className="text-xs bg-amber-900/50 border border-amber-700/50 text-amber-400 px-3 py-1.5 rounded-full font-medium"
      >
        Offline
      </button>
    );
  }
  if (syncStatus === 'syncing') {
    return (
      <button disabled className="text-xs bg-blue-900/50 text-blue-400 px-3 py-1.5 rounded-full font-medium animate-pulse">
        Syncing...
      </button>
    );
  }
  if (syncStatus === 'queued') {
    return (
      <button
        onClick={onSync}
        className="text-xs bg-amber-900/50 border border-amber-700/50 text-amber-400 px-3 py-1.5 rounded-full font-medium"
        title="Changes queued — tap to retry"
      >
        Retry Sync
      </button>
    );
  }
  if (syncStatus === 'error') {
    return (
      <button
        onClick={onSync}
        className="text-xs bg-red-900/50 border border-red-700/50 text-red-400 px-3 py-1.5 rounded-full font-medium"
      >
        Sync Error
      </button>
    );
  }
  if (syncStatus === 'synced' && lastSynced) {
    const mins = Math.floor((Date.now() - new Date(lastSynced).getTime()) / 60000);
    const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
    return (
      <button
        onClick={onSync}
        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-1.5 rounded-full font-medium transition-colors"
        title="Tap to sync"
      >
        ✓ {ago}
      </button>
    );
  }
  return (
    <button
      onClick={onSync}
      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full font-medium transition-colors"
    >
      Sync
    </button>
  );
}

export default function DashboardScreen({ nav }) {
  const { loads, drivers, brokers, currentUser, logout, pullFromGitHub, syncStatus, lastSynced, online } = useData();
  const [filter, setFilter] = useState('all');

  const isAdmin = currentUser?.role === 'admin';

  // Drivers see only their loads
  const visibleLoads = isAdmin
    ? loads
    : loads.filter((l) => l.assignedDriverId === currentUser?.id);

  // Apply filter
  const filteredLoads = visibleLoads.filter((l) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['paid', 'invoiced'].includes(l.status);
    return l.status === filter;
  });

  // Sort by updatedAt desc
  const sortedLoads = [...filteredLoads].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  );

  // Quick stats
  const inProgress = visibleLoads.filter(
    (l) => !['invoiced', 'paid', 'delivered'].includes(l.status)
  ).length;
  const readyToInvoice = visibleLoads.filter((l) => l.status === 'delivered').length;
  const needsAction = visibleLoads.filter((l) =>
    ['rate_con_received', 'accepted'].includes(l.status)
  ).length;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 z-40">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white tracking-tight">ETTR</span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
              {currentUser?.name}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isAdmin ? 'bg-blue-900/50 text-blue-400' : 'bg-slate-800 text-slate-500'
            }`}>
              {isAdmin ? 'Admin' : 'Driver'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SyncButton
              syncStatus={syncStatus}
              online={online}
              lastSynced={lastSynced}
              onSync={pullFromGitHub}
            />
            {isAdmin && (
              <button
                onClick={() => nav('settings')}
                className="text-slate-400 hover:text-white p-1.5 text-lg leading-none"
                title="Settings"
              >
                &#9881;
              </button>
            )}
            <button
              onClick={logout}
              className="text-slate-500 hover:text-white text-xs px-2 py-1.5"
            >
              Out
            </button>
          </div>
        </div>
      </div>

      {/* Offline banner */}
      {!online && (
        <div className="bg-amber-900/30 border-b border-amber-800/50 px-4 py-2 text-center">
          <span className="text-amber-400 text-xs font-semibold">
            Offline — changes will sync when connection returns
          </span>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pb-24">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 mb-4">
          <button
            onClick={() => setFilter('active')}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 text-center transition-colors"
          >
            <div className="text-2xl font-black text-blue-400">{inProgress}</div>
            <div className="text-xs text-slate-500 mt-0.5">In Progress</div>
          </button>
          <button
            onClick={() => setFilter('delivered')}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 text-center transition-colors"
          >
            <div className="text-2xl font-black text-emerald-400">{readyToInvoice}</div>
            <div className="text-xs text-slate-500 mt-0.5">Ready to Invoice</div>
          </button>
          <button
            onClick={() => setFilter('rate_con_received')}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 text-center transition-colors"
          >
            <div className="text-2xl font-black text-amber-400">{needsAction}</div>
            <div className="text-xs text-slate-500 mt-0.5">Needs Action</div>
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {FILTER_PILLS.map((p) => (
            <button
              key={p.key}
              onClick={() => setFilter(p.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === p.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Create button (admin only) */}
        {isAdmin && (
          <button
            onClick={() => nav('create-load')}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl text-sm mb-4 transition-colors"
          >
            + New Load
          </button>
        )}

        {/* Load list */}
        <div className="space-y-3">
          {sortedLoads.length === 0 && (
            <div className="text-center text-slate-500 py-16 text-sm">
              {filter === 'all'
                ? 'No loads yet. Create one to get started.'
                : 'No loads match this filter.'}
            </div>
          )}

          {sortedLoads.map((load) => {
            const broker = brokers.find((b) => b.id === load.brokerId);
            const driver = drivers.find((d) => d.id === load.assignedDriverId);
            const pickupCity = cityFromAddress(load.shipper?.address);
            const deliveryCity = cityFromAddress(load.consignee?.address);

            return (
              <button
                key={load.id}
                onClick={() => nav('load-detail', { loadId: load.id })}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 text-left transition-colors"
              >
                {/* Top row: load number + status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-bold text-sm text-white">{load.loadNumber}</span>
                    {load.referenceNumber && (
                      <span className="text-xs text-slate-500 ml-2">{load.referenceNumber}</span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full text-white ${
                      STATUS_COLORS[load.status] || 'bg-slate-600'
                    }`}
                  >
                    {STATUS_LABELS[load.status] || load.status}
                  </span>
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                  <span className="font-medium">{pickupCity || '—'}</span>
                  <span className="text-slate-600 text-xs">&#8594;</span>
                  <span className="font-medium">{deliveryCity || '—'}</span>
                </div>

                {/* Bottom row: broker/driver + date/rate */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    {broker && <span>{broker.companyName}</span>}
                    {driver && (
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                        {driver.name.split(' ')[0]}
                      </span>
                    )}
                    {!load.assignedDriverId && isAdmin && (
                      <span className="bg-amber-900/40 text-amber-500 px-2 py-0.5 rounded">
                        Unassigned
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {load.shipper?.pickupDate && (
                      <span>{formatDate(load.shipper.pickupDate)}</span>
                    )}
                    {load.rate?.amount && (
                      <span className="text-emerald-400 font-semibold">
                        {formatMoney(load.rate.amount)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
