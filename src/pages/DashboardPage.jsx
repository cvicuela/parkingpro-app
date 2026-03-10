import { useState, useEffect, useCallback } from 'react';
import { reportsAPI, plansAPI, accessAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { DollarSign, Users, Car, AlertTriangle, TrendingUp } from 'lucide-react';
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

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, plansRes, sessionsRes] = await Promise.allSettled([
        reportsAPI.dashboard(),
        plansAPI.list(),
        accessAPI.activeSessions(),
      ]);

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data.data || dashRes.value.data;
        // Normalize: backend sends camelCase, frontend uses snake_case
        setDashboard({
          revenue: d.revenue ?? d.total_revenue ?? 0,
          active_customers: d.activeCustomers ?? d.active_customers ?? 0,
          total_subscriptions: d.totalSubscriptions ?? d.total_subscriptions ?? 0,
          overdue_count: d.overdueCount ?? d.overdue_count ?? 0,
        });
      }
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data.data || plansRes.value.data || []);
      if (sessionsRes.status === 'fulfilled') setSessions(sessionsRes.value.data.data || sessionsRes.value.data || []);
    } catch {} finally {
      setLoading(false);
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
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

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
