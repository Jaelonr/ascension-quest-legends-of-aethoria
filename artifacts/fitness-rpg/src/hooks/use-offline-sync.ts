import { useState, useEffect, useCallback, useRef } from "react";

const DB_NAME = "fitness-rpg-offline";
const STORE = "pending";
const DB_VER = 1;

interface PendingReq {
  id?: number;
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbAdd(item: Omit<PendingReq, "id">) {
  const db = await openDB();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(item);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function idbGetAll(): Promise<PendingReq[]> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function idbDelete(id: number) {
  const db = await openDB();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      const items = await idbGetAll();
      setPendingCount(items.length);
    } catch {}
  }, []);

  const syncPending = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const items = await idbGetAll();
      for (const item of items) {
        try {
          const res = await fetch(item.url, {
            method: item.method,
            headers: { "Content-Type": "application/json", ...item.headers },
            body: item.body,
          });
          if (res.ok) await idbDelete(item.id!);
        } catch {}
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      refreshCount();
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();

    const goOnline = () => {
      setIsOnline(true);
      syncPending();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [syncPending, refreshCount]);

  const queueFetch = useCallback(
    async (
      url: string,
      method: string,
      body: object,
      headers: Record<string, string> = {}
    ): Promise<boolean> => {
      try {
        await idbAdd({ url, method, body: JSON.stringify(body), headers, timestamp: Date.now() });
        setPendingCount((c) => c + 1);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  return { isOnline, pendingCount, isSyncing, syncPending, queueFetch };
}
