import { useState, useEffect } from 'react';
import { vehiclesAPI, customersAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Plus, Search, Edit2, Trash2, X, Car } from 'lucide-react';
import { SkeletonTable } from '../components/SkeletonLoader';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';

const PAGE_SIZE = 15;

function VehicleModal({ vehicle, onClose, onSave }) {
  const [form, setForm] = useState(vehicle || {
    customer_id: '', plate: '', make: '', model: '', color: '', year: '', notes: ''
  });
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    customersAPI.list().then(({ data }) => setCustomers(data.data || data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, year: form.year ? parseInt(form.year) : undefined };
      if (vehicle?.id) {
        await vehiclesAPI.update(vehicle.id, payload);
        toast.success('Vehículo actualizado');
      } else {
        await vehiclesAPI.create(payload);
        toast.success('Vehículo registrado');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select value={form.customer_id} onChange={set('customer_id')} required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">Seleccionar cliente...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
            <input value={form.plate} onChange={set('plate')} required placeholder="A123456"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input value={form.make || ''} onChange={set('make')} placeholder="Toyota"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <input value={form.model || ''} onChange={set('model')} placeholder="Corolla"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <input type="number" value={form.year || ''} onChange={set('year')} placeholder="2024"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input value={form.color || ''} onChange={set('color')} placeholder="Blanco"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
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

export default function VehiculosPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchVehicles = async () => {
    try {
      const { data } = await vehiclesAPI.list({ search });
      setVehicles(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchVehicles(); setPage(1); }, [search]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await vehiclesAPI.delete(confirmDelete);
      toast.success('Vehículo eliminado');
      setConfirmDelete(null);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
      setConfirmDelete(null);
    }
  };

  const paginatedVehicles = vehicles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Vehículos</h2>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus size={18} /> Nuevo Vehículo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por placa, marca o modelo..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <SkeletonTable rows={8} cols={5} />
        ) : vehicles.length === 0 ? (
          <p className="p-8 text-center text-gray-400">No se encontraron vehículos</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-sm text-gray-500">
                  <tr>
                    <th className="py-3 px-4">Placa</th>
                    <th className="py-3 px-4">Vehículo</th>
                    <th className="py-3 px-4">Color</th>
                    <th className="py-3 px-4">Año</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVehicles.map((v) => (
                    <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Car size={16} className="text-indigo-500" />
                          <span className="font-mono font-medium">{v.plate}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{v.make} {v.model}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{v.color || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{v.year || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setEditing(v); setShowModal(true); }} title="Editar vehículo"
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 size={16} /></button>
                          <button onClick={() => setConfirmDelete(v.id)} title="Eliminar vehículo"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalItems={vehicles.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </div>

      {showModal && (
        <VehicleModal
          vehicle={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={() => { setShowModal(false); setEditing(null); fetchVehicles(); }}
        />
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar Vehículo"
        message="¿Estás seguro de que deseas eliminar este vehículo? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
