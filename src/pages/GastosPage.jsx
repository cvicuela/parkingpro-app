import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { TrendingDown, Plus, Search, Edit3, Trash2, X, Save, RefreshCw } from 'lucide-react';
import { expensesAPI } from '../services/api';

const CATEGORIES = {
  servicios: 'Servicios', mantenimiento: 'Mantenimiento', nomina: 'Nómina',
  alquiler: 'Alquiler', seguros: 'Seguros', suministros: 'Suministros',
  impuestos: 'Impuestos', financieros: 'Financieros', equipos: 'Equipos', otros: 'Otros',
};

function formatCurrency(v) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(v || 0);
}

export default function GastosPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await expensesAPI.list({ limit: 50, search: search || undefined });
      const d = res.data?.data || {};
      setExpenses(d.expenses || []);
      setTotal(d.total || 0);
    } catch (err) { toast.error('Error: ' + err.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await expensesAPI.delete(id);
      toast.success('Gasto eliminado');
      load();
    } catch (err) { toast.error('Error: ' + err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-sm text-gray-500 mt-1">Registro de compras y gastos operativos</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
          <Plus size={16} /> Nuevo Gasto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
        <Search size={16} className="text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por suplidor, descripción, NCF..."
          className="flex-1 border-0 outline-none text-sm" />
        <button onClick={load} className="text-gray-400 hover:text-indigo-600">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Suplidor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">NCF</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">ITBIS</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {expenses.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                <TrendingDown size={40} className="mx-auto mb-3 text-gray-200" />
                No hay gastos registrados
              </td></tr>
            ) : expenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(e.expense_date).toLocaleDateString('es-DO')}</td>
                <td className="px-4 py-3 font-medium">{e.supplier_name}</td>
                <td className="px-4 py-3 text-xs">{CATEGORIES[e.category] || e.category}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.ncf || '-'}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(e.itbis_amount)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(e.total)}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <button onClick={() => { setEditItem(e); setShowModal(true); }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete(e.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ExpenseModal item={editItem} onClose={() => setShowModal(false)} onSaved={load} />
      )}
    </div>
  );
}

function ExpenseModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    supplierName: item?.supplier_name || '',
    supplierRnc: item?.supplier_rnc || '',
    category: item?.category || 'servicios',
    ncf: item?.ncf || '',
    description: item?.description || '',
    expenseDate: item?.expense_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    subtotal: item?.subtotal || '',
    itbisAmount: item?.itbis_amount || '',
    total: item?.total || '',
    paymentMethod: item?.payment_method || '04',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.supplierName || !form.total) { toast.error('Suplidor y total son requeridos'); return; }
    try {
      setSaving(true);
      if (item) {
        await expensesAPI.update(item.id, form);
      } else {
        await expensesAPI.create(form);
      }
      toast.success(item ? 'Gasto actualizado' : 'Gasto registrado');
      onSaved();
      onClose();
    } catch (err) { toast.error('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold">{item ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Suplidor</label>
              <input type="text" value={form.supplierName}
                onChange={e => setForm({ ...form, supplierName: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">RNC Suplidor</label>
              <input type="text" value={form.supplierRnc}
                onChange={e => setForm({ ...form, supplierRnc: e.target.value.replace(/\D/g, '') })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Categoría</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">NCF</label>
              <input type="text" value={form.ncf}
                onChange={e => setForm({ ...form, ncf: e.target.value.toUpperCase() })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="B0200000001" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea value={form.description} rows={2}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Fecha</label>
            <input type="date" value={form.expenseDate}
              onChange={e => setForm({ ...form, expenseDate: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Subtotal</label>
              <input type="number" step="0.01" value={form.subtotal}
                onChange={e => setForm({ ...form, subtotal: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">ITBIS</label>
              <input type="number" step="0.01" value={form.itbisAmount}
                onChange={e => setForm({ ...form, itbisAmount: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Total</label>
              <input type="number" step="0.01" value={form.total}
                onChange={e => setForm({ ...form, total: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-bold" />
            </div>
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
