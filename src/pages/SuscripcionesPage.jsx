import { useState, useEffect } from 'react';
import { subscriptionsAPI, customersAPI, vehiclesAPI, plansAPI, rfidAPI, billingAPI, discountsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Plus, Search, X, Pause, Play, Trash2, QrCode, CreditCard, Wifi, Receipt, Tag, Clock, Banknote, ArrowRightLeft } from 'lucide-react';
import { SkeletonTable } from '../components/SkeletonLoader';
import ConfirmModal from '../components/ConfirmModal';
import { formatDate } from '../services/formatDate';
import { fmtMoney } from '../utils/formatters';

const statusBadge = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  past_due: 'bg-red-100 text-red-700',
  suspended: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

function SubscriptionModal({ subscription, onClose, onSave }) {
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(subscription || {
    customer_id: '', vehicle_id: '', plan_id: '', billing_frequency: 'monthly'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      customersAPI.list().then(({ data }) => setCustomers(data.data || data || [])),
      vehiclesAPI.list().then(({ data }) => setVehicles(data.data || data || [])),
      plansAPI.list().then(({ data }) => setPlans(data.data || data || []))
    ]).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (subscription?.id) {
        await subscriptionsAPI.update(subscription.id, form);
        toast.success('Suscripción actualizada');
      } else {
        await subscriptionsAPI.create(form);
        toast.success('Suscripción creada');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{subscription ? 'Editar' : 'Nueva Suscripción'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select value={form.customer_id} onChange={set('customer_id')} required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">Seleccionar...</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo</label>
            <select value={form.vehicle_id} onChange={set('vehicle_id')} required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">Seleccionar...</option>
              {vehicles.filter(v => !form.customer_id || v.customer_id === form.customer_id).map((v) => (
                <option key={v.id} value={v.id}>{v.plate} - {v.make} {v.model}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select value={form.plan_id} onChange={set('plan_id')} required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">Seleccionar...</option>
              {plans.filter(p => p.type !== 'hourly').map((p) => (
                <option key={p.id} value={p.id}>{p.name} - {fmtMoney(p.base_price)}/mes</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
            <select value={form.billing_frequency} onChange={set('billing_frequency')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="monthly">Mensual</option>
              <option value="weekly">Semanal</option>
            </select>
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

/* ─── Prepaid Billing Modal ─── */
function PrepaidBillingModal({ subscription, onClose, onSuccess }) {
  const [months, setMonths] = useState(1);
  const [discounts, setDiscounts] = useState([]);
  const [discountsLoading, setDiscountsLoading] = useState(true);
  const [selectedDiscount, setSelectedDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setDiscountsLoading(true);
    discountsAPI.list()
      .then(({ data }) => {
        const raw = data?.data || data || [];
        const list = Array.isArray(raw) ? raw : [];
        setDiscounts(list.filter(d => d.is_active));
      })
      .catch((err) => {
        toast.error('Error cargando descuentos');
        setDiscounts([]);
      })
      .finally(() => setDiscountsLoading(false));
  }, []);

  useEffect(() => {
    if (!subscription?.id || months < 1) return;
    setLoading(true);
    const discId = selectedDiscount || null;
    billingAPI.calculatePrepaid(subscription.id, months, discId)
      .then(({ data }) => setPreview(data?.data || data))
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, [subscription?.id, months, selectedDiscount]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const discId = selectedDiscount || null;
      await billingAPI.generatePrepaid(subscription.id, months, discId, paymentMethod, notes || null);
      toast.success(`Factura generada por ${months} meses`);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Error al generar factura');
    } finally {
      setGenerating(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-DO') : '-';
  const grossPrice = parseFloat(subscription.price_per_period) || 0;
  const taxRate = 0.18;
  const netPrice = Math.round((grossPrice / (1 + taxRate)) * 100) / 100;
  const itbisPrice = Math.round((grossPrice - netPrice) * 100) / 100;
  const presetMonths = [1, 3, 6, 12];
  const availableDiscounts = discounts.filter(d => {
    if (d.min_months && months < d.min_months) return false;
    if (d.max_uses && d.current_uses >= d.max_uses) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Receipt size={20} className="text-indigo-600" />
            Generar Factura Prepago
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Subscription Info */}
          <div className="bg-indigo-50 rounded-lg p-3">
            <p className="font-semibold text-sm">{subscription.customer_name}</p>
            <p className="text-xs text-gray-600">{subscription.plan_name} - Placa: {subscription.vehicle_plate || 'N/A'}</p>
            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
              <p>Precio mensual: {fmtMoney(grossPrice)} (ITBIS incl.)</p>
              <p className="text-gray-400">Neto: {fmtMoney(netPrice)} + ITBIS: {fmtMoney(itbisPrice)}</p>
            </div>
          </div>

          {/* Month Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meses a facturar</label>
            <div className="flex gap-2 mb-2">
              {presetMonths.map(m => (
                <button key={m} onClick={() => setMonths(m)}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${
                    months === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}>
                  {m} {m === 1 ? 'mes' : 'meses'}
                </button>
              ))}
            </div>
            <input type="number" min="1" max="24" value={months} onChange={e => setMonths(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>

          {/* Discount Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Tag size={14} className="inline mr-1" />Descuento (opcional)
            </label>
            {discountsLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" /> Cargando descuentos...
              </div>
            ) : (
              <select value={selectedDiscount} onChange={e => setSelectedDiscount(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                <option value="">Sin descuento</option>
                {availableDiscounts.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type === 'percentage' ? d.value + '%' : fmtMoney(d.value)})
                    {d.min_months > 1 ? ` - Min. ${d.min_months} meses` : ''}
                  </option>
                ))}
              </select>
            )}
            {!discountsLoading && discounts.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No hay descuentos configurados. Cree uno en la pagina de Descuentos.</p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de Pago</label>
            <div className="flex gap-2">
              {[
                { val: 'cash', label: 'Efectivo', icon: Banknote },
                { val: 'card', label: 'Tarjeta', icon: CreditCard },
                { val: 'transfer', label: 'Transferencia', icon: ArrowRightLeft },
              ].map(({ val, label, icon: Icon }) => (
                <button key={val} onClick={() => setPaymentMethod(val)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-lg border font-medium transition-colors ${
                    paymentMethod === val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Ej: Pago adelantado acordado con cliente..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none" />
          </div>

          {/* Preview - correct ITBIS breakdown */}
          {loading ? (
            <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" /></div>
          ) : preview ? (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 border">
              <p className="text-sm font-semibold text-gray-700">Resumen de Factura</p>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{preview.months} mes(es) x {fmtMoney(preview.monthly_net || preview.monthly_price)} (neto)</span>
                <span>{fmtMoney(preview.subtotal_raw)}</span>
              </div>
              {preview.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento: {preview.discount_name}
                    {preview.discount_type === 'percentage' ? ` (${preview.discount_value}%)` : ''}
                  </span>
                  <span>-{fmtMoney(preview.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600 border-t pt-1">
                <span>Subtotal (sin ITBIS)</span>
                <span>{fmtMoney(preview.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>ITBIS (18%)</span>
                <span>{fmtMoney(preview.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-800 border-t pt-1">
                <span>Total a Pagar</span>
                <span>{fmtMoney(preview.total)}</span>
              </div>
              {preview.gross_raw && (
                <div className="text-xs text-gray-400">
                  Precio con ITBIS sin descuento: {fmtMoney(preview.gross_raw)}
                  {preview.discount_amount > 0 && ` → Ahorro: ${fmtMoney(preview.gross_raw - preview.total)}`}
                </div>
              )}
              <div className="text-xs text-gray-400">
                Periodo: {fmtDate(preview.period_start)} → {fmtDate(preview.period_end)}
              </div>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
              Cancelar
            </button>
            <button onClick={handleGenerate} disabled={generating || !preview}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2">
              {generating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Receipt size={16} />
              )}
              {generating ? 'Generando...' : 'Generar Factura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuscripciónesPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [rfidModal, setRfidModal] = useState(null); // subscription object
  const [availableCards, setAvailableCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [billingModalSub, setBillingModalSub] = useState(null);

  const fetchSubs = async () => {
    try {
      const { data } = await subscriptionsAPI.list({ search });
      setSubs(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchSubs(); }, [search]);

  const handleSuspend = async (id) => {
    try {
      await subscriptionsAPI.suspend(id);
      toast.success('Suscripción suspendida');
      fetchSubs();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleReactivate = async (id) => {
    try {
      await subscriptionsAPI.reactivate(id);
      toast.success('Suscripción reactivada');
      fetchSubs();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleCancel = async () => {
    if (!confirmCancel) return;
    try {
      await subscriptionsAPI.cancel(confirmCancel);
      toast.success('Suscripción cancelada');
      setConfirmCancel(null);
      fetchSubs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
      setConfirmCancel(null);
    }
  };

  const handleRfidAction = async (sub) => {
    if (sub.rfid_card_id) {
      // Unlink
      if (!confirm('Desvincular tarjeta RFID de esta suscripción?')) return;
      try {
        await rfidAPI.unlink(sub.rfid_card_id);
        toast.success('Tarjeta RFID desvinculada');
        fetchSubs();
      } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    } else {
      // Show modal to link
      try {
        const { data } = await rfidAPI.list({ cardType: 'permanent', status: 'available' });
        setAvailableCards(data.data || data || []);
        setRfidModal(sub);
      } catch (err) { toast.error('Error cargando tarjetas disponibles'); }
    }
  };

  const handleLinkRfid = async () => {
    if (!selectedCard) return;
    try {
      await rfidAPI.assignPermanent(selectedCard, { subscriptionId: rfidModal.id });
      toast.success('Tarjeta RFID vinculada');
      setRfidModal(null);
      setSelectedCard('');
      fetchSubs();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al vincular'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Suscripciónes</h2>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus size={18} /> Nueva Suscripción
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente o placa..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} cols={7} />
        ) : subs.length === 0 ? (
          <p className="p-8 text-center text-gray-400">No se encontraron suscripciónes</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-sm text-gray-500">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Placa</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">RFID</th>
                  <th className="py-3 px-4">Próxima Factura</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{s.customer_name || `${s.customer?.first_name || ''} ${s.customer?.last_name || ''}`}</td>
                    <td className="py-3 px-4 text-sm">{s.plan_name || s.plan?.name || '-'}</td>
                    <td className="py-3 px-4 font-mono text-sm">{s.vehicle_plate || s.vehicle?.plate || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge[s.status] || 'bg-gray-100'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {s.rfid_card_uid ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          <Wifi size={10} /> {s.rfid_card_uid}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Sin RFID</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {s.next_billing_date ? formatDate(s.next_billing_date) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        {(s.status === 'active' || s.status === 'past_due') && (
                          <button onClick={() => setBillingModalSub(s)} title="Generar Factura"
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"><Receipt size={14} /></button>
                        )}
                        {s.status === 'active' && (
                          <button onClick={() => handleSuspend(s.id)} title="Suspender"
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"><Pause size={14} /></button>
                        )}
                        {(s.status === 'suspended' || s.status === 'past_due') && (
                          <button onClick={() => handleReactivate(s.id)} title="Reactivar"
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"><Play size={14} /></button>
                        )}
                        <button onClick={() => handleRfidAction(s)} title={s.rfid_card_id ? "Desvincular RFID" : "Vincular RFID"}
                          className={`p-1.5 rounded ${s.rfid_card_id ? 'text-indigo-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                          <CreditCard size={14} />
                        </button>
                        <button onClick={() => setConfirmCancel(s.id)} title="Cancelar suscripción"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rfidModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRfidModal(null)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2"><CreditCard size={20} /> Vincular Tarjeta RFID</h3>
              <button onClick={() => setRfidModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600">Suscripción: <strong>{rfidModal.customer_name}</strong> — {rfidModal.vehicle_plate}</p>
              {availableCards.length === 0 ? (
                <p className="text-sm text-amber-600">No hay tarjetas permanentes disponibles. Registre una desde la página RFID.</p>
              ) : (
                <select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Seleccionar tarjeta...</option>
                  {availableCards.map(c => (
                    <option key={c.id} value={c.id}>{c.label || c.card_uid} — UID: {c.card_uid}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setRfidModal(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={handleLinkRfid} disabled={!selectedCard}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Vincular</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <SubscriptionModal
          subscription={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={() => { setShowModal(false); setEditing(null); fetchSubs(); }}
        />
      )}

      {billingModalSub && (
        <PrepaidBillingModal
          subscription={billingModalSub}
          onClose={() => setBillingModalSub(null)}
          onSuccess={() => { setBillingModalSub(null); fetchSubs(); }}
        />
      )}

      <ConfirmModal
        open={!!confirmCancel}
        title="Cancelar Suscripción"
        message="¿Estás seguro de que deseas cancelar esta suscripción? El cliente perderá acceso al parqueo."
        confirmText="Cancelar Suscripción"
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(null)}
      />
    </div>
  );
}
