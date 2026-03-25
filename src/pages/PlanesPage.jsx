import { useState, useEffect } from 'react';
import { plansAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, X, Clock, Sun, Moon, Timer } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { fmtMoney } from '../utils/formatters';

const planIcons = { diurno: Sun, nocturno: Moon, '24h': Clock, hourly: Timer };
const planColors = {
  diurno: 'bg-amber-100 text-amber-700',
  nocturno: 'bg-indigo-100 text-indigo-700',
  '24h': 'bg-green-100 text-green-700',
  hourly: 'bg-cyan-100 text-cyan-700',
};

function PlanModal({ plan, onClose, onSave }) {
  const [form, setForm] = useState(plan || {
    name: '', type: 'diurno', description: '', base_price: '',
    max_capacity: '', start_hour: '', end_hour: '', tolerance_minutes: 15,
    daily_entry_limit: 5, overage_hourly_rate: 100
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        base_price: parseFloat(form.base_price),
        max_capacity: parseInt(form.max_capacity),
        start_hour: form.start_hour !== '' ? parseInt(form.start_hour) : null,
        end_hour: form.end_hour !== '' ? parseInt(form.end_hour) : null,
        tolerance_minutes: parseInt(form.tolerance_minutes),
        daily_entry_limit: parseInt(form.daily_entry_limit),
        overage_hourly_rate: parseFloat(form.overage_hourly_rate),
      };
      if (plan?.id) {
        await plansAPI.update(plan.id, payload);
        toast.success('Plan actualizado');
      } else {
        await plansAPI.create(payload);
        toast.success('Plan creado');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{plan ? 'Editar Plan' : 'Nuevo Plan'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input value={form.name} onChange={set('name')} required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.type} onChange={set('type')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="diurno">Diurno</option>
                <option value="nocturno">Nocturno</option>
                <option value="24h">24 Horas</option>
                <option value="hourly">Por Hora</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea value={form.description || ''} onChange={set('description')} rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Base (RD$)</label>
              <input type="number" value={form.base_price} onChange={set('base_price')} required step="0.01"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad Max</label>
              <input type="number" value={form.max_capacity} onChange={set('max_capacity')} required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          {(form.type === 'diurno' || form.type === 'nocturno') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                <input type="number" min="0" max="23" value={form.start_hour || ''} onChange={set('start_hour')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                <input type="number" min="0" max="23" value={form.end_hour || ''} onChange={set('end_hour')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tolerancia (min)</label>
              <input type="number" value={form.tolerance_minutes} onChange={set('tolerance_minutes')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entradas/dia</label>
              <input type="number" value={form.daily_entry_limit} onChange={set('daily_entry_limit')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exceso/h (RD$)</label>
              <input type="number" value={form.overage_hourly_rate} onChange={set('overage_hourly_rate')} step="0.01"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlanesPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchPlans = async () => {
    try {
      const { data } = await plansAPI.list();
      setPlans(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await plansAPI.delete(confirmDelete);
      toast.success('Plan desactivado');
      setConfirmDelete(null);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al desactivar');
      setConfirmDelete(null);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Planes</h2>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus size={18} /> Nuevo Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const Icon = planIcons[plan.type] || Clock;
          const colorClass = planColors[plan.type] || 'bg-gray-100 text-gray-700';
          const pct = plan.max_capacity > 0 ? Math.round((plan.current_occupancy / plan.max_capacity) * 100) : 0;

          return (
            <div key={plan.id} className="bg-white rounded-xl shadow-sm p-5 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                  <Icon size={20} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(plan); setShowModal(true); }} title="Editar plan"
                    className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                  <button onClick={() => setConfirmDelete(plan.id)} title="Desactivar plan"
                    className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-800">{plan.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{plan.description}</p>
              <div className="text-xl font-bold text-indigo-600 mb-3">
                {fmtMoney(plan.base_price)}
                <span className="text-xs font-normal text-gray-400">
                  {plan.type === 'hourly' ? '/hora' : '/mes'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div className={`h-2 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400">
                {plan.current_occupancy}/{plan.max_capacity} ocupados ({pct}%)
              </p>
              {plan.start_hour != null && (
                <p className="text-xs text-gray-400 mt-1">
                  Horario: {plan.start_hour}:00 - {plan.end_hour}:00
                </p>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <PlanModal
          plan={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={() => { setShowModal(false); setEditing(null); fetchPlans(); }}
        />
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Desactivar Plan"
        message="¿Estás seguro de que deseas desactivar este plan? Las suscripciones activas no se verán afectadas."
        confirmText="Desactivar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
