import React, { useState, useEffect, useCallback, useRef } from 'react';
import Setup from './components/Setup';
import SyncIndicator from './components/shared/SyncIndicator';
import Dashboard from './components/Dashboard';
import RateConImport from './components/RateConImport';
import LoadDetail from './components/LoadDetail';
import InvoiceDetail from './components/InvoiceDetail';
import Settings from './components/Settings';
import {
  getConfig,
  getCurrentUser,
  getAllData,
  saveAllData,
  getPendingChanges,
  clearPendingChanges,
  getLoads,
  getDrivers,
  getBrokers,
  getInvoices,
  initializeIfEmpty,
  updateLoad,
  updateInvoice,
  saveCurrentUser,
  clearConfig,
  clearCurrentUser,
  resetToSeedData,
} from './services/storage';
import { createInvoice, createAuditEntry } from './data/models';
import { createGitHubSync } from './services/githubSync';

// ─── Placeholder for screens not yet built ─────────────────────────────────
const PlaceholderScreen = ({ title, icon }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '60vh', color: '#475569',
  }}>
    <div style={{ fontSize: '48px', marginBottom: '12px' }}>{icon}</div>
    <div style={{ fontSize: '18px', fontWeight: '600', color: '#94a3b8' }}>{title}</div>
    <div style={{ fontSize: '13px', marginTop: '6px', color: '#475569' }}>Coming soon</div>
  </div>
);

// ─── Nav item ──────────────────────────────────────────────────────────────
const NavItem = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '3px',
      padding: '8px 4px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: active ? '#38bdf8' : '#64748b',
      position: 'relative',
      minWidth: 0,
    }}
  >
    <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
    <span style={{ fontSize: '10px', fontWeight: active ? '700' : '400', letterSpacing: '0.02em' }}>
      {label}
    </span>
    {badge > 0 && (
      <span style={{
        position: 'absolute', top: '4px', right: '8px',
        background: '#ef4444', color: '#fff', borderRadius: '10px',
        fontSize: '10px', fontWeight: '700', padding: '1px 5px',
        minWidth: '16px', textAlign: 'center',
      }}>
        {badge}
      </span>
    )}
  </button>
);

