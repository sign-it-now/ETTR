// ─────────────────────────────────────────────────────────────────────────────
// ETTR — STORAGE LAYER
//
// Layer 1 — localStorage  : structured data (loads, users, trucks, petty, etc.)
// Layer 2 — IndexedDB     : binary files & photos (documents, receipts, BOLs)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from "react";

// ── LAYER 1: useLocalStorage ─────────────────────────────────────────────────
// Drop-in replacement for useState that persists to localStorage.
// Usage: const [loads, setLoads] = useLocalStorage("ettr_loads", SEED_LOADS);
export function useLocalStorage(key, seed) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return seed;
  });

  const setAndPersist = useCallback(updater => {
    setVal(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {
        console.warn("ETTR localStorage write failed:", e);
      }
      return next;
    });
  }, [key]);

  return [val, setAndPersist];
}

// ── LAYER 2: IndexedDB (files & photos) ─────────────────────────────────────
const IDB_NAME  = "ettr_files_v1";
const IDB_STORE = "files";

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess       = e => resolve(e.target.result);
    req.onerror         = () => reject(req.error);
  });
}

// Save a Blob/File to IndexedDB under `key`
export async function idbSave(key, blob) {
  try {
    const db = await openIDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(blob, key);
      tx.oncomplete = res;
      tx.onerror    = () => rej(tx.error);
    });
  } catch (e) {
    console.warn("ETTR IDB save failed:", e);
  }
}

// Retrieve a Blob/File from IndexedDB by `key`; returns null if not found
export async function idbGet(key) {
  try {
    const db = await openIDB();
    return await new Promise((res, rej) => {
      const tx  = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  } catch (e) {
    return null;
  }
}
