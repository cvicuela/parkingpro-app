import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsAPI, plansAPI, accessAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { DollarSign, Users, Car, AlertTriangle, TrendingUp, LogIn, LogOut } from 'lucide-react';
import PushNotificationToggle from '../components/PushNotificationToggle';
import SessionStatusBadge from '../components/SessionStatusBadge';
import { SkeletonKPI, SkeletonTable } from '../components/SkeletonLoader';
import { formatTime } from '../services/formatDate';

function StatCard({ icon: Icon, label, value, color, subtext }) {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm card-hover">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function OccupancyBar({ plan }) {
  const percentage = plan.max_capacity > 0
    ? Math.round((plan.current_occupancy / plan.max_capacity) * 100)
    : 0;
  const barColor = percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-gray-700">{plan.name}</span>
        <span className="text-sm text-gray-500">
          {plan.current_occupancy}/{plan.max_capacity}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">{percentage}% ocupado</span>
        <span className="text-xs text-gray-400">
          {plan.max_capacity - plan.current_occupancy} disponibles
        </span>
      </div>
    </div>
  );
}

function ActiveSessionRow({ session }) {
  const minutes = Math.round(session.minutes_elapsed || 0);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4 font-mono font-medium">{session.vehicle_plate}</td>
      <td className="py-3 px-4">
        <SessionStatusBadge status={session.status || 'active'} />
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">
        {formatTime(session.entry_time)}
      </td>
      <td className="py-3 px-4 text-sm">{hours}h {mins}m</td>
      <td className="py-3 px-4 text-sm font-medium text-green-600">
        RD$ {(session.current_amount || 0).toFixed(2)}
      </td>
    </tr>
  );
}

