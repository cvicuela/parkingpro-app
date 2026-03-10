import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FileText, Search, Printer, RefreshCw } from 'lucide-react';
import { invoicesAPI } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import Pagination from '../components/Pagination';
import { formatDate, formatDateTime } from '../services/formatDate';

const PAGE_SIZE = 15;

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

const STATUS_MAP = {
  paid: { label: 'Pagada', color: 'green' },
  refund: { label: 'Nota Crédito', color: 'orange' },
  default: { label: 'Emitida', color: 'blue' },
};

export default function FacturasPage() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, statsRes] = await Promise.all([
        invoicesAPI.list({ search, startDate: startDate || undefined, endDate: endDate || undefined }),
        invoicesAPI.stats({ startDate: startDate || undefined, endDate: endDate || undefined }),
      ]);
      setInvoices(invRes.data.data);
      setStats(statsRes.data.data);
    } catch {
      toast.error('Error cargando facturas');
    } finally {
      setLoading(false);
    }
  }, [search, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrint = (invoice) => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Factura ${escapeHtml(invoice.ncf)}</title>
      <style>
        body { font-family: monospace; max-width: 400px; margin: 0 auto; padding: 20px; }
        h2 { text-align: center; } hr { border-top: 1px dashed #000; }
        .row { display: flex; justify-content: space-between; }
        .total { font-size: 1.2em; font-weight: bold; }
      </style></head>
      <body>
        <h2>ParkingPro</h2>
        <p style="text-align:center">FACTURA DE VENTA<br>${escapeHtml(invoice.ncf)}</p>
        <hr/>
        <p>Cliente: ${escapeHtml(invoice.customer_name)}</p>
        ${invoice.rnc ? `<p>RNC: ${escapeHtml(invoice.rnc)}</p>` : ''}
        <p>Fecha: ${new Date(invoice.created_at).toLocaleString('es-DO')}</p>
        <hr/>
        ${JSON.parse(invoice.items || '[]').map(item =>
          `<div class="row"><span>${escapeHtml(item.description)}</span><span>RD$${parseFloat(item.subtotal).toFixed(2)}</span></div>`
        ).join('')}
        <hr/>
        <div class="row"><span>Subtotal:</span><span>RD$${parseFloat(invoice.subtotal).toFixed(2)}</span></div>
        <div class="row"><span>ITBIS (18%):</span><span>RD$${parseFloat(invoice.tax_amount).toFixed(2)}</span></div>
        <div class="row total"><span>TOTAL:</span><span>RD$${parseFloat(invoice.total).toFixed(2)}</span></div>
        <hr/>
        <p style="text-align:center;font-size:0.8em">Gracias por su preferencia</p>
        <script>window.print(); window.close();</script>
      </body></html>
    `);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FileText size={24} />Facturación</h1>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
          <RefreshCw size={16} />Actualizar
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Facturas emitidas', value: stats.total_invoices, fmt: v => v, color: 'blue' },
            { label: 'Ingresos facturados', value: stats.total_revenue, fmt: v => `RD$${parseFloat(v).toFixed(2)}`, color: 'green' },
            { label: 'ITBIS recaudado', value: stats.total_tax, fmt: v => `RD$${parseFloat(v).toFixed(2)}`, color: 'indigo' },
            { label: 'Notas de crédito', value: stats.total_refunds, fmt: v => `RD$${parseFloat(v).toFixed(2)}`, color: 'orange' },
          ].map(({ label, value, fmt, color }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-lg p-4`}>
              <p className={`text-xs text-${color}-600 font-medium uppercase`}>{label}</p>
              <p className={`text-2xl font-bold text-${color}-700`}>{fmt(value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Buscar por N° o cliente..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <SkeletonTable rows={8} cols={8} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['N° Factura', 'NCF', 'Cliente', 'Subtotal', 'ITBIS', 'Total', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0
                ? <tr><td colSpan={8} className="text-center text-gray-400 py-8">No hay facturas</td></tr>
                : invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(inv => (
                  <tr key={inv.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(inv)}>
                    <td className="px-4 py-3 font-mono font-semibold text-indigo-600">#{inv.invoice_number}</td>
                    <td className="px-4 py-3 font-mono text-xs">{inv.ncf}</td>
                    <td className="px-4 py-3">{inv.customer_name}</td>
                    <td className="px-4 py-3">RD${parseFloat(inv.subtotal).toFixed(2)}</td>
                    <td className="px-4 py-3">RD${parseFloat(inv.tax_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 font-semibold">RD${parseFloat(inv.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(inv.created_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); handlePrint(inv); }}
                        className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 text-xs">
                        <Printer size={12} /> Imprimir
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}
        {!loading && invoices.length > 0 && (
          <Pagination currentPage={page} totalItems={invoices.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        )}
      </div>

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">FACTURA #{selected.invoice_number}</h2>
              <p className="text-gray-500 font-mono text-sm">{selected.ncf}</p>
            </div>
            <hr className="my-3" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Cliente:</span><span className="font-medium">{selected.customer_name}</span></div>
              {selected.rnc && <div className="flex justify-between"><span className="text-gray-500">RNC:</span><span>{selected.rnc}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Fecha:</span><span>{formatDateTime(selected.created_at)}</span></div>
            </div>
            <hr className="my-3" />
            {JSON.parse(selected.items || '[]').map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span>{item.description}</span>
                <span>RD${parseFloat(item.subtotal).toFixed(2)}</span>
              </div>
            ))}
            <hr className="my-3" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span><span>RD${parseFloat(selected.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>ITBIS (18%):</span><span>RD${parseFloat(selected.tax_amount).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg"><span>TOTAL:</span><span>RD${parseFloat(selected.total).toFixed(2)}</span></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setSelected(null)} className="flex-1 border border-gray-300 rounded-lg py-2 text-gray-700">Cerrar</button>
              <button onClick={() => handlePrint(selected)} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 flex items-center justify-center gap-2">
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