// ─── Main App ──────────────────────────────────────────────────────────────
const App = () => {
  const [isSetup, setIsSetup] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  // subScreen: null | 'new_load' | 'load_detail' | 'invoice_detail'
  const [subScreen, setSubScreen] = useState(null);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [data, setData] = useState({ loads: [], drivers: [], brokers: [], invoices: [] });
  const [currentUser, setCurrentUser] = useState(null);
  const syncRef = useRef(null);

  // ── Bootstrap ─────────────────────────────────────────────────────────
  useEffect(() => {
    const config = getConfig();
    const user = getCurrentUser();

    if (!config || !user) {
      setIsSetup(false);
      return;
    }

    setIsSetup(true);
    setCurrentUser(user);
    initializeIfEmpty();
    setData(getAllData());

    try {
      syncRef.current = createGitHubSync(config);
    } catch (e) {
      console.warn('[App] Could not create sync instance:', e.message);
    }

    pullFromGitHub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pull data from GitHub ──────────────────────────────────────────────
  const pullFromGitHub = useCallback(async () => {
    if (!syncRef.current) return;
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    setSyncStatus('syncing');
    try {
      const remote = await syncRef.current.pullAll();
      const merged = {
        loads: remote.loads || getLoads(),
        drivers: remote.drivers || getDrivers(),
        brokers: remote.brokers || getBrokers(),
        invoices: remote.invoices || getInvoices(),
      };
      saveAllData(merged);
      setData({ ...merged });
      setSyncStatus('synced');
    } catch (e) {
      console.error('[App] Pull failed:', e);
      setSyncStatus('error');
    }
  }, []);

  // ── Push pending changes to GitHub ────────────────────────────────────
  const pushToGitHub = useCallback(async () => {
    if (!syncRef.current) return;
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    const pending = getPendingChanges();
    if (pending.length === 0) {
      setSyncStatus('synced');
      return;
    }
    setSyncStatus('syncing');
    try {
      const current = getAllData();
      const changedFiles = pending.map((filename) => {
        const key = filename.replace('.json', '');
        return { filename, data: current[key] || [] };
      });
      const result = await syncRef.current.pushAll(changedFiles);
      if (result.ok) {
        clearPendingChanges();
        setSyncStatus('synced');
      } else {
        console.error('[App] Push errors:', result.errors);
        setSyncStatus('error');
      }
    } catch (e) {
      console.error('[App] Push failed:', e);
      setSyncStatus('error');
    }
  }, []);

  // ── Manual sync ────────────────────────────────────────────────────────
  const handleSyncClick = useCallback(async () => {
    if (syncStatus === 'syncing') return;
    await pullFromGitHub();
    await pushToGitHub();
  }, [syncStatus, pullFromGitHub, pushToGitHub]);

  // ── Network listeners ──────────────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => {
      setSyncStatus('idle');
      pushToGitHub();
    };
    const onOffline = () => setSyncStatus('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [pushToGitHub]);

  // ── Data change handler (called by child screens) ──────────────────────
  const handleDataChange = useCallback((key, newData) => {
    setData((prev) => ({ ...prev, [key]: newData }));
    setTimeout(() => pushToGitHub(), 1500);
  }, [pushToGitHub]);

  // ── Reload data from localStorage (after child screen makes changes) ───
  const refreshData = useCallback(() => {
    setData(getAllData());
  }, []);

  // ── Setup completion ───────────────────────────────────────────────────
  const handleSetupComplete = () => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setData(getAllData());
    const config = getConfig();
    if (config) {
      try { syncRef.current = createGitHubSync(config); } catch {}
    }
    setIsSetup(true);
    pullFromGitHub();
  };

  // ── Badge counts ───────────────────────────────────────────────────────
  const needsActionCount = data.loads.filter(
    (l) => l.status === 'delivered' || l.status === 'rate_con_upload'
  ).length;

  // ── Setup screen ───────────────────────────────────────────────────────
  if (!isSetup) {
    return <Setup onComplete={handleSetupComplete} />;
  }

  // ── Full-screen overlays (no header/nav) ───────────────────────────────
  if (subScreen === 'new_load') {
    return (
      <RateConImport
        currentUser={currentUser}
        onLoadCreated={(load) => {
          refreshData();
          setSubScreen(null);
          setCurrentScreen('dashboard');
          setTimeout(() => pushToGitHub(), 500);
        }}
        onBack={() => setSubScreen(null)}
      />
    );
  }

  if (subScreen === 'load_detail' && selectedLoad) {
    return (
      <LoadDetail
        load={selectedLoad}
        currentUser={currentUser}
        drivers={data.drivers}
        onBack={() => { setSubScreen(null); setSelectedLoad(null); refreshData(); }}
        onLoadUpdated={(updated) => {
          setSelectedLoad(updated);
          refreshData();
          setTimeout(() => pushToGitHub(), 1500);
        }}
        onCreateInvoice={(load) => {
          const existingInvoices = getInvoices();
          const baseRate = Number(load.rate?.amount || 0);
          const chargesTotal = (load.charges || []).reduce((s, c) => s + Number(c.amount || 0), 0);
          const invoice = createInvoice({
            loadId: load.id,
            brokerId: load.broker?.id || '',
            baseRate,
            additionalCharges: load.charges || [],
            totalAmount: baseRate + chargesTotal,
          }, existingInvoices);
          updateInvoice(invoice);
          const invoicedLoad = {
            ...load,
            status: 'invoiced',
            auditLog: [
              ...(load.auditLog || []),
              createAuditEntry(currentUser?.id, 'invoice_created', `Invoice ${invoice.invoiceNumber} created`),
            ],
          };
          updateLoad(invoicedLoad);
          refreshData();
          setSelectedLoad(invoicedLoad);
          setSelectedInvoice(invoice);
          setSubScreen('invoice_detail');
          setTimeout(() => pushToGitHub(), 1500);
        }}
      />
    );
  }

  if (subScreen === 'invoice_detail' && selectedInvoice) {
    const invLoad = data.loads.find((l) => l.id === selectedInvoice.loadId) || selectedLoad;
    const broker = data.brokers?.find((b) => b.id === selectedInvoice.brokerId);
    const driver = data.drivers?.find((d) => d.id === invLoad?.assignedDriverId);
    return (
      <InvoiceDetail
        invoice={selectedInvoice}
        load={invLoad}
        broker={broker}
        driver={driver}
        currentUser={currentUser}
        onBack={() => { setSubScreen(null); setSelectedInvoice(null); refreshData(); }}
        onInvoiceUpdated={(updated) => {
          setSelectedInvoice(updated);
          refreshData();
          setTimeout(() => pushToGitHub(), 1500);
        }}
        onLoadUpdated={(updated) => {
          setSelectedLoad(updated);
          refreshData();
          setTimeout(() => pushToGitHub(), 1500);
        }}
      />
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return (
          <Dashboard
            loads={data.loads}
            drivers={data.drivers}
            currentUser={currentUser}
            onNewLoad={() => setSubScreen('new_load')}
            onSelectLoad={(load) => {
              setSelectedLoad(load);
              setSubScreen('load_detail');
            }}
          />
        );
      case 'loads':
        // Loads tab shows same dashboard for now; Load Detail comes in Step 6
        return (
          <Dashboard
            loads={data.loads}
            drivers={data.drivers}
            currentUser={currentUser}
            onNewLoad={() => setSubScreen('new_load')}
            onSelectLoad={(load) => {
              setSelectedLoad(load);
              setSubScreen('load_detail');
            }}
          />
        );
      case 'settings':
        return (
          <Settings
            currentUser={currentUser}
            config={getConfig()}
            syncStatus={syncStatus}
            data={data}
            onSwitchUser={(user) => { saveCurrentUser(user); setCurrentUser(user); refreshData(); }}
            onSync={handleSyncClick}
            onResetData={() => { resetToSeedData(); refreshData(); }}
            onReconfigure={() => { clearConfig(); clearCurrentUser(); setIsSetup(false); }}
          />
        );
      default:
        return <PlaceholderScreen title="Dashboard" icon="📊" />;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: '#e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '480px',
      margin: '0 auto',
      position: 'relative',
    }}>
      {/* Header */}
      <header style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <span style={{ fontSize: '20px', fontWeight: '800', color: '#38bdf8' }}>
          🚛 ETTR
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SyncIndicator syncStatus={syncStatus} onSyncClick={handleSyncClick} />
          <div style={{
            fontSize: '12px', color: '#64748b',
            background: '#0f172a', borderRadius: '6px',
            padding: '3px 8px', border: '1px solid #334155',
          }}>
            {currentUser?.name?.split(' ')[0]}
            {currentUser?.role === 'admin' ? ' 🔑' : ''}
          </div>
        </div>
      </header>

      {/* Screen content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
        {renderScreen()}
      </main>

      {/* Bottom nav */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        background: '#1e293b',
        borderTop: '1px solid #334155',
        display: 'flex',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <NavItem icon="📊" label="Dashboard" active={currentScreen === 'dashboard'}
          onClick={() => setCurrentScreen('dashboard')} />
        <NavItem icon="🚛" label="Loads" active={currentScreen === 'loads'}
          onClick={() => setCurrentScreen('loads')} badge={needsActionCount} />
        <NavItem icon="⚙️" label="Settings" active={currentScreen === 'settings'}
          onClick={() => setCurrentScreen('settings')} />
      </nav>
    </div>
  );
};

export default App;
