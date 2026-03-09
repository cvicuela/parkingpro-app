import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  AlertTriangle, Plus, X, CheckCircle, Clock, Search,
  Filter, Shield, Car, MessageSquare, RefreshCw, Eye
} from 'lucide-react';
import { incidentsAPI } from '../services/api';

const TYPES = {
  vehicle_damage: 'Daño a vehículo',
  unauthorized_access: 'Acceso no autorizado',
  equipment_failure: 'Falla de equipo',
  theft: 'Robo/Hurto',
  accident: 'Accidente',
  complaint: 'Queja de cliente',
  maintenance: 'Mantenimiento urgente',
  other: 'Otro',
};

const SEVERITIES = {
  critical: { label: 'Crítico', color: 'red', bg: 'bg-red-100 text-red-700' },
  high: { label: 'Alto', color: 'orange', bg: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Medio', color: 'yellow', bg: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'Bajo', color: 'blue', bg: 'bg-blue-100 text-blue-700' },
};

const STATUSES = {
  open: { label: 'Abierto', bg: 'bg-red-100 text-red-700', icon: AlertTriangle },
  investigating: { label: 'Investigando', bg: 'bg-yellow-100 text-yellow-700', icon: Search },
  resolved: { label: 'Resuelto', bg: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { label: 'Cerrado', bg: 'bg-gray-100 text-gray-600', icon: Shield },
};

export default function IncidentesPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await incidentsAPI.list({
        status: filterStatus || null,
        severity: filterSeverity || null,
        type: filterType || null,
      });
      const data = res.data?.data || res.data || {};
      setIncidents(data.incidents || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeverity, filterType]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCount = incidents.filter(i => i.status === 'open' || i.status === 'investigating').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidentes</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de incidentes del parqueo</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
          <Plus size={16} /> Reportar Incidente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`rounded-xl shadow-sm border p-4 ${openCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
          <p className="text-xs text-gray-500">Abiertos</p>
          <p className={`text-2xl font-bold ${openCount > 0 ? 'text-red-600' : ''}`}>{openCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-gray-500">Críticos Abiertos</p>
          <p className="text-2xl font-bold text-red-600">
            {incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved' && i.status !== 'closed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-center">
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap items-center gap-3">
        <Filter size={16} className="text-gray-400" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Toda severidad</option>
          {Object.entries(SEVERITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        {incidents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <Shield size={48} className="mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">No hay incidentes registrados</p>
            <p className="text-sm text-gray-400 mt-1">Todo está en orden</p>
          </div>
        ) : incidents.map(inc => {
          const sev = SEVERITIES[inc.severity] || SEVERITIES.medium;
          const stat = STATUSES[inc.status] || STATUSES.open;
          const StatIcon = stat.icon;
          return (
            <div key={inc.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${sev.bg}`}>
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{inc.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stat.bg}`}>
                          <StatIcon size={10} /> {stat.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sev.bg}`}>
                          {sev.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {TYPES[inc.type] || inc.type}
                        </span>
                        {inc.vehicle_plate && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Car size={10} /> {inc.vehicle_plate}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setShowDetailModal(inc)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                        <Eye size={16} />
                      </button>
                      {(inc.status === 'open' || inc.status === 'investigating') && (
                        <button onClick={() => setShowResolveModal(inc)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  {inc.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{inc.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{new Date(inc.created_at).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    {inc.operator_email && <span>por {inc.operator_email}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateIncidentModal onClose={() => setShowCreateModal(false)} onCreated={loadData} />
      )}
      {showResolveModal && (
        <ResolveModal incident={showResolveModal} onClose={() => setShowResolveModal(null)} onResolved={loadData} />
      )}
      {showDetailModal && (
        <DetailModal incident={showDetailModal} onClose={() => setShowDetailModal(null)} />
      )}
    </div>
  );
}

function CreateIncidentModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    type: 'other', title: '', description: '', severity: 'medium', vehiclePlate: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title) { toast.error('Título requerido'); return; }
    try {
      setSaving(true);
      await incidentsAPI.create(form);
      toast.success('Incidente reportado');
      onCreated();
      onClose();
    } catch (err) { toast.error('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle size={20} /> Reportar Incidente
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Severidad</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                {Object.entries(SEVERITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Título</label>
            <input type="text" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Descripción breve del incidente"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Placa del vehículo (opcional)</label>
            <input type="text" value={form.vehiclePlate}
              onChange={e => setForm({ ...form, vehiclePlate: e.target.value.toUpperCase() })}
              placeholder="A123456"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Descripción detallada</label>
            <textarea value={form.description} rows={4}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describa lo que ocurrió con el mayor detalle posible..."
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm">
            <AlertTriangle size={14} /> {saving ? 'Guardando...' : 'Reportar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResolveModal({ incident, onClose, onResolved }) {
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('resolved');
  const [saving, setSaving] = useState(false);

  const handleResolve = async () => {
    try {
      setSaving(true);
      await incidentsAPI.resolve(incident.id, { notes, status });
      toast.success('Incidente actualizado');
      onResolved();
      onClose();
    } catch (err) { toast.error('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Resolver Incidente</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{incident.title}</strong>
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700">Nuevo estado</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
              <option value="investigating">En investigación</option>
              <option value="resolved">Resuelto</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Notas de resolución</label>
            <textarea value={notes} rows={3}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describa cómo se resolvió..."
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button onClick={handleResolve} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
            <CheckCircle size={14} /> {saving ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ incident, onClose }) {
  const sev = SEVERITIES[incident.severity] || SEVERITIES.medium;
  const stat = STATUSES[incident.status] || STATUSES.open;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold">Detalle del Incidente</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold">{incident.title}</h2>
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${stat.bg}`}>{stat.label}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${sev.bg}`}>{sev.label}</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {TYPES[incident.type] || incident.type}
            </span>
          </div>
          {incident.vehicle_plate && (
            <div className="flex items-center gap-2 text-sm">
              <Car size={14} className="text-gray-400" />
              <span className="font-mono">{incident.vehicle_plate}</span>
            </div>
          )}
          {incident.description && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Descripción</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{incident.description}</p>
            </div>
          )}
          {incident.resolution_notes && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Resolución</p>
              <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">{incident.resolution_notes}</p>
            </div>
          )}
          <div className="text-xs text-gray-400 space-y-1 pt-2 border-t">
            <p>Creado: {new Date(incident.created_at).toLocaleString('es-DO')}</p>
            {incident.operator_email && <p>Reportado por: {incident.operator_email}</p>}
            {incident.resolved_at && <p>Resuelto: {new Date(incident.resolved_at).toLocaleString('es-DO')}</p>}
            {incident.resolved_by_email && <p>Resuelto por: {incident.resolved_by_email}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
