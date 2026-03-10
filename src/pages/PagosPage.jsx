import { useState, useEffect } from 'react';
import { paymentsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Search, RotateCcw, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { SkeletonTable } from '../components/SkeletonLoader';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateTime } from '../services/formatDate';

const PAGE_SIZE = 15;

const statusConfig = {
  paid: { icon: CheckCircle, label: 'Pagado', class: 'bg-green-100 text-green-700' },
  pending: { icon: Clock, label: 'Pendiente', class: 'bg-yellow-100 text-yellow-700' },
  failed: { icon: XCircle, label: 'Fallido', class: 'bg-red-100 text-red-700' },
  refunded: { icon: RotateCcw, label: 'Reembolsado', class: 'bg-gray-100 text-gray-700' },
};

export default function PagosPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmRefund, setConfirmRefund] = useState(null);

  const fetchPayments = async () => {
    try {
      const { data } = await paymentsAPI.list({ search });
      setPayments(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchPayments(); setPage(1); }, [search]);

  const handleRefund = async () => {
    if (!confirmRefund) return;
    try {
      await paymentsAPI.refund(confirmRefund);
      toast.success('Pago reembolsado');
      setConfirmRefund(null);
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al reembolsar');
      setConfirmRefund(null);
    }
  };

  const totalRevenue = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);

  const paginatedPayments = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Pagos</h2>
        <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
          <DollarSign size={18} className="text-green-600" />
          <span className="text-sm text-green-600">Total cobrado:</span>
          <span className="font-bold text-green-700">RD$ {totalRevenue.toLocaleString()}</span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pagos por cliente o método..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <SkeletonTable rows={8} cols={8} />
        ) : payments.length === 0 ? (
          <p className="p-8 text-center text-gray-400">No se encontraron pagos</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-sm text-gray-500">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Monto</th>
                    <th className="py-3 px-4">Impuesto</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Método</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((p) => {
                    const config = statusConfig[p.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    return (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">
                          {formatDateTime(p.created_at)}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">{p.customer_name || 'Sin cliente'}</td>
                        <td className="py-3 px-4 text-sm">RD$ {parseFloat(p.amount || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">RD$ {parseFloat(p.tax_amount || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 font-medium">RD$ {parseFloat(p.total_amount || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm capitalize">{p.payment_method || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit ${config.class}`}>
                            <StatusIcon size={12} /> {config.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {p.status === 'paid' && (
                            <button onClick={() => setConfirmRefund(p.id)} title="Reembolsar este pago"
                              className="text-xs px-2 py-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                              Reembolsar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalItems={payments.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </div>

      <ConfirmModal
        open={!!confirmRefund}
        title="Confirmar Reembolso"
        message="¿Estás seguro de que deseas reembolsar este pago? Esta acción generará una nota de crédito."
        confirmText="Reembolsar"
        onConfirm={handleRefund}
        onCancel={() => setConfirmRefund(null)}
      />
    </div>
  );
}
