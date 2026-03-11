import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { reportsAPI, plansAPI } from '../services/api';
import * as XLSX from 'xlsx';
import {
  DollarSign, Users, Car, AlertTriangle, BarChart3, Clock, RefreshCw,
  TrendingUp, TrendingDown, Minus, Download, FileText, Wallet, Calendar,
  ChevronDown, X, CreditCard, Receipt, ArrowUpRight, ArrowDownRight,
  CheckCircle, XCircle, Loader2, Shield
} from 'lucide-react';
import { SkeletonKPI, SkeletonTable } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

// ─── HELPERS ────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString('es-DO');
const fmtRD = (n) => `RD$ ${fmt(n)}`;
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;
const safe = (v, fallback = 0) => v ?? fallback;
const safeStr = (v, fallback = '--') => (v !== undefined && v !== null && v !== '') ? v : fallback;

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Año' },
  { key: 'custom', label: 'Personalizado' },
];

const TABS = [
  { key: 'resumen', label: 'Resumen Ejecutivo', icon: BarChart3 },
  { key: 'ingresos', label: 'Ingresos/Ventas', icon: DollarSign },
  { key: 'caja', label: 'Cuadre de Caja', icon: Wallet },
  { key: 'clientes', label: 'Clientes', icon: Users },
  { key: 'ocupacion', label: 'Ocupación', icon: Car },
  { key: 'sesiones', label: 'Sesiones Parqueo', icon: Clock },
  { key: 'facturacion', label: 'Facturación', icon: Receipt },
];

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

