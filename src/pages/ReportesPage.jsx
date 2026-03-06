import { useState, useEffect } from 'react';
import { reportsAPI, plansAPI } from '../services/api';
import { DollarSign, Users, Car, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';

function KPICard({ icon: Icon, label, value, change, color }) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm card-hover">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function ReportesPage() {
  const [dashboard, setDashboard] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportsAPI.dashboard().then(({ data }) => setDashboard(data.data || data)),
      plansAPI.list().then(({ data }) => setPlans(data.data || data || []))
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  const totalCapacity = plans.reduce((s, p) => s + (p.max_capacity || 0), 0);
  const totalOccupancy = plans.reduce((s, p) => s + (p.current_occupancy || 0), 0);
  const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="text-indigo-600" size={28} />
        <h2 className="text-2xl font-bold text-gray-800">Reportes</h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Ingresos del Mes" value={`RD$ ${(dashboard?.revenue || 0).toLocaleString()}`} color="green" />
        <KPICard icon={Users} label="Clientes Activos" value={dashboard?.active_customers || 0} color="indigo" />
        <KPICard icon={Car} label="Ocupacion General" value={`${occupancyPct}%`} color="blue" />
        <KPICard icon={AlertTriangle} label="Cuentas Morosas" value={dashboard?.overdue_count || 0} color="red" />
      </div>

      {/* Occupancy by plan */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Ocupacion por Plan</h3>
        <div className="space-y-4">
          {plans.map((plan) => {
            const pct = plan.max_capacity > 0 ? Math.round((plan.current_occupancy / plan.max_capacity) * 100) : 0;
            const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';
            const available = plan.max_capacity - plan.current_occupancy;

            return (
              <div key={plan.id} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700">{plan.name}</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className={`h-4 rounded-full transition-all ${color} flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max(Math.min(pct, 100), 8)}%` }}>
                      <span className="text-[10px] text-white font-bold">{pct}%</span>
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right text-sm text-gray-500">
                  {plan.current_occupancy}/{plan.max_capacity}
                </div>
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

      {/* Summary table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Resumen de Planes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-sm text-gray-500">
              <tr>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Precio Base</th>
                <th className="py-3 px-4">Capacidad</th>
                <th className="py-3 px-4">Ocupados</th>
                <th className="py-3 px-4">Disponibles</th>
                <th className="py-3 px-4">% Uso</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => {
                const pct = plan.max_capacity > 0 ? Math.round((plan.current_occupancy / plan.max_capacity) * 100) : 0;
                return (
                  <tr key={plan.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium">{plan.name}</td>
                    <td className="py-3 px-4 text-sm capitalize">{plan.type}</td>
                    <td className="py-3 px-4 text-sm">RD$ {parseFloat(plan.base_price).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">{plan.max_capacity}</td>
                    <td className="py-3 px-4 text-sm">{plan.current_occupancy}</td>
                    <td className="py-3 px-4 text-sm">{plan.max_capacity - plan.current_occupancy}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-green-600'}`}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
