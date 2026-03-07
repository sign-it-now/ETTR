// ─────────────────────────────────────────────────────────────────────────────
// DataContext - central state store for ETTR app
// Combines localStorage persistence + GitHub sync
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getLoads, saveLoads,
  getDrivers, saveDrivers,
  getBrokers, saveBrokers,
  getInvoices, saveInvoices,
  getGithubConfig,
  getUserSession, saveUserSession, clearUserSession,
  getLastSynced,
  generateId,
  generateLoadNumber,
  generateInvoiceNumber,
} from '../services/storage';
import {
  pullAll,
  syncOrQueue,
  processQueue,
  isOnline,
} from '../services/githubSync';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  // ── Core data state ────────────────────────────────────────────────────────
  const [loads, setLoadsState] = useState(() => getLoads());
  const [drivers, setDriversState] = useState(() => getDrivers());
  const [brokers, setBrokersState] = useState(() => getBrokers());
  const [invoices, setInvoicesState] = useState(() => getInvoices());

  // ── App state ──────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(() => getUserSession());
  const [githubConfig, setGithubConfig] = useState(() => getGithubConfig());
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced | error | offline | queued
  const [syncError, setSyncError] = useState(null);
  const [lastSynced, setLastSynced] = useState(() => getLastSynced());
  const [online, setOnline] = useState(isOnline());

  // Track file SHAs from GitHub for update operations
  const shaRef = useRef({});

  // ── Online/offline detection ───────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Try to flush queue when coming back online
      if (githubConfig) {
        processQueue(githubConfig).catch(console.warn);
      }
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [githubConfig]);

  // ── Pull from GitHub ───────────────────────────────────────────────────────
  const pullFromGitHub = useCallback(async () => {
    if (!githubConfig) return;
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const remote = await pullAll(githubConfig);
      if (remote.loads !== undefined) {
        setLoadsState(remote.loads);
        saveLoads(remote.loads);
        if (remote.loads_sha) shaRef.current.loads = remote.loads_sha;
      }
      if (remote.drivers !== undefined) {
        setDriversState(remote.drivers);
        saveDrivers(remote.drivers);
        if (remote.drivers_sha) shaRef.current.drivers = remote.drivers_sha;
      }
      if (remote.brokers !== undefined) {
        setBrokersState(remote.brokers);
        saveBrokers(remote.brokers);
        if (remote.brokers_sha) shaRef.current.brokers = remote.brokers_sha;
      }
      if (remote.invoices !== undefined) {
        setInvoicesState(remote.invoices);
        saveInvoices(remote.invoices);
        if (remote.invoices_sha) shaRef.current.invoices = remote.invoices_sha;
      }
      setLastSynced(new Date().toISOString());
      setSyncStatus('synced');
    } catch (e) {
      setSyncError(e.message);
      setSyncStatus('error');
    }
  }, [githubConfig]);

  // ── Auto-pull on mount when config exists ──────────────────────────────────
  useEffect(() => {
    if (githubConfig && isOnline()) {
      pullFromGitHub();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generic push helper ────────────────────────────────────────────────────
  const pushData = useCallback(async (fileName, data) => {
    const sha = shaRef.current[fileName.replace('.json', '')];
    const result = await syncOrQueue(githubConfig, fileName, data, sha);
    if (result.status === 'synced') {
      setSyncStatus('synced');
      setLastSynced(new Date().toISOString());
    } else if (result.status === 'queued') {
      setSyncStatus('queued');
    }
    return result;
  }, [githubConfig]);

  // ── LOADS CRUD ─────────────────────────────────────────────────────────────

  const setLoads = useCallback(async (updatedLoads) => {
    setLoadsState(updatedLoads);
    saveLoads(updatedLoads);
    await pushData('loads.json', updatedLoads);
  }, [pushData]);

  const addLoad = useCallback(async (loadData) => {
    const newLoad = {
      ...loadData,
      id: generateId('load'),
      loadNumber: generateLoadNumber(loads),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: loadData.status || 'rate_con_received',
      charges: loadData.charges || [],
      documents: loadData.documents || [],
      notes: loadData.notes || [],
    };
    const updated = [...loads, newLoad];
    await setLoads(updated);
    return newLoad;
  }, [loads, setLoads]);

  const updateLoad = useCallback(async (id, changes) => {
    const updated = loads.map((l) =>
      l.id === id ? { ...l, ...changes, updatedAt: new Date().toISOString() } : l
    );
    await setLoads(updated);
  }, [loads, setLoads]);

  const deleteLoad = useCallback(async (id) => {
    const updated = loads.filter((l) => l.id !== id);
    await setLoads(updated);
  }, [loads, setLoads]);

  // ── DRIVERS CRUD ───────────────────────────────────────────────────────────

  const setDrivers = useCallback(async (updatedDrivers) => {
    setDriversState(updatedDrivers);
    saveDrivers(updatedDrivers);
    await pushData('drivers.json', updatedDrivers);
  }, [pushData]);

  const addDriver = useCallback(async (driverData) => {
    const newDriver = { ...driverData, id: generateId('driver'), isActive: true };
    await setDrivers([...drivers, newDriver]);
    return newDriver;
  }, [drivers, setDrivers]);

  const updateDriver = useCallback(async (id, changes) => {
    await setDrivers(drivers.map((d) => (d.id === id ? { ...d, ...changes } : d)));
  }, [drivers, setDrivers]);

  // ── BROKERS CRUD ───────────────────────────────────────────────────────────

  const setBrokers = useCallback(async (updatedBrokers) => {
    setBrokersState(updatedBrokers);
    saveBrokers(updatedBrokers);
    await pushData('brokers.json', updatedBrokers);
  }, [pushData]);

  const addBroker = useCallback(async (brokerData) => {
    const newBroker = { ...brokerData, id: generateId('broker') };
    await setBrokers([...brokers, newBroker]);
    return newBroker;
  }, [brokers, setBrokers]);

  const updateBroker = useCallback(async (id, changes) => {
    await setBrokers(brokers.map((b) => (b.id === id ? { ...b, ...changes } : b)));
  }, [brokers, setBrokers]);

  const deleteBroker = useCallback(async (id) => {
    await setBrokers(brokers.filter((b) => b.id !== id));
  }, [brokers, setBrokers]);

  // ── INVOICES ───────────────────────────────────────────────────────────────

  const setInvoices = useCallback(async (updatedInvoices) => {
    setInvoicesState(updatedInvoices);
    saveInvoices(updatedInvoices);
    await pushData('invoices.json', updatedInvoices);
  }, [pushData]);

  const addInvoice = useCallback(async (invoiceData) => {
    const newInvoice = {
      ...invoiceData,
      id: generateId('invoice'),
      invoiceNumber: generateInvoiceNumber(invoices),
      generatedAt: new Date().toISOString(),
      status: 'draft',
    };
    const updated = [...invoices, newInvoice];
    await setInvoices(updated);
    return newInvoice;
  }, [invoices, setInvoices]);

  const updateInvoice = useCallback(async (id, changes) => {
    await setInvoices(invoices.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  }, [invoices, setInvoices]);

  // ── AUTH ───────────────────────────────────────────────────────────────────

  const login = useCallback((user) => {
    setCurrentUser(user);
    saveUserSession(user);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    clearUserSession();
  }, []);

  // ── GitHub config ──────────────────────────────────────────────────────────

  const saveConfig = useCallback((config) => {
    setGithubConfig(config);
    // saveGithubConfig is called in the Settings screen after validation
  }, []);

  // ── Context value ──────────────────────────────────────────────────────────

  return (
    <DataContext.Provider
      value={{
        // Data
        loads,
        drivers,
        brokers,
        invoices,
        // Load ops
        addLoad,
        updateLoad,
        deleteLoad,
        // Driver ops
        addDriver,
        updateDriver,
        // Broker ops
        addBroker,
        updateBroker,
        deleteBroker,
        // Invoice ops
        addInvoice,
        updateInvoice,
        // Auth
        currentUser,
        login,
        logout,
        // Sync
        githubConfig,
        saveConfig,
        syncStatus,
        syncError,
        lastSynced,
        online,
        pullFromGitHub,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
