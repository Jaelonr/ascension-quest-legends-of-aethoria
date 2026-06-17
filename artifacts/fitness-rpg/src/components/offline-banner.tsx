import { useState, useEffect, useRef } from "react";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, syncPending } = useOfflineSync();
  const [justCameOnline, setJustCameOnline] = useState(false);
  const prevOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Skip first render — only show "Back online" after a real offline→online transition
    if (prevOnlineRef.current === false && isOnline) {
      setJustCameOnline(true);
      const t = setTimeout(() => setJustCameOnline(false), 3000);
      prevOnlineRef.current = isOnline;
      return () => clearTimeout(t);
    }
    prevOnlineRef.current = isOnline;
    return undefined;
  }, [isOnline]);

  const show = !isOnline || justCameOnline || isSyncing || pendingCount > 0;
  if (!show) return null;

  const isOffline = !isOnline;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 px-4 backdrop-blur-sm animate-in slide-in-from-top duration-300 text-xs font-mono",
        isOffline
          ? "bg-orange-950/95 border-b border-orange-700/50 text-orange-300"
          : "bg-green-950/95 border-b border-green-700/50 text-green-300"
      )}
    >
      {isOffline ? (
        <WifiOff className="w-3.5 h-3.5 text-orange-400 shrink-0" />
      ) : (
        <Wifi className="w-3.5 h-3.5 text-green-400 shrink-0" />
      )}
      <span>
        {isOffline
          ? "Offline mode — changes will sync when reconnected"
          : isSyncing
          ? "Syncing offline changes..."
          : pendingCount > 0
          ? `Back online — ${pendingCount} change${pendingCount > 1 ? "s" : ""} queued`
          : "Back online"}
      </span>
      {isOnline && pendingCount > 0 && !isSyncing && (
        <button
          onClick={syncPending}
          className="flex items-center gap-1 text-green-400 font-bold hover:text-green-300 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Sync now
        </button>
      )}
      {isOffline && pendingCount > 0 && (
        <span className="text-orange-400 font-bold">({pendingCount} queued)</span>
      )}
    </div>
  );
}