// ─── KPI CARD (estandarizado) ──────────────────────────────
function KPICard({ icon: Icon, label, value, subtitle, trend, color = 'indigo', loading }) {
  const bg = { green: 'bg-green-100', blue: 'bg-blue-100', indigo: 'bg-indigo-100', amber: 'bg-amber-100', red: 'bg-red-100', purple: 'bg-purple-100', cyan: 'bg-cyan-100' };
  const fg = { green: 'text-green-600', blue: 'text-blue-600', indigo: 'text-indigo-600', amber: 'text-amber-600', red: 'text-red-600', purple: 'text-purple-600', cyan: 'text-cyan-600' };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm min-h-[112px] animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-6 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
        </div>
      </div>
    );
  }

  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400';
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm card-hover min-h-[112px]">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${bg[color] || bg.indigo} ${fg[color] || fg.indigo}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 truncate">{safeStr(value, '0')}</p>
          {(subtitle || trend !== undefined) && (
            <div className="flex items-center gap-1 mt-0.5">
              {trend !== undefined && trend !== null && (
                <>
                  <TrendIcon size={12} className={trendColor} />
                  <span className={`text-xs font-medium ${trendColor}`}>
                    {trend > 0 ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(1) : safe(trend)}%
                  </span>
                </>
              )}
              {subtitle && <span className="text-xs text-gray-400 truncate">{subtitle}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CHART TOOLTIP (formatted RD$) ─────────────────────────
function ChartTooltipRD({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="text-xs">
          {p.name}: {fmtRD(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── DATE RANGE PICKER ──────────────────────────────────────
function DateRangePicker({ from, to, onChange, onClose }) {
  const [localFrom, setLocalFrom] = useState(from || '');
  const [localTo, setLocalTo] = useState(to || '');
  const valid = localFrom && localTo && localFrom <= localTo;

  return (
    <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <p className="font-medium text-sm text-gray-700">Rango personalizado</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Desde</label>
          <input type="date" value={localFrom} onChange={e => setLocalFrom(e.target.value)}
            max={localTo || undefined}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
          <input type="date" value={localTo} onChange={e => setLocalTo(e.target.value)}
            min={localFrom || undefined}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        {localFrom && localTo && localFrom > localTo && (
          <p className="text-xs text-red-500">La fecha "Desde" no puede ser mayor que "Hasta"</p>
        )}
        <button onClick={() => { if (valid) { onChange(localFrom, localTo); onClose(); } }}
          disabled={!valid}
          className="w-full py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium">
          Aplicar
        </button>
      </div>
    </div>
  );
}

// ─── EXPORT BUTTON ──────────────────────────────────────────
function ExportButton({ period, customFrom, customTo, activeTab }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const exportTypeMap = {
    resumen: 'payments',
    ingresos: 'payments',
    caja: 'cash-registers',
    clientes: 'customers',
    ocupacion: 'sessions',
    sesiones: 'sessions',
    facturacion: 'payments',
  };

  const handleExport = async (format) => {
    setExporting(true);
    setOpen(false);
    try {
      const params = { period };
      if (period === 'custom') { params.from = customFrom; params.to = customTo; }
      const type = exportTypeMap[activeTab] || 'payments';
      const dateStr = new Date().toISOString().slice(0, 10);

      if (format === 'csv' || format === 'excel') {
        // Fetch structured data from backend CSV export endpoint
        const res = await reportsAPI.exportCsv(type, params);
        const csvData = res.data?.data;

        if (!csvData || !csvData.rows || csvData.rows.length === 0) {
          alert('No hay datos para exportar en el periodo seleccionado');
          return;
        }

        const headers = csvData.headers || Object.keys(csvData.rows[0]);
        const rows = csvData.rows.map(row =>
          headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            return val;
          })
        );

        if (format === 'csv') {
          const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
          const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${csvData.filename || type}_${dateStr}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // Real .xlsx using SheetJS
          const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

          // Auto-size columns
          ws['!cols'] = headers.map((h, i) => {
            const maxLen = Math.max(h.length, ...rows.map(r => String(r[i] || '').length));
            return { wch: Math.min(maxLen + 2, 40) };
          });

          const wb = XLSX.utils.book_new();
          const tabLabel = TABS.find(t => t.key === activeTab)?.label || activeTab;
          XLSX.utils.book_append_sheet(wb, ws, tabLabel.substring(0, 31));
          XLSX.writeFile(wb, `${csvData.filename || type}_${dateStr}.xlsx`);
        }
      } else if (format === 'pdf') {
        // PDF: generate printable HTML
        const tabLabel = TABS.find(t => t.key === activeTab)?.label || activeTab;
        const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label || period;
        const settings = JSON.parse(localStorage.getItem('pp_settings') || '{}');
        const businessName = settings.business_name || 'ParkingPro';

        const content = document.getElementById('report-content');
        const printHtml = content ? content.innerHTML : '<p>Sin contenido para exportar</p>';

        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head><title>${tabLabel} - ${businessName}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1f2937; max-width: 1100px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
            .header h1 { font-size: 22px; color: #6366f1; margin: 0; }
            .header .meta { text-align: right; font-size: 12px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
            td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
            .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
            .kpi .label { font-size: 11px; color: #9ca3af; }
            .kpi .value { font-size: 20px; font-weight: 700; color: #111827; }
            @media print { body { padding: 20px; } .no-print { display: none; } }
          </style></head><body>
          <div class="header">
            <div><h1>${businessName}</h1><p style="margin:4px 0 0;font-size:14px;color:#374151">${tabLabel}</p></div>
            <div class="meta"><p>Periodo: ${periodLabel}${period === 'custom' ? ` (${customFrom} — ${customTo})` : ''}</p>
            <p>Generado: ${new Date().toLocaleString('es-DO')}</p></div>
          </div>
          ${printHtml}
          <script>window.print();</script>
          </body></html>`);
        win.document.close();
      }
    } catch (e) {
      console.error('Export error:', e);
      alert('Error al exportar: ' + (e.response?.data?.error || e.message));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 shadow-sm"
        aria-haspopup="true" aria-expanded={open}>
        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Exportar
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
          {[
            { fmt: 'pdf', label: 'PDF', icon: FileText },
            { fmt: 'excel', label: 'Excel (.xlsx)', icon: BarChart3 },
            { fmt: 'csv', label: 'CSV', icon: Download },
          ].map(({ fmt: f, label, icon: Ic }) => (
            <button key={f} onClick={() => handleExport(f)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Ic size={14} className="text-gray-400" /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB: RESUMEN EJECUTIVO ─────────────────────────────────
function TabResumen({ data, loading }) {
  if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <KPICard key={i} icon={BarChart3} label="" value="" loading />)}</div>;
  if (!data) return <EmptyState type="chart" />;

  const r = data.revenue || {};
  const s = data.subscriptions || {};
  const sess = data.sessions || {};
  const cash = data.cashRegisters || {};
  const col = data.collection || {};
  const ref = data.refunds || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Ingresos del Mes" color="green"
          value={fmtRD(safe(r.currentMonth))}
          trend={safe(r.changePercent, null)}
          subtitle={`vs mes anterior`} />
        <KPICard icon={Users} label="Suscripciones Activas" color="indigo"
          value={fmt(safe(s.totalActive))}
          subtitle={`${fmt(safe(s.newThisMonth))} nuevas este mes`} />
        <KPICard icon={CreditCard} label="Tasa de Cobro" color="blue"
          value={fmtPct(safe(col.rate))}
          subtitle={`${fmt(safe(col.paidCount))}/${fmt(safe(col.totalCount))} cobrados`} />
        <KPICard icon={AlertTriangle} label="Reembolsos" color="red"
          value={fmtRD(safe(ref.total))}
          subtitle={`${fmt(safe(ref.count))} reembolsos`} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Clock} label="Sesiones por Hora" color="amber"
          value={fmt(safe(sess.totalThisMonth))}
          subtitle={`Duración prom: ${fmt(safe(sess.avgDurationMinutes))} min`} />
        <KPICard icon={Wallet} label="Cuadres de Caja" color="purple"
          value={fmt(safe(cash.totalClosures))}
          subtitle={`${fmt(safe(cash.approvedCount ?? cash.requiringApproval, 0))} aprobados`} />
        <KPICard icon={TrendingUp} label="Ingreso Promedio/Sesión" color="cyan"
          value={fmtRD(safe(sess.avgTicket ?? (safe(sess.hourlyRevenue) / Math.max(safe(sess.totalThisMonth), 1))))}
          subtitle="Ticket promedio" />
        <KPICard icon={XCircle} label="Cancelaciones" color="red"
          value={fmt(safe(s.cancelledThisMonth))}
          subtitle="Suscripciones canceladas" />
      </div>
    </div>
  );
}

// ─── TAB: INGRESOS/VENTAS ───────────────────────────────────
function TabIngresos({ data, loading }) {
  if (loading) return <><SkeletonKPI count={4} /><div className="h-64 bg-white rounded-xl animate-pulse mt-4" /></>;
  if (!data) return <EmptyState type="money" />;

  const t = data.totals || {};
  const timeline = (data.timeline || []).map(d => ({
    ...d,
    label: new Date(d.period).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' }),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Ingresos Brutos" value={fmtRD(safe(t.grossRevenue))} color="green" />
        <KPICard icon={DollarSign} label="Ingresos Netos" value={fmtRD(safe(t.netRevenue))} color="indigo" />
        <KPICard icon={Receipt} label="Transacciones" value={fmt(safe(t.transactions))} color="blue" />
        <KPICard icon={TrendingUp} label="Ticket Promedio" value={fmtRD(safe(t.avgTicket))} color="amber" />
      </div>

      {/* Revenue timeline chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Ingresos en el Tiempo</h3>
        {timeline.length === 0 ? <EmptyState type="chart" /> : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `RD$ ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltipRD />} />
              <Bar dataKey="total" name="Ingreso Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tax" name="ITBIS" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* By payment method */}
      {(data.byMethod || []).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Por Método de Pago</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.byMethod} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={90} label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}>
                  {data.byMethod.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmtRD(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Por Plan</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Ingresos agrupados por plan</caption>
                <thead className="bg-gray-50 text-sm text-gray-500">
                  <tr><th className="py-3 px-4">Plan</th><th className="py-3 px-4">Tipo</th><th className="py-3 px-4">Transacciones</th><th className="py-3 px-4">Total</th></tr>
                </thead>
                <tbody>
                  {(data.byPlan || []).map((p, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-3 px-4 font-medium text-sm">{safeStr(p.planName)}</td>
                      <td className="py-3 px-4 text-sm capitalize">{safeStr(p.planType)}</td>
                      <td className="py-3 px-4 text-sm">{fmt(safe(p.count))}</td>
                      <td className="py-3 px-4 text-sm font-medium">{fmtRD(safe(p.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB: CUADRE DE CAJA ────────────────────────────────────
function TabCaja({ data, loading }) {
  if (loading) return <><SkeletonKPI count={4} /><SkeletonTable rows={5} cols={6} /></>;
  if (!data) return <EmptyState type="cash" />;

  const s = data.summary || {};
  const closures = data.closures || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Wallet} label="Total Cierres" value={fmt(safe(s.totalClosures))} color="indigo"
          subtitle={`${fmt(safe(s.approvedCount))} aprobados`} />
        <KPICard icon={TrendingUp} label="Sobrantes" value={fmt(safe(s.surplusCount))} color="green"
          subtitle={`Diferencia neta: ${fmtRD(safe(s.netDifference))}`} />
        <KPICard icon={TrendingDown} label="Faltantes" value={fmt(safe(s.shortageCount))} color="red"
          subtitle={`Máx diferencia: ${fmtRD(safe(s.maxDifference))}`} />
        <KPICard icon={Shield} label="Requirieron Aprobación" value={fmt(safe(s.flaggedCount))} color="amber"
          subtitle={`Prom: ${fmtRD(safe(s.avgDifference))}`} />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Historial de Cierres</h3>
        {closures.length === 0 ? <EmptyState type="cash" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Historial de cierres de caja</caption>
              <thead className="bg-gray-50 text-sm text-gray-500">
                <tr>
                  <th className="py-3 px-4">Operador</th>
                  <th className="py-3 px-4">Fecha Cierre</th>
                  <th className="py-3 px-4">Esperado</th>
                  <th className="py-3 px-4">Contado</th>
                  <th className="py-3 px-4">Diferencia</th>
                  <th className="py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {closures.map((c, i) => {
                  const diff = safe(c.difference);
                  return (
                    <tr key={c.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium">{safeStr(c.operatorName)}</td>
                      <td className="py-3 px-4 text-sm">{c.closedAt ? new Date(c.closedAt).toLocaleString('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                      <td className="py-3 px-4 text-sm">{fmtRD(safe(c.expectedBalance))}</td>
                      <td className="py-3 px-4 text-sm">{fmtRD(safe(c.countedBalance))}</td>
                      <td className={`py-3 px-4 text-sm font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {diff > 0 ? '+' : ''}{fmtRD(diff)}
                      </td>
                      <td className="py-3 px-4">
                        {c.requiresApproval ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {c.isApproved ? 'Aprobado' : 'Pendiente'}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB: CLIENTES ──────────────────────────────────────────
function TabClientes({ data, loading }) {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  if (loading) return <><SkeletonKPI count={3} /><SkeletonTable rows={10} cols={7} /></>;
  if (!data) return <EmptyState type="users" />;

  const topCustomers = data.topCustomers || [];
  const paginated = topCustomers.slice((page - 1) * pageSize, page * pageSize);
  const delinquent = data.delinquent || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard icon={Users} label="Tasa de Retención" value={fmtPct(safe(data.retentionRate))} color="green" />
        <KPICard icon={TrendingUp} label="Clientes Nuevos" value={fmt((data.newCustomersTrend || []).reduce((s, d) => s + safe(d.count), 0))} color="indigo"
          subtitle="En este período" />
        <KPICard icon={AlertTriangle} label="Morosos" value={fmt(delinquent.length)} color="red"
          subtitle="Cuentas con pagos pendientes" />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Top Clientes por Ingresos</h3>
        {topCustomers.length === 0 ? <EmptyState type="users" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Top 20 clientes por ingresos generados</caption>
                <thead className="bg-gray-50 text-sm text-gray-500">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Documento</th>
                    <th className="py-3 px-4">Pagos</th>
                    <th className="py-3 px-4">Total Pagado</th>
                    <th className="py-3 px-4">Suscripciones</th>
                    <th className="py-3 px-4">Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c, i) => (
                    <tr key={c.customerId || i} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => { if (c.customerId) window.location.href = `/clientes/${c.customerId}`; }}>
                      <td className="py-3 px-4 text-sm text-gray-400">{(page - 1) * pageSize + i + 1}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">{safeStr(c.customerName)}</td>
                      <td className="py-3 px-4 text-sm font-mono">{safeStr(c.idDocument, '-')}</td>
                      <td className="py-3 px-4 text-sm">{fmt(safe(c.paymentCount))}</td>
                      <td className="py-3 px-4 text-sm font-medium">{fmtRD(safe(c.totalPaid))}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${safe(c.subscriptionCount) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {safe(c.subscriptionCount) > 0 ? `${c.subscriptionCount} Activa${c.subscriptionCount > 1 ? 's' : ''}` : 'Sin plan'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {c.customerSince ? new Date(c.customerSince).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalItems={topCustomers.length} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── TAB: OCUPACIÓN ─────────────────────────────────────────
function TabOcupacion({ data, plans, loading }) {
  if (loading) return <><SkeletonKPI count={3} /><div className="h-64 bg-white rounded-xl animate-pulse mt-4" /></>;
  if (!data && plans.length === 0) return <EmptyState type="car" />;

  const peakHours = data?.peakHours || [];
  const peakDays = data?.peakDays || [];
  const totalCap = plans.reduce((s, p) => s + safe(p.max_capacity), 0);
  const totalOcc = plans.reduce((s, p) => s + safe(p.current_occupancy), 0);
  const pct = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard icon={Car} label="Ocupación General" value={`${pct}%`} color={pct >= 90 ? 'red' : pct >= 70 ? 'amber' : 'green'}
          subtitle={`${totalOcc} de ${totalCap} espacios`} />
        <KPICard icon={TrendingUp} label="Hora Pico" value={peakHours.length > 0 ? peakHours[0].label || `${safe(peakHours[0].hour)}:00` : '--'} color="indigo"
          subtitle={peakHours.length > 0 ? `${fmt(safe(peakHours[0].entryCount))} entradas` : ''} />
        <KPICard icon={Calendar} label="Día Más Activo" value={peakDays.length > 0 ? safeStr(peakDays[0].dayName) : '--'} color="blue"
          subtitle={peakDays.length > 0 ? `${fmt(safe(peakDays[0].entryCount))} entradas` : ''} />
      </div>

      {/* Occupancy by plan bars with tooltips */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Ocupación por Plan (Actual)</h3>
        <div className="space-y-4">
          {plans.map((plan) => {
            const planPct = safe(plan.max_capacity) > 0 ? Math.round((safe(plan.current_occupancy) / plan.max_capacity) * 100) : 0;
            const barColor = planPct >= 90 ? 'bg-red-500' : planPct >= 70 ? 'bg-amber-500' : 'bg-green-500';
            const available = safe(plan.max_capacity) - safe(plan.current_occupancy);

            return (
              <div key={plan.id} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700 truncate">{plan.name}</div>
                <div className="flex-1 group relative">
                  <div className="w-full bg-gray-200 rounded-full h-5">
                    <div className={`h-5 rounded-full transition-all ${barColor} flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max(Math.min(planPct, 100), 4)}%` }}>
                      {planPct > 15 && <span className="text-[10px] text-white font-bold">{planPct}%</span>}
                    </div>
                  </div>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                      {safe(plan.current_occupancy)} espacios ocupados de {safe(plan.max_capacity)} totales
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right text-sm text-gray-500">{safe(plan.current_occupancy)}/{safe(plan.max_capacity)}</div>
                <div className="w-32 text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${available > 5 ? 'bg-green-100 text-green-700' : available > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {available} disponibles
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Peak hours chart */}
      {peakHours.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Horas Pico de Entrada</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => [`${v} entradas`]} />
              <Bar dataKey="entryCount" name="Entradas" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── TAB: SESIONES PARQUEO ──────────────────────────────────
function TabSesiones({ data, loading }) {
  if (loading) return <><SkeletonKPI count={4} /><SkeletonTable rows={5} cols={5} /></>;
  if (!data) return <EmptyState type="session" />;

  const s = data.summary || {};
  const timeline = (data.timeline || []).map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' }),
  }));
  const distribution = data.durationDistribution || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Car} label="Total Sesiones" value={fmt(safe(s.total))} color="indigo" subtitle={`${fmt(safe(s.active))} activas`} />
        <KPICard icon={CheckCircle} label="Pagadas" value={fmt(safe(s.paid))} color="green" subtitle={`${fmt(safe(s.closed))} cerradas`} />
        <KPICard icon={XCircle} label="Abandonadas" value={fmt(safe(s.abandoned))} color="red" />
        <KPICard icon={Clock} label="Duración Promedio" value={`${fmt(safe(s.avgDuration))} min`} color="amber"
          subtitle={`Ticket prom: ${fmtRD(safe(s.avgTicket))}`} />
      </div>

      {timeline.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Sesiones en el Tiempo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" name="Total" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="paid" name="Pagadas" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="abandoned" name="Abandonadas" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {distribution.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Distribución de Duración</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Sesiones" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── TAB: FACTURACIÓN ───────────────────────────────────────
function TabFacturacion({ data, loading }) {
  if (loading) return <><SkeletonKPI count={4} /><SkeletonTable rows={5} cols={4} /></>;
  if (!data) return <EmptyState type="invoice" />;

  const s = data.summary || {};
  const byNCF = data.byNCFType || [];
  const timeline = (data.timeline || []).map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' }),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={FileText} label="Total Facturas" value={fmt(safe(s.totalInvoices))} color="indigo" />
        <KPICard icon={DollarSign} label="Monto Total" value={fmtRD(safe(s.totalAmount))} color="green" />
        <KPICard icon={Receipt} label="ITBIS Recaudado" value={fmtRD(safe(s.totalTax))} color="amber" />
        <KPICard icon={Users} label="Clientes Únicos" value={fmt(safe(s.uniqueCustomers))} color="blue" />
      </div>

      {byNCF.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Por Tipo de NCF</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Facturas agrupadas por tipo de comprobante fiscal</caption>
              <thead className="bg-gray-50 text-sm text-gray-500">
                <tr><th className="py-3 px-4">Tipo NCF</th><th className="py-3 px-4">Cantidad</th><th className="py-3 px-4">Total</th></tr>
              </thead>
              <tbody>
                {byNCF.map((n, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm font-medium">{safeStr(n.type)}</td>
                    <td className="py-3 px-4 text-sm">{fmt(safe(n.count))}</td>
                    <td className="py-3 px-4 text-sm font-medium">{fmtRD(safe(n.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {timeline.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Facturación en el Tiempo</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `RD$ ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltipRD />} />
              <Bar yAxisId="left" dataKey="count" name="Facturas" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="total" name="Monto" stroke="#22c55e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function ReportesPage() {
  // Global period filter (persists across tabs)
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState('resumen');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data stores per tab
  const [plans, setPlans] = useState([]);
  const [tabData, setTabData] = useState({});

  const periodParams = useCallback(() => {
    const p = { period };
    if (period === 'custom' && customFrom && customTo) { p.from = customFrom; p.to = customTo; }
    return p;
  }, [period, customFrom, customTo]);

  const fetchTabData = useCallback(async (tab, params) => {
    try {
      const apiMap = {
        resumen: () => reportsAPI.executiveSummary(),
        ingresos: () => reportsAPI.revenue(params),
        caja: () => reportsAPI.cashReconciliation(params),
        clientes: () => reportsAPI.customers(params),
        ocupacion: () => reportsAPI.occupancy(params),
        sesiones: () => reportsAPI.sessions(params),
        facturacion: () => reportsAPI.invoicesReport(params),
      };
      const fetcher = apiMap[tab];
      if (!fetcher) return null;
      const res = await fetcher();
      return res.data?.data || res.data || null;
    } catch (e) {
      console.error(`Error fetching ${tab}:`, e);
      return null;
    }
  }, []);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const params = periodParams();

    const [plansRes, activeTabData] = await Promise.allSettled([
      plansAPI.list(),
      fetchTabData(activeTab, params),
    ]);

    if (plansRes.status === 'fulfilled') {
      setPlans(plansRes.value.data?.data || plansRes.value.data || []);
    }
    if (activeTabData.status === 'fulfilled') {
      setTabData(prev => ({ ...prev, [activeTab]: activeTabData.value }));
    }

    if (!silent) setLoading(false);
  }, [activeTab, periodParams, fetchTabData]);

  // Initial load + auto-refresh
  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => fetchAll(true), 60000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear cached tab data to force re-fetch
    setTabData({});
    await fetchAll();
    setRefreshing(false);
  };

  const handlePeriodChange = (newPeriod) => {
    if (newPeriod === 'custom') {
      setShowDatePicker(true);
      return;
    }
    setPeriod(newPeriod);
    setShowDatePicker(false);
    setTabData({}); // clear cache on period change
  };

  const handleCustomRange = (from, to) => {
    setCustomFrom(from);
    setCustomTo(to);
    setPeriod('custom');
    setTabData({});
  };

  const currentData = tabData[activeTab] || null;
  const periodLabel = period === 'custom' && customFrom && customTo
    ? `${new Date(customFrom + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })} – ${new Date(customTo + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-indigo-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Centro de Reportes</h2>
            <p className="text-sm text-gray-500">Análisis y métricas del sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" title="Actualizar datos">
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <ExportButton period={period} customFrom={customFrom} customTo={customTo} activeTab={activeTab} />
        </div>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-2 relative">
        {PERIOD_OPTIONS.map(({ key, label }) => (
          <button key={key}
            onClick={() => handlePeriodChange(key)}
            aria-pressed={period === key}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}>
            {key === 'custom' && periodLabel ? periodLabel : label}
          </button>
        ))}
        {showDatePicker && (
          <DateRangePicker
            from={customFrom} to={customTo}
            onChange={handleCustomRange}
            onClose={() => setShowDatePicker(false)}
          />
        )}
      </div>

      {/* Tabs - desktop: buttons, mobile: select */}
      <div>
        {/* Desktop tabs */}
        <div className="hidden sm:flex flex-wrap gap-1 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
          {TABS.map(({ key, label, icon: Ic }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              aria-pressed={activeTab === key}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <Ic size={16} />
              {label}
            </button>
          ))}
        </div>
        {/* Mobile select */}
        <div className="sm:hidden">
          <select value={activeTab} onChange={e => setActiveTab(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            aria-label="Seleccionar pestaña de reporte">
            {TABS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab content */}
      <div id="report-content">
        {activeTab === 'resumen' && <TabResumen data={currentData} loading={loading} />}
        {activeTab === 'ingresos' && <TabIngresos data={currentData} loading={loading} />}
        {activeTab === 'caja' && <TabCaja data={currentData} loading={loading} />}
        {activeTab === 'clientes' && <TabClientes data={currentData} loading={loading} />}
        {activeTab === 'ocupacion' && <TabOcupacion data={currentData} plans={plans} loading={loading} />}
        {activeTab === 'sesiones' && <TabSesiones data={currentData} loading={loading} />}
        {activeTab === 'facturacion' && <TabFacturacion data={currentData} loading={loading} />}
      </div>
    </div>
  );
}
