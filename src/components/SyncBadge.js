import { useData } from '../context/DataContext';

const STATUS_CONFIG = {
  idle: null,
  syncing: { label: 'Syncing...', cls: 'bg-blue-600 animate-pulse' },
  synced: { label: 'Synced', cls: 'bg-emerald-600' },
  error: { label: 'Sync Error', cls: 'bg-red-600' },
  offline: { label: 'Offline', cls: 'bg-amber-600' },
  queued: { label: 'Queued', cls: 'bg-amber-500' },
  no_config: null,
};

export default function SyncBadge() {
  const { syncStatus, online, lastSynced, pullFromGitHub } = useData();

  const cfg = online ? STATUS_CONFIG[syncStatus] : STATUS_CONFIG.offline;
  if (!cfg) return null;

  const timeAgo = lastSynced
    ? (() => {
        const diff = Date.now() - new Date(lastSynced).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ago`;
      })()
    : null;

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
      {timeAgo && (
        <span className="text-xs text-slate-500">{timeAgo}</span>
      )}
      <button
        onClick={pullFromGitHub}
        className={`text-xs font-semibold px-3 py-1.5 rounded-full text-white ${cfg.cls}`}
        title="Tap to sync"
      >
        {cfg.label}
      </button>
    </div>
  );
}
