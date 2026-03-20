import { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { offlineQueue } from '../services/offlineQueue';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState(null); // { current, total } or null
  const wasOfflineRef = useRef(!navigator.onLine);
  const restoredTimerRef = useRef(null);

  const refreshPendingCount = () => {
    offlineQueue.pendingCount.then((count) => setPendingCount(count || 0)).catch(() => setPendingCount(0));
  };

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        setShowRestoredBanner(true);
        if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
        restoredTimerRef.current = setTimeout(() => {
          setShowRestoredBanner(false);
        }, 3000);
      }
      wasOfflineRef.current = false;
      refreshPendingCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      setShowRestoredBanner(false);
      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
      refreshPendingCount();
    };

    const handleEnqueued = () => {
      refreshPendingCount();
    };

    const handleSynced = () => {
      refreshPendingCount();
      setSyncStatus(null);
    };

    const handleStatus = (e) => {
      const { current, total } = e.detail || {};
      if (typeof current === 'number' && typeof total === 'number' && total > 0) {
        setSyncStatus({ current, total });
      } else {
        setSyncStatus(null);
      }
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offlinequeue:enqueued', handleEnqueued);
    window.addEventListener('offlinequeue:synced', handleSynced);
    window.addEventListener('offlinequeue:status', handleStatus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offlinequeue:enqueued', handleEnqueued);
      window.removeEventListener('offlinequeue:synced', handleSynced);
      window.removeEventListener('offlinequeue:status', handleStatus);
      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
    };
  }, []);

  // Restored banner (green, auto-dismisses)
  if (showRestoredBanner) {
    const isSyncing = syncStatus !== null;
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 pointer-events-none">
        <div className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg pointer-events-auto">
          {isSyncing ? (
            <RefreshCw size={16} className="animate-spin flex-shrink-0" />
          ) : (
            <Wifi size={16} className="flex-shrink-0" />
          )}
          <span>
            {isSyncing
              ? `Sincronizando ${syncStatus.current} de ${syncStatus.total} operaciones...`
              : 'Conexión restaurada - Sincronizando...'}
          </span>
        </div>
      </div>
    );
  }

  // Offline banner (amber, persistent)
  if (!isOnline) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-amber-500 text-white text-sm font-medium px-5 py-3 flex items-center justify-center gap-3 shadow-lg">
          <WifiOff size={16} className="flex-shrink-0 animate-pulse" />
          <span>
            Sin conexión - Los cambios se guardarán localmente
            {pendingCount > 0 && (
              <span className="ml-2 bg-amber-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  // Syncing banner while online (shown when sync is in progress after reconnect)
  if (syncStatus !== null) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 pointer-events-none">
        <div className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg pointer-events-auto">
          <RefreshCw size={16} className="animate-spin flex-shrink-0" />
          <span>
            Sincronizando {syncStatus.current} de {syncStatus.total} operaciones...
          </span>
        </div>
      </div>
    );
  }

  return null;
}
