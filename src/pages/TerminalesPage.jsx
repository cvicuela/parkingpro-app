import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  Monitor, Plus, Search, Edit3, PowerOff, Power, X, Save,
  RefreshCw, Wifi, WifiOff, Activity, MapPin
} from 'lucide-react';
import { terminalsAPI } from '../services/api';

const TERMINAL_TYPES = {
  entry: 'Entrada',
  exit: 'Salida',
  both: 'Entrada/Salida',
};

function isOnline(lastHeartbeat) {
  if (!lastHeartbeat) return false;
  const diff = Date.now() - new Date(lastHeartbeat).getTime();
  return diff < 5 * 60 * 1000; // less than 5 minutes ago
}

function HeartbeatDot({ lastHeartbeat }) {
  const online = isOnline(lastHeartbeat);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
      online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

export default function TerminalesPage() {
  const [terminals, setTerminals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        terminalsAPI.list(),
        terminalsAPI.stats().catch(() => ({ data: null })),
      ]);
      setTerminals(listRes.data?.data || listRes.data || []);
      setStats(statsRes.data?.data || statsRes.data || null);
    } catch (err) {
      toast.error('Error al cargar terminales: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (terminal) => {
    const action = terminal.is_active ? 'desactivar' : 'activar';
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} la terminal "${terminal.name}"?`)) return;
    try {
      if (terminal.is_active) {
        await terminalsAPI.delete(terminal.id);
        toast.success('Terminal desactivada');
      } else {
        await terminalsAPI.update(terminal.id, { is_active: true });
        toast.success('Terminal activada');
      }
      load();
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const filtered = terminals.filter(t => {
    const q = search.toLowerCase();
    return !q || t.name?.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q) || t.location?.toLowerCase().includes(q);
  });

  const onlineCount = terminals.filter(t => isOnline(t.last_heartbeat)).length;
  const offlineCount = terminals.filter(t => !isOnline(t.last_heartbeat)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Terminales</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de puntos de entrada y salida</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} /> Nueva Terminal
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg"><Monitor size={20} className="text-indigo-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Terminales</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total ?? terminals.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><Wifi size={20} className="text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Online</p>
              <p className="text-2xl font-bold text-green-600">{stats?.online ?? onlineCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><WifiOff size={20} className="text-red-500" /></div>
            <div>
              <p className="text-xs text-gray-500">Offline</p>
              <p className="text-2xl font-bold text-red-500">{stats?.offline ?? offlineCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Activity size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Sesiones Hoy</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.sessions_today ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código, ubicación..."
          className="flex-1 border-0 outline-none text-sm"
        />
        <button onClick={load} className="text-gray-400 hover:text-indigo-600 transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Terminal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ubicación</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Sesiones Activas</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-indigo-400" />
                Cargando terminales...
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                <Monitor size={40} className="mx-auto mb-3 text-gray-200" />
                No hay terminales registradas
              </td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className={`hover:bg-gray-50 ${!t.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{t.name}</div>
                  {t.ip_address && <div className="text-xs text-gray-400 font-mono">{t.ip_address}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{t.code}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.type === 'entry' ? 'bg-blue-100 text-blue-700'
                    : t.type === 'exit' ? 'bg-orange-100 text-orange-700'
                    : 'bg-purple-100 text-purple-700'
                  }`}>
                    {TERMINAL_TYPES[t.type] || t.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate max-w-[140px]">{t.location || '-'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <HeartbeatDot lastHeartbeat={t.last_heartbeat} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold text-gray-700">{t.active_sessions ?? 0}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <button
                      onClick={() => { setEditItem(t); setShowModal(true); }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(t)}
                      className={`p-1.5 rounded transition-colors ${
                        t.is_active
                          ? 'text-gray-400 hover:text-red-600'
                          : 'text-gray-400 hover:text-green-600'
                      }`}
                      title={t.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {t.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <TerminalModal item={editItem} onClose={() => setShowModal(false)} onSaved={load} />
      )}
    </div>
  );
}

function TerminalModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    code: item?.code || '',
    type: item?.type || 'both',
    location: item?.location || '',
    ip_address: item?.ip_address || '',
    device_serial: item?.device_serial || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    if (!form.code.trim()) { toast.error('El código es requerido'); return; }
    try {
      setSaving(true);
      if (item) {
        await terminalsAPI.update(item.id, form);
        toast.success('Terminal actualizada');
      } else {
        await terminalsAPI.create(form);
        toast.success('Terminal creada');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-semibold">
            {item ? 'Editar Terminal' : 'Nueva Terminal'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Nombre <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Terminal Principal"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Código <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: T01"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.entries(TERMINAL_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Ubicación</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: Entrada Norte"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Dirección IP</label>
              <input
                type="text"
                value={form.ip_address}
                onChange={e => setForm({ ...form, ip_address: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="192.168.1.100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Serial del Dispositivo</label>
              <input
                type="text"
                value={form.device_serial}
                onChange={e => setForm({ ...form, device_serial: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="SN-XXXXXXXX"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
