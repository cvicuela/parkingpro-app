import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { History, CheckCircle, AlertTriangle, Eye, RefreshCw, Search } from 'lucide-react';
import { cashAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CajaHistorialPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await cashAPI.history(params);
      setHistory(res.data.data);
    } catch {
      toast.error('Error cargando historial');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const viewDetails = async (register) => {
    setSelected(register);
    try {
      const res = await cashAPI.transactions(register.id);
      setTransactions(res.data.data);
    } catch {
      setTransactions([]);
    }
  };

  const handleApprove = async (id) => {
    try {
      await cashAPI.approve(id, { notes: approveNotes });
      toast.success('Cierre de caja aprobado');
      setApproveNotes('');
      setSelected(null);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error aprobando');
    }
  };

  const pendingApprovals = history.filter(h => h.requires_approval && !h.approved_by);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <History size={24} />Historial de Cajas
        </h1>
        <button onClick={fetchHistory} className="flex items-center gap-2 px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
          <RefreshCw size={16} />Actualizar
        </button>
      </div>

      {/* Alertas pendientes */}
      {pendingApprovals.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-orange-700 font-semibold mb-2">
            <AlertTriangle size={18} />
            {pendingApprovals.length} cierre(s) pendiente(s) de aprobación
          </div>
          <div className="space-y-2">
            {pendingApprovals.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-orange-100">
                <div>
                  <p className="font-medium text-gray-800">{p.operator_name}</p>
                  <p className="text-sm text-gray-500">{p.name} · {new Date(p.closed_at).toLocaleString('es-DO')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-red-600 font-semibold">
                    Diferencia: RD${Math.abs(parseFloat(p.difference)).toFixed(2)}
                  </span>
                  <button onClick={() => viewDetails(p)}
                    className="px-3 py-1 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">
                    Revisar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm" />
      </div>

      {/* Tabla historial */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Fecha', 'Operador', 'Caja', 'Esperado', 'Contado', 'Diferencia', 'Cobros', 'Estado', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0
                ? <tr><td colSpan={9} className="text-center text-gray-400 py-8">Sin registros</td></tr>
                : history.map(h => (
                  <tr key={h.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {h.opened_at ? new Date(h.opened_at).toLocaleDateString('es-DO') : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium">{h.operator_name || h.operator_email}</td>
                    <td className="px-4 py-3 text-gray-500">{h.name}</td>
                    <td className="px-4 py-3">RD${parseFloat(h.expected_balance || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">RD${parseFloat(h.counted_balance || 0).toFixed(2)}</td>
                    <td className={`px-4 py-3 font-semibold ${parseFloat(h.difference || 0) < 0 ? 'text-red-600' : parseFloat(h.difference || 0) > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                      RD${parseFloat(h.difference || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">{h.payment_count}</td>
                    <td className="px-4 py-3">
                      {h.status === 'open' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Abierta</span>
                      ) : h.requires_approval && !h.approved_by ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Pendiente</span>
                      ) : h.requires_approval && h.approved_by ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Aprobada</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Cerrada</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => viewDetails(h)} className="text-indigo-600 text-xs hover:underline flex items-center gap-1">
                        <Eye size={12} /> Ver
                      </button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg p-6 my-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">Detalle de Caja</h2>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-gray-500">Operador:</span><span>{selected.operator_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Caja:</span><span>{selected.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Apertura:</span><span>{selected.opened_at ? new Date(selected.opened_at).toLocaleString('es-DO') : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Cierre:</span><span>{selected.closed_at ? new Date(selected.closed_at).toLocaleString('es-DO') : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Fondo inicial:</span><span>RD${parseFloat(selected.opening_balance || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Esperado:</span><span>RD${parseFloat(selected.expected_balance || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Contado:</span><span>RD${parseFloat(selected.counted_balance || 0).toFixed(2)}</span></div>
              <div className={`flex justify-between font-bold ${parseFloat(selected.difference || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span>Diferencia:</span><span>RD${parseFloat(selected.difference || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Cobros:</span><span>{selected.payment_count} (RD${parseFloat(selected.total_payments || 0).toFixed(2)})</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Reembolsos:</span><span>{selected.refund_count} (RD${parseFloat(selected.total_refunds || 0).toFixed(2)})</span></div>
            </div>

            {/* Transacciones */}
            {transactions.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto mb-4">
                {transactions.map(t => (
                  <div key={t.id} className="flex justify-between px-3 py-2 border-b last:border-0 text-xs">
                    <div>
                      <span className={t.direction === 'in' ? 'text-green-600' : 'text-red-600'}>{t.direction === 'in' ? '+' : '-'}</span>
                      <span className="ml-1">{t.description || t.type}</span>
                    </div>
                    <span className="font-mono">RD${parseFloat(t.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Aprobación */}
            {selected.requires_approval && !selected.approved_by && ['admin', 'super_admin'].includes(user?.role) && (
              <div className="bg-orange-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-orange-700 mb-2">Requiere aprobación</p>
                <textarea rows={2} value={approveNotes} onChange={e => setApproveNotes(e.target.value)}
                  placeholder="Notas de aprobación..."
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-2" />
                <button onClick={() => handleApprove(selected.id)}
                  className="w-full bg-green-600 text-white rounded-lg py-2 text-sm hover:bg-green-700 flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> Aprobar Cierre
                </button>
              </div>
            )}

            {selected.approved_by && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
                <p className="text-blue-700">Aprobada por: {selected.approver_name}</p>
                {selected.approval_notes && <p className="text-blue-600 mt-1">{selected.approval_notes}</p>}
              </div>
            )}

            <button onClick={() => setSelected(null)} className="w-full border border-gray-300 rounded-lg py-2 text-gray-700 hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
