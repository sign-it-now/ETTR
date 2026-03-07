import React from 'react';
import { getLastSync } from '../../services/storage';

// syncStatus: 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
const SyncIndicator = ({ syncStatus, onSyncClick, className = '' }) => {
  const lastSync = getLastSync();

  const formatLastSync = () => {
    if (!lastSync) return '';
    const d = new Date(lastSync);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  const config = {
    idle: {
      dot: '#9ca3af',
      label: 'Tap to sync',
      spinning: false,
    },
    syncing: {
      dot: '#3b82f6',
      label: 'Syncing...',
      spinning: true,
    },
    synced: {
      dot: '#22c55e',
      label: `Synced ${formatLastSync()}`,
      spinning: false,
    },
    offline: {
      dot: '#f59e0b',
      label: 'Offline',
      spinning: false,
    },
    error: {
      dot: '#ef4444',
      label: 'Sync error',
      spinning: false,
    },
  };

  const status = config[syncStatus] || config.idle;

  return (
    <button
      onClick={onSyncClick}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '20px',
        padding: '4px 10px',
        cursor: 'pointer',
        color: '#e2e8f0',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        minWidth: '90px',
      }}
      title={syncStatus === 'error' ? 'Sync failed — tap to retry' : 'Tap to sync now'}
    >
      {status.spinning ? (
        <span
          style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            border: '2px solid #3b82f6',
            borderTopColor: 'transparent',
            animation: 'ettr-spin 0.7s linear infinite',
            flexShrink: 0,
          }}
        />
      ) : (
        <span
          style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: status.dot,
            flexShrink: 0,
          }}
        />
      )}
      <span>{status.label}</span>

      <style>{`
        @keyframes ettr-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};

export default SyncIndicator;
