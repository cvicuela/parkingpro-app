import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Tag, Plus, Search, X, Edit, Trash2, Percent, Calendar, Save, RefreshCw } from 'lucide-react';
import { discountsAPI, plansAPI } from '../services/api';
import { fmtMoney } from '../utils/formatters';
import { formatDate } from '../services/formatDate';

const APPLIES_TO = {
  global: 'Global',
  plan: 'Plan específico',
  subscription: 'Suscripción',
};

const DISCOUNT_TYPES = {
  percentage: 'Porcentaje',
  fixed_amount: 'Monto fijo',
};

export default function DescuentosPage() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await discountsAPI.list({ limit: 50, search: search || undefined });
      const d = res.data?.data || {};
      setDiscounts(d.discounts || d || []);
    } catch (err) { toast.error('Error: ' + err.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este descuento?')) return;
    try {
      await discountsAPI.delete(id);
      toast.success('Descuento eliminado');
      load();
    } catch (err) { toast.error('Error: ' + err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Descuentos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de descuentos y promociones</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
          <Plus size={16} /> Nuevo Descuento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
        <Search size={16} className="text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, descripción..."
          className="flex-1 border-0 outline-none text-sm" />
        <button onClick={load} className="text-gray-400 hover:text-indigo-600">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aplica a</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Meses mín.</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Usos</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vigencia</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {discounts.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  <Tag size={40} className="mx-auto mb-3 text-gray-200" />
                  No hay descuentos registrados
                </td></tr>
              ) : discounts.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="inline-flex items-center gap-1">
                      {d.type === 'percentage' ? <Percent size={12} /> : '$'}
                      {DISCOUNT_TYPES[d.type] || d.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {d.type === 'percentage' ? `${d.value}%` : fmtMoney(d.value)}
                  </td>
                  <td className="px-4 py-3 text-xs">{APPLIES_TO[d.applies_to] || d.applies_to}</td>
                  <td className="px-4 py-3 text-center">{d.min_months || 1}</td>
                  <td className="px-4 py-3 text-center">{d.max_uses ?? 'Ilimitado'}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} className="text-gray-400" />
                      {formatDate(d.valid_from)}
                      {d.valid_until ? ` — ${formatDate(d.valid_until)}` : ' — Sin límite'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {d.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => { setEditItem(d); setShowModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(d.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <DiscountModal item={editItem} onClose={() => setShowModal(false)} onSaved={load} />
      )}
    </div>
  );
}

function DiscountModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    type: item?.type || 'percentage',
    value: item?.value || '',
    appliesTo: item?.applies_to || 'global',
    planId: item?.plan_id || '',
    minMonths: item?.min_months || 1,
    maxUses: item?.max_uses || '',
    validFrom: item?.valid_from?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    validUntil: item?.valid_until?.slice(0, 10) || '',
    isActive: item?.is_active ?? true,
  });
  const [plans, setPlans] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    plansAPI.list().then(res => {
      const d = res.data?.data || {};
      setPlans(d.plans || d || []);
    }).catch(() => {});
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.name || !form.value) {
      toast.error('Nombre y valor son requeridos');
      return;
    }
    if (form.appliesTo === 'plan' && !form.planId) {
      toast.error('Debe seleccionar un plan');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name,
        description: form.description,
        type: form.type,
        value: Number(form.value),
        appliesTo: form.appliesTo,
        planId: form.appliesTo === 'plan' ? form.planId : null,
        minMonths: Number(form.minMonths) || 1,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        validFrom: form.validFrom,
        validUntil: form.validUntil || null,
        isActive: form.isActive,
      };
      if (item) {
        await discountsAPI.update(item.id, payload);
      } else {
        await discountsAPI.create(payload);
      }
      toast.success(item ? 'Descuento actualizado' : 'Descuento creado');
      onSaved();
      onClose();
    } catch (err) { toast.error('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold">{item ? 'Editar Descuento' : 'Nuevo Descuento'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Nombre</label>
            <input type="text" value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ej: Descuento trimestral"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea value={form.description} rows={2}
              onChange={e => set('description', e.target.value)}
              placeholder="Descripción opcional del descuento"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed_amount">Monto fijo ($)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Valor</label>
              <input type="number" step="0.01" min="0" value={form.value}
                onChange={e => set('value', e.target.value)}
                placeholder={form.type === 'percentage' ? 'Ej: 10' : 'Ej: 500'}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Aplica a</label>
              <select value={form.appliesTo} onChange={e => set('appliesTo', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                {Object.entries(APPLIES_TO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {form.appliesTo === 'plan' && (
              <div>
                <label className="text-sm font-medium text-gray-700">Plan</label>
                <select value={form.planId} onChange={e => set('planId', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar plan...</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Meses mínimos</label>
              <input type="number" min="1" value={form.minMonths}
                onChange={e => set('minMonths', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Usos máximos <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input type="number" min="1" value={form.maxUses}
                onChange={e => set('maxUses', e.target.value)}
                placeholder="Ilimitado"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Válido desde</label>
              <input type="date" value={form.validFrom}
                onChange={e => set('validFrom', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Válido hasta <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input type="date" value={form.validUntil}
                onChange={e => set('validUntil', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive}
              onChange={e => set('isActive', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Descuento activo</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
            <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
