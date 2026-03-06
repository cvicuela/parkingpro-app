import { useAuth } from '../context/AuthContext';
import { Menu, Bell, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { offlineQueue } from '../services/offlineQueue';

export default function Header({ onMenuClick }) {
  const { user } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); setPendingSync(offlineQueue.pendingCount); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => setPendingSync(offlineQueue.pendingCount), 5000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden text-gray-600 hover:text-gray-900">
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-semibold text-gray-800 hidden md:block">
          Sistema de Gestion de Parqueos
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {!online && (
          <span className="flex items-center gap-1 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
            <WifiOff size={14} /> Offline
            {pendingSync > 0 && <span>({pendingSync})</span>}
          </span>
        )}
        {online && pendingSync > 0 && (
          <span className="flex items-center gap-1 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
            Sincronizando... ({pendingSync})
          </span>
        )}

        <button className="relative text-gray-500 hover:text-gray-700">
          <Bell size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-700">{user?.email}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role || 'operator'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
