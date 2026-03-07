import { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import SetupScreen from './screens/SetupScreen';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import LoadDetailScreen from './screens/LoadDetailScreen';
import CreateLoadScreen from './screens/CreateLoadScreen';
import InvoiceScreen from './screens/InvoiceScreen';
import SettingsScreen from './screens/SettingsScreen';
// ── Router (simple screen-based nav) ─────────────────────────────────────────

function AppRouter() {
  const { currentUser, githubConfig } = useData();
  const [screen, setScreen] = useState('dashboard');
  const [screenParams, setScreenParams] = useState({});

  function nav(target, params = {}) {
    setScreen(target);
    setScreenParams(params);
  }

  // Step 1: GitHub setup (first-time)
  if (!githubConfig) {
    return <SetupScreen onComplete={() => nav('login')} />;
  }

  // Step 2: Login / user selection
  if (!currentUser) {
    return <LoginScreen onLogin={() => nav('dashboard')} />;
  }

  // Step 3: Main app
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {screen === 'dashboard' && <DashboardScreen nav={nav} />}
      {screen === 'load-detail' && <LoadDetailScreen nav={nav} loadId={screenParams.loadId} />}
      {screen === 'create-load' && <CreateLoadScreen nav={nav} loadId={screenParams.loadId} />}
      {screen === 'invoice' && (
        <InvoiceScreen nav={nav} loadId={screenParams.loadId} invoiceId={screenParams.invoiceId} />
      )}
      {screen === 'settings' && <SettingsScreen nav={nav} />}
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppRouter />
    </DataProvider>
  );
}
