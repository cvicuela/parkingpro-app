import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
} from '../services/pushService';

export default function PushNotificationToggle({ compact = false }) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const supported = isPushSupported();
  const permission = getPermissionState();

  useEffect(() => {
    if (supported) {
      isSubscribed().then(val => {
        setSubscribed(val);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [supported]);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);

    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        const result = await subscribeToPush();
        if (result.success) {
          setSubscribed(true);
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    if (compact) return null;
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <BellOff className="w-4 h-4" />
        <span>Notificaciones push no soportadas</span>
      </div>
    );
  }

  if (permission === 'denied') {
    if (compact) return null;
    return (
      <div className="flex items-center gap-2 text-sm text-red-400">
        <BellOff className="w-4 h-4" />
        <span>Notificaciones bloqueadas en el navegador</span>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`p-2 rounded-lg transition-colors ${
          subscribed
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
        title={subscribed ? 'Desactivar notificaciones push' : 'Activar notificaciones push'}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : subscribed ? (
          <BellRing className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${subscribed ? 'bg-blue-100' : 'bg-gray-100'}`}>
            {subscribed ? (
              <BellRing className="w-5 h-5 text-blue-600" />
            ) : (
              <Bell className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">Notificaciones Push</p>
            <p className="text-sm text-gray-500">
              {subscribed
                ? 'Recibiras alertas en tiempo real'
                : 'Activa para recibir alertas instantaneas'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            subscribed ? 'bg-blue-600' : 'bg-gray-300'
          } ${loading ? 'opacity-50' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              subscribed ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
