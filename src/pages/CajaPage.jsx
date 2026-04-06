import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Wallet, Lock, CheckCircle, AlertTriangle, Plus, Minus, List, CreditCard, Banknote, ArrowRightLeft } from 'lucide-react';
import { cashAPI } from '../services/api';
import { fmtMoney } from '../utils/formatters';

const DENOMINATIONS = [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1];

export default function CajaPage() {
  const [activeRegister, setActiveRegister] = useState(null);
  const [limits, setLimits] = useState({ cashDiffThreshold: 200, refundLimitOperator: 500 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [openForm, setOpenForm] = useState({ openingBalance: '', name: 'Caja Principal' });
  const [denomCounts, setDenomCounts] = useState({});
  const [closeNotes, setCloseNotes] = useState('');
  const [closing, setClosing] = useState(false);

  const fetchActive = useCallback(async () => {
    try {
      const [regRes, limRes] = await Promise.all([cashAPI.active(), cashAPI.limits()]);
      setActiveRegister(regRes.data.data);
      setLimits(limRes.data.data);
      if (regRes.data.data) {
        const txRes = await cashAPI.transactions(regRes.data.data.id);
        setTransactions(txRes.data.data);
      }
    } catch (err) {
      toast.error('Error cargando caja');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);

  const handleOpen = async (e) => {
    e.preventDefault();
    try {
      await cashAPI.open({ ...openForm, openingBalance: parseFloat(openForm.openingBalance) || 0 });
      toast.success('Caja abierta correctamente');
      setShowOpen(false);
      fetchActive();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error abriendo caja');
    }
  };

  const countedBalance = DENOMINATIONS.reduce((acc, d) => {
    return acc + (d * (parseInt(denomCounts[d]) || 0));
  }, 0);

  const handleClose = async (e) => {
    e.preventDefault();
    if (closing) return;
    setClosing(true);
    const denominations = DENOMINATIONS
      .filter(d => parseInt(denomCounts[d]) > 0)
      .map(d => ({ denomination: d, quantity: parseInt(denomCounts[d]) }));
    try {
      const res = await cashAPI.close(activeRegister.id, {
        countedBalance,
        denominations,
        notes: closeNotes
      });
      const data = res.data.data;
      if (data.requiresApproval) {
        toast.warn(data.message, { autoClose: 8000 });
      } else {
        toast.success(data.message);
      }
      setShowClose(false);
      setActiveRegister(null);
      setTransactions([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error cerrando caja');
    } finally {
      setClosing(false);
    }
  };

  const totalIn = transactions.filter(t => t.direction === 'in').reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalOut = transactions.filter(t => t.direction === 'out').reduce((s, t) => s + parseFloat(t.amount), 0);

  // Desglose por método de pago
  const totalCard = activeRegister ? parseFloat(activeRegister.total_card || 0) : transactions
    .filter(t => t.direction === 'in' && t.payment_method === 'card')
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalTransfer = activeRegister ? parseFloat(activeRegister.total_transfer || 0) : transactions
    .filter(t => t.direction === 'in' && t.payment_method === 'transfer')
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const cashIn = activeRegister ? parseFloat(activeRegister.cash_in || 0) : transactions
    .filter(t => t.direction === 'in' && (!t.payment_method || t.payment_method === 'cash'))
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const cashOut = transactions
    .filter(t => t.direction === 'out' && (!t.payment_method || t.payment_method === 'cash'))
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const expectedCash = cashIn - cashOut;
  // La diferencia se calcula solo contra efectivo
  const closeDifference = countedBalance - expectedCash;

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Wallet size={24} />Cuadre de Caja</h1>
        <div className="text-sm text-gray-500">
          Umbral alerta: <strong>{fmtMoney(limits.cashDiffThreshold)}</strong> · Límite reembolso operador: <strong>{fmtMoney(limits.refundLimitOperator)}</strong>
        </div>
      </div>

      {!activeRegister ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Lock size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No hay caja abierta</h2>
          <p className="text-gray-500 mb-6">Debes abrir una caja antes de registrar cobros</p>
          <button onClick={() => setShowOpen(true)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Abrir Caja
          </button>
        </div>
      ) : (
        <>
          {/* Resumen del turno */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Fondo Inicial', value: parseFloat(activeRegister.opening_balance), color: 'blue' },
              { label: 'Total Ingresos', value: totalIn, color: 'green' },
              { label: 'Total Egresos', value: totalOut, color: 'red' },
              { label: 'Balance Actual', value: totalIn - totalOut, color: 'indigo' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-lg p-4`}>
                <p className={`text-xs text-${color}-600 font-medium uppercase`}>{label}</p>
                <p className={`text-2xl font-bold text-${color}-700`}>{fmtMoney(value)}</p>
              </div>
            ))}
          </div>

          {/* Desglose por método de pago */}
          {(totalCard > 0 || totalTransfer > 0) && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <Banknote size={16} className="text-green-600" />
                <div>
                  <p className="text-xs text-gray-500">Efectivo</p>
                  <p className="text-lg font-bold text-green-700">{fmtMoney(expectedCash)}</p>
                </div>
              </div>
              <div className="bg-white border border-purple-200 rounded-lg p-3 flex items-center gap-2">
                <CreditCard size={16} className="text-purple-600" />
                <div>
                  <p className="text-xs text-gray-500">Tarjeta</p>
                  <p className="text-lg font-bold text-purple-700">{fmtMoney(totalCard)}</p>
                </div>
              </div>
              <div className="bg-white border border-cyan-200 rounded-lg p-3 flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-cyan-600" />
                <div>
                  <p className="text-xs text-gray-500">Transferencia</p>
                  <p className="text-lg font-bold text-cyan-700">{fmtMoney(totalTransfer)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Info de caja */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{activeRegister.name}</p>
              <p className="text-sm text-gray-500">Abierta: {new Date(activeRegister.opened_at).toLocaleString('es-DO')}</p>
            </div>
            {activeRegister.status === 'pending_approval' ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg border border-amber-300">
                <AlertTriangle size={16} /> Pendiente aprobación supervisor
              </div>
            ) : (
              <button onClick={() => { setDenomCounts({}); setCloseNotes(''); setShowClose(true); }} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                <Lock size={16} /> Cerrar Caja
              </button>
            )}
          </div>

          {/* Transacciones */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b flex items-center gap-2">
              <List size={18} className="text-gray-500" />
              <h3 className="font-semibold text-gray-700">Movimientos del Turno ({transactions.length})</h3>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {transactions.length === 0
                ? <p className="text-center text-gray-400 py-8">Sin movimientos registrados</p>
                : transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {t.direction === 'in'
                        ? <Plus size={16} className="text-green-500" />
                        : <Minus size={16} className="text-red-500" />}
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.description || t.type}</p>
                        <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleTimeString('es-DO')}</p>
                      </div>
                    </div>
                    <span className={`font-semibold ${t.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.direction === 'in' ? '+' : '-'}{fmtMoney(parseFloat(t.amount))}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        </>
      )}

      {/* Modal Abrir Caja */}
      {showOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Abrir Caja</h2>
            <form onSubmit={handleOpen} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la caja</label>
                <input value={openForm.name} onChange={e => setOpenForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fondo inicial (RD$)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00"
                  value={openForm.openingBalance}
                  onChange={e => setOpenForm(p => ({ ...p, openingBalance: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowOpen(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700">Abrir Caja</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cierre de Caja */}
      {showClose && activeRegister && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 my-4">
            <h2 className="text-lg font-bold mb-2">Cierre de Caja</h2>
            <p className="text-sm text-gray-500 mb-4">Cuenta el efectivo por denominación</p>

            <form onSubmit={handleClose} className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Denominación</th>
                      <th className="px-4 py-2 text-center">Cantidad</th>
                      <th className="px-4 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DENOMINATIONS.map(d => (
                      <tr key={d} className="border-t">
                        <td className="px-4 py-2 font-medium">RD$ {d.toLocaleString('en-US')}</td>
                        <td className="px-4 py-2">
                          <input type="number" min="0" placeholder="0"
                            value={denomCounts[d] || ''}
                            onChange={e => setDenomCounts(p => ({ ...p, [d]: e.target.value }))}
                            className="w-20 mx-auto block text-center border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </td>
                        <td className="px-4 py-2 text-right">{fmtMoney(d * (parseInt(denomCounts[d]) || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Efectivo esperado en caja:</span><span className="font-semibold">{fmtMoney(expectedCash)}</span></div>
                <div className="flex justify-between"><span>Efectivo contado:</span><span className="font-semibold text-indigo-600">{fmtMoney(countedBalance)}</span></div>
                <div className={`flex justify-between font-bold ${Math.abs(closeDifference) > limits.cashDiffThreshold ? 'text-red-600' : 'text-green-600'}`}>
                  <span>Diferencia:</span>
                  <span>{fmtMoney(closeDifference)}</span>
                </div>
                {Math.abs(closeDifference) > limits.cashDiffThreshold && (
                  <div className="flex items-center gap-2 text-orange-600 bg-orange-50 rounded p-2 mt-2">
                    <AlertTriangle size={16} />
                    <span>Diferencia supera {fmtMoney(limits.cashDiffThreshold)} — requiere aprobación del supervisor</span>
                  </div>
                )}
                {/* Otros ingresos no contados en efectivo */}
                {(totalCard > 0 || totalTransfer > 0) && (
                  <div className="bg-blue-50 rounded p-2 mt-2 space-y-1">
                    <p className="text-xs font-medium text-blue-700">Otros ingresos (no se cuentan en efectivo):</p>
                    {totalCard > 0 && <div className="flex justify-between text-xs"><span className="text-blue-600">Tarjeta:</span><span className="font-semibold">{fmtMoney(totalCard)}</span></div>}
                    {totalTransfer > 0 && <div className="flex justify-between text-xs"><span className="text-blue-600">Transferencia:</span><span className="font-semibold">{fmtMoney(totalTransfer)}</span></div>}
                    <div className="flex justify-between text-xs pt-1 border-t border-blue-200"><span className="text-blue-600 font-medium">Total general:</span><span className="font-bold">{fmtMoney(totalIn - totalOut)}</span></div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea rows={2} value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Observaciones del cierre..." />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowClose(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={closing} className="flex-1 bg-red-600 text-white rounded-lg py-2 hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {closing ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle size={16} />}
                  {closing ? 'Cerrando...' : 'Confirmar Cierre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
