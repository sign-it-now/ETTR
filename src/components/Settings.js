import React, { useState, useEffect } from 'react';
import { SEED_DATA } from '../data/seedData';
import { getLastSync } from '../services/storage';

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: '100px', paddingTop: '8px' },
  section: { margin: '12px 16px 0', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' },
  sectionHead: { padding: '10px 14px', borderBottom: '1px solid #334155', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' },
  sectionBody: { padding: '14px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  label: { fontSize: '13px', color: '#64748b' },
  value: { fontSize: '13px', color: '#e2e8f0', maxWidth: '55%', textAlign: 'right', wordBreak: 'break-all' },
  // Avatar
  avatar: { width: '48px', height: '48px', borderRadius: '50%', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: '#fff', flexShrink: 0 },
  // Role badge
  adminBadge: { display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: '#1d4ed8', color: '#fff' },
  driverBadge: { display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: '#334155', color: '#94a3b8' },
  // Select
  select: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', padding: '8px 10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', appearance: 'none', marginTop: '10px' },
  // Buttons
  btn: (color, textColor) => ({ width: '100%', background: color || '#0284c7', border: 'none', borderRadius: '8px', padding: '13px', color: textColor || '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }),
  outlineBtn: (color) => ({ width: '100%', background: 'transparent', border: `1px solid ${color || '#ef4444'}`, borderRadius: '8px', padding: '13px', color: color || '#ef4444', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }),
  // Stat chips
  statsRow: { display: 'flex', gap: '8px', marginBottom: '12px' },
  stat: { flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 8px', textAlign: 'center' },
  statVal: { fontSize: '20px', fontWeight: '800', color: '#38bdf8' },
  statLbl: { fontSize: '10px', color: '#475569', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' },
  // Sync dot
  dot: (color) => ({ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', marginRight: '6px', flexShrink: 0 }),
  warning: { fontSize: '11px', color: '#64748b', marginTop: '6px', lineHeight: '1.5' },
  note: { fontSize: '11px', color: '#475569', marginTop: '6px' },
};

const SYNC_STATUS_MAP = {
  synced:  { color: '#4ade80', label: 'Synced' },
  syncing: { color: '#38bdf8', label: 'Syncing...' },
  offline: { color: '#fb923c', label: 'Offline' },
  error:   { color: '#ef4444', label: 'Sync Error' },
  idle:    { color: '#64748b', label: 'Idle' },
};

const initials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

const truncateUrl = (url, max = 34) => {
  if (!url) return 'Not configured';
  const clean = url.replace('https://github.com/', '');
  return clean.length > max ? '…' + clean.slice(-max) : clean;
};

const fmtTime = (iso) => {
  if (!iso) return 'Never';
  try {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
};

// ─── Settings Component ───────────────────────────────────────────────────────
const Settings = ({ currentUser, config, syncStatus, data, onSwitchUser, onSync, onResetData, onReconfigure }) => {
  const [resetConfirm, setResetConfirm] = useState(false);
  const [lastSync, setLastSync] = useState(() => getLastSync());

  // Refresh lastSync whenever syncStatus changes to 'synced'
  useEffect(() => {
    if (syncStatus === 'synced') setLastSync(getLastSync());
  }, [syncStatus]);

  const syncInfo = SYNC_STATUS_MAP[syncStatus] || SYNC_STATUS_MAP.idle;

  const handleSwitchUser = (e) => {
    const user = SEED_DATA.users.find((u) => u.id === e.target.value);
    if (user) onSwitchUser(user);
  };

  const handleResetClick = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 5000);
    } else {
      onResetData();
      setResetConfirm(false);
    }
  };

  return (
    <div style={S.page}>

      {/* ── Profile ── */}
      <div style={S.section}>
        <div style={S.sectionHead}>👤 Profile</div>
        <div style={S.sectionBody}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <div style={S.avatar}>{initials(currentUser?.name)}</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>{currentUser?.name || 'Unknown'}</div>
              <div style={{ marginTop: '4px' }}>
                <span style={currentUser?.role === 'admin' ? S.adminBadge : S.driverBadge}>
                  {currentUser?.role === 'admin' ? 'Admin' : 'Driver'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Switch user</div>
          <select style={S.select} value={currentUser?.id || ''} onChange={handleSwitchUser}>
            {SEED_DATA.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role === 'admin' ? 'Admin' : 'Driver'})
              </option>
            ))}
          </select>
          <div style={S.note}>Switching takes effect immediately on this device.</div>
        </div>
      </div>

      {/* ── Sync ── */}
      <div style={S.section}>
        <div style={S.sectionHead}>🔄 GitHub Sync</div>
        <div style={S.sectionBody}>
          <div style={S.row}>
            <span style={S.label}>Repository</span>
            <span style={{ ...S.value, fontSize: '12px', color: config?.repoUrl ? '#38bdf8' : '#475569' }}>
              {truncateUrl(config?.repoUrl)}
            </span>
          </div>
          <div style={S.row}>
            <span style={S.label}>Branch</span>
            <span style={S.value}>{config?.branch || 'main'}</span>
          </div>
          <div style={{ ...S.row, marginBottom: '6px' }}>
            <span style={S.label}>Status</span>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: syncInfo.color }}>
              <span style={S.dot(syncInfo.color)} />
              {syncInfo.label}
            </span>
          </div>
          <div style={S.row}>
            <span style={S.label}>Last Sync</span>
            <span style={{ ...S.value, color: '#64748b', fontSize: '12px' }}>{fmtTime(lastSync)}</span>
          </div>
          <button style={S.btn('#0284c7')} onClick={onSync}>
            {syncStatus === 'syncing' ? '⏳ Syncing...' : '🔄 Sync Now'}
          </button>
        </div>
      </div>

      {/* ── Data ── */}
      <div style={S.section}>
        <div style={S.sectionHead}>📦 Data</div>
        <div style={S.sectionBody}>
          <div style={S.statsRow}>
            <div style={S.stat}>
              <div style={S.statVal}>{(data?.loads || []).length}</div>
              <div style={S.statLbl}>Loads</div>
            </div>
            <div style={S.stat}>
              <div style={S.statVal}>{(data?.invoices || []).length}</div>
              <div style={S.statLbl}>Invoices</div>
            </div>
            <div style={S.stat}>
              <div style={S.statVal}>{(data?.drivers || []).length}</div>
              <div style={S.statLbl}>Drivers</div>
            </div>
          </div>

          {resetConfirm ? (
            <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
              <button
                style={{ ...S.btn('#ef4444'), flex: 1, marginTop: 0 }}
                onClick={handleResetClick}
              >
                ⚠️ Confirm Reset
              </button>
              <button
                style={{ flex: 1, background: 'none', border: '1px solid #334155', borderRadius: '8px', color: '#64748b', padding: '13px', cursor: 'pointer', fontSize: '14px' }}
                onClick={() => setResetConfirm(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button style={S.btn('#1e293b', '#94a3b8')} onClick={handleResetClick}
              onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1e293b'}
            >
              🔄 Reset to Test Data
            </button>
          )}
          <div style={S.warning}>Replaces all loads, invoices, brokers, and drivers with seed data. Cannot be undone.</div>
        </div>
      </div>

      {/* ── App ── */}
      <div style={S.section}>
        <div style={S.sectionHead}>⚙️ App</div>
        <div style={S.sectionBody}>
          <div style={S.row}>
            <span style={S.label}>App</span>
            <span style={S.value}>ETTR Fleet v1.0</span>
          </div>
          <div style={S.row}>
            <span style={S.label}>Claude API Key</span>
            <span style={{ ...S.value, color: config?.claudeApiKey ? '#4ade80' : '#ef4444' }}>
              {config?.claudeApiKey ? '● Configured' : '○ Not set'}
            </span>
          </div>
          <div style={{ ...S.row, marginBottom: '0' }}>
            <span style={S.label}>GitHub Token</span>
            <span style={{ ...S.value, color: config?.token ? '#4ade80' : '#ef4444' }}>
              {config?.token ? '● Configured' : '○ Not set'}
            </span>
          </div>
          <button style={S.outlineBtn('#ef4444')} onClick={onReconfigure}>
            ⚙️ Re-run Setup
          </button>
          <div style={S.warning}>This will clear your GitHub configuration and Claude API key, and return to the setup screen.</div>
        </div>
      </div>

    </div>
  );
};

export default Settings;
