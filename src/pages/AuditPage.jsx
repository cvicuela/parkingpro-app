import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ShieldAlert, Search, RefreshCw, Filter } from 'lucide-react';
import { auditAPI } from '../services/api';

const ACTION_COLORS = {
  payment_created: 'green',
  payment_refunded: 'red',
  cash_register_opened: 'blue',
  cash_register_closed: 'orange',
  cash_register_approved: 'purple',
  invoice_generated: 'indigo',
  credit_note_generated: 'yellow',
};

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', entityType: '', startDate: '', endDate: '' });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100, ...filters };
      if (search) params.action = search;
      const [logsRes, actRes] = await Promise.all([auditAPI.list(params), auditAPI.actions()]);
      setLogs(logsRes.data.data);
      setTotal(logsRes.data.total);
      setActions(actRes.data.data);
    } catch {
      toast.error('Error cargando audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const setFilter = (key, val) => setFilters(p => ({ ...p, [key]: val }));

  const actionColor = (action) => ACTION_COLORS[action] || 'gray';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ShieldAlert size={24} />Auditoría del Sistema</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500"><strong>{total}</strong> registros</span>
          <button onClick={fetchLogs} className="flex items-center gap-2 px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
            <RefreshCw size={16} />Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Buscar por acción..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filters.action} onChange={e => setFilter('action', e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Todas las acciones</option>
          {actions.map(a => <option key={a.action} value={a.action}>{a.action} ({a.count})</option>)}
        </select>
        <select value={filters.entityType} onChange={e => setFilter('entityType', e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Todos los tipos</option>
          {['payment', 'invoice', 'cash_register', 'subscription', 'customer'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input type="date" value={filters.startDate} onChange={e => setFilter('startDate', e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={filters.endDate} onChange={e => setFilter('endDate', e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => setFilters({ action: '', entityType: '', startDate: '', endDate: '' })}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
          <Filter size={14} /> Limpiar
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Fecha/Hora', 'Usuario', 'Acción', 'Entidad', 'IP', 'Detalles'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0
                ? <tr><td colSpan={6} className="text-center text-gray-400 py-8">No hay registros de auditoría</td></tr>
                : logs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(log)}>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('es-DO')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{log.user_name || 'Sistema'}</p>
                      {log.user_role && <p className="text-xs text-gray-400">{log.user_role}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${actionColor(log.action)}-100 text-${actionColor(log.action)}-700`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {log.entity_type || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.ip_address || '—'}</td>
                    <td className="px-4 py-3">
                      <button className="text-indigo-600 text-xs hover:underline">Ver cambios</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}
      </div>

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Detalle de Auditoría</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Acción:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs bg-${actionColor(selected.action)}-100 text-${actionColor(selected.action)}-700`}>
                  {selected.action}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Usuario:</span><span>{selected.user_name || 'Sistema'} ({selected.user_role})</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Entidad:</span><span>{selected.entity_type} / {selected.entity_id?.slice(0, 8)}...</span></div>
              <div className="flex justify-between"><span className="text-gray-500">IP:</span><span className="font-mono">{selected.ip_address || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Fecha:</span><span>{new Date(selected.created_at).toLocaleString('es-DO')}</span></div>
            </div>
            {selected.changes && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Cambios registrados</p>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-48">
                  {JSON.stringify(
                    typeof selected.changes === 'string' ? JSON.parse(selected.changes) : selected.changes,
                    null, 2
                  )}
                </pre>
              </div>
            )}
            <button onClick={() => setSelected(null)} className="mt-6 w-full border border-gray-300 rounded-lg py-2 text-gray-700 hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