// Today's Performance Bar
function TodayPerformanceBar({ todayStats }) {
  if (!todayStats) return null;
  const { entries = 0, exits = 0, revenue = 0 } = todayStats;

  return (
    <div className="bg-indigo-600 text-white rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm shadow-sm">
      <span className="font-semibold text-indigo-200 uppercase tracking-wide text-xs">Hoy</span>
      <span className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <strong>{entries}</strong>
        <span className="text-indigo-200">entradas</span>
      </span>
      <span className="hidden sm:block text-indigo-400">|</span>
      <span className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <strong>{exits}</strong>
        <span className="text-indigo-200">salidas</span>
      </span>
      <span className="hidden sm:block text-indigo-400">|</span>
      <span className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <strong>RD$ {revenue.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
      </span>
    </div>
  );
}

// Revenue Trend — inline SVG bar chart for last 7 days
function RevenueTrendChart({ weekData }) {
  if (!weekData || weekData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Tendencia de Ingresos (7 días)</h3>
        <p className="text-sm text-gray-400 text-center py-6">Sin datos disponibles</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...weekData.map((d) => d.revenue), 1);
  const chartH = 80;
  const barW = 28;
  const gap = 10;
  const chartW = weekData.length * (barW + gap) - gap;
  const labelH = 20;
  const totalH = chartH + labelH + 8;

  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Tendencia de Ingresos (7 días)</h3>
        <span className="text-xs text-gray-400">Últimos 7 días</span>
      </div>
      <div className="overflow-x-auto">
        <svg
          width={chartW}
          height={totalH}
          viewBox={`0 0 ${chartW} ${totalH}`}
          className="block mx-auto"
          role="img"
          aria-label="Gráfico de ingresos últimos 7 días"
        >
          {weekData.map((day, i) => {
            const barH = maxRevenue > 0 ? Math.max(4, Math.round((day.revenue / maxRevenue) * chartH)) : 4;
            const x = i * (barW + gap);
            const y = chartH - barH;
            const isToday = i === weekData.length - 1;
            const barColor = isToday ? '#4f46e5' : '#a5b4fc';
            const labelDate = new Date(day.date);
            const label = dayLabels[labelDate.getDay()];

            return (
              <g key={day.date}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={4}
                  fill={barColor}
                />
                <title>
                  {day.date}: RD$ {day.revenue.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </title>
                <text
                  x={x + barW / 2}
                  y={chartH + labelH}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isToday ? '#4f46e5' : '#9ca3af'}
                  fontWeight={isToday ? '600' : '400'}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-200" />
          Días anteriores
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-indigo-600" />
          Hoy
        </span>
      </div>
    </div>
  );
}

// Collection Rate circular indicator
function CollectionRateIndicator({ rate }) {
  const safeRate = typeof rate === 'number' ? Math.min(100, Math.max(0, rate)) : null;

  if (safeRate === null) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-xs text-gray-400 font-medium">N/A</span>
        </div>
        <div>
          <p className="text-sm text-gray-500">Tasa de Cobro</p>
          <p className="text-2xl font-bold text-gray-400">—</p>
          <p className="text-xs text-gray-400">Sin datos</p>
        </div>
      </div>
    );
  }

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeRate / 100) * circumference;

  let trackColor, fillColor, textColor, statusLabel;
  if (safeRate >= 95) {
    trackColor = '#dcfce7';
    fillColor = '#22c55e';
    textColor = 'text-green-600';
    statusLabel = 'Excelente';
  } else if (safeRate >= 80) {
    trackColor = '#fef3c7';
    fillColor = '#f59e0b';
    textColor = 'text-amber-600';
    statusLabel = 'Aceptable';
  } else {
    trackColor = '#fee2e2';
    fillColor = '#ef4444';
    textColor = 'text-red-600';
    statusLabel = 'Bajo';
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r={radius} fill="none" stroke={trackColor} strokeWidth="6" />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div>
        <p className="text-sm text-gray-500">Tasa de Cobro</p>
        <p className={`text-2xl font-bold ${textColor}`}>{safeRate.toFixed(1)}%</p>
        <p className={`text-xs font-medium ${textColor}`}>{statusLabel}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState(null);
  const [weekRevenue, setWeekRevenue] = useState([]);
  const [collectionRate, setCollectionRate] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, plansRes, sessionsRes] = await Promise.allSettled([
        reportsAPI.dashboard(),
        plansAPI.list(),
        accessAPI.activeSessions(),
      ]);

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data.data || dashRes.value.data;
        setDashboard({
          revenue: d.revenue ?? d.total_revenue ?? 0,
          active_customers: d.activeCustomers ?? d.active_customers ?? 0,
          total_subscriptions: d.totalSubscriptions ?? d.total_subscriptions ?? 0,
          overdue_count: d.overdueCount ?? d.overdue_count ?? 0,
        });

        // Extract today stats if backend includes them
        const todayEntries = d.todayEntries ?? d.today_entries ?? null;
        const todayExits = d.todayExits ?? d.today_exits ?? null;
        const todayRevenue = d.todayRevenue ?? d.today_revenue ?? null;
        if (todayEntries !== null || todayRevenue !== null) {
          setTodayStats({
            entries: todayEntries ?? 0,
            exits: todayExits ?? 0,
            revenue: todayRevenue ?? 0,
          });
        }

        // Extract collection rate
        const rate = d.collectionRate ?? d.collection_rate ?? null;
        if (rate !== null) setCollectionRate(Number(rate));
      }
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data.data || plansRes.value.data || []);
      if (sessionsRes.status === 'fulfilled') setSessions(sessionsRes.value.data.data || sessionsRes.value.data || []);
    } catch {
      // silently degrade — data remains as-is from previous fetch or null
    } finally {
      setLoading(false);
    }

    // Fetch weekly revenue separately — non-blocking
    try {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      const fmt = (d) => d.toISOString().slice(0, 10);
      const revRes = await reportsAPI.revenue({ from: fmt(from), to: fmt(today), group_by: 'day' });
      const raw = revRes.data?.data || revRes.data || [];
      if (Array.isArray(raw) && raw.length > 0) {
        // Normalise: ensure 7 days, filling gaps with 0
        const map = {};
        raw.forEach((r) => {
          const key = r.date || r.day || r.period;
          if (key) map[key] = Number(r.revenue ?? r.total ?? r.amount ?? 0);
        });
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = fmt(d);
          days.push({ date: key, revenue: map[key] ?? 0 });
        }
        setWeekRevenue(days);
      }
    } catch {
      // revenue trend unavailable — chart shows fallback
    }

    // Fetch today stats from sessions endpoint if not in dashboard response
    try {
      const histRes = await accessAPI.history({
        from: new Date().toISOString().slice(0, 10),
        to: new Date().toISOString().slice(0, 10),
        limit: 500,
      });
      const hist = histRes.data?.data || histRes.data || [];
      if (Array.isArray(hist)) {
        const entries = hist.filter((r) => r.type === 'entry' || r.event_type === 'entry').length;
        const exits = hist.filter((r) => r.type === 'exit' || r.event_type === 'exit').length;
        const revenue = hist.reduce((sum, r) => sum + Number(r.amount ?? r.revenue ?? 0), 0);
        setTodayStats((prev) => prev ?? { entries, exits, revenue });
      }
    } catch {
      // today stats fallback: derive from active sessions count
      setTodayStats((prev) => prev ?? null);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);

    const socket = connectSocket();
    socket.on('occupancy_update', (data) => {
      if (data.plans) setPlans(data.plans);
    });
    socket.on('session_update', (data) => {
      if (data.sessions) setSessions(data.sessions);
    });

    return () => {
      clearInterval(interval);
      disconnectSocket();
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <SkeletonKPI count={4} />
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row with Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <PushNotificationToggle compact />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/acceso')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <LogIn size={16} />
            Nueva Entrada
          </button>
          <button
            onClick={() => navigate('/acceso')}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm border border-gray-200"
          >
            <LogOut size={16} />
            Registrar Salida
          </button>
        </div>
      </div>

      {/* Today's Performance Bar */}
      {todayStats && <TodayPerformanceBar todayStats={todayStats} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Ingresos del Mes"
          value={`RD$ ${(dashboard?.revenue || 0).toLocaleString()}`}
          color="green"
        />
        <StatCard
          icon={Users}
          label="Clientes Activos"
          value={dashboard?.active_customers || 0}
          color="indigo"
        />
        <StatCard
          icon={Car}
          label="Vehículos Activos"
          value={sessions.length}
          color="blue"
          subtext="Sesiones activas ahora"
        />
        <StatCard
          icon={AlertTriangle}
          label="Morosos"
          value={dashboard?.overdue_count || 0}
          color="red"
        />
      </div>

      {/* Revenue Trend */}
      <RevenueTrendChart weekData={weekRevenue} />

      {/* Secondary Stats — Collection Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <CollectionRateIndicator rate={collectionRate} />
      </div>

      {/* Occupancy Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Ocupación por Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <OccupancyBar key={plan.id} plan={plan} />
          ))}
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-700">
            Sesiones Activas ({sessions.length})
          </h3>
          <div className="flex items-center gap-1 text-xs text-green-600">
            <TrendingUp size={14} /> En tiempo real
          </div>
        </div>
        {sessions.length === 0 ? (
          <p className="p-6 text-center text-gray-400">No hay sesiones activas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-sm text-gray-500">
                <tr>
                  <th className="py-2 px-4">Placa</th>
                  <th className="py-2 px-4">Estado</th>
                  <th className="py-2 px-4">Entrada</th>
                  <th className="py-2 px-4">Duración</th>
                  <th className="py-2 px-4">Monto Actual</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 10).map((s) => (
                  <ActiveSessionRow key={s.id} session={s} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
