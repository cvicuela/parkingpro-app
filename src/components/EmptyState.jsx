import { BarChart3, Car, Users, DollarSign, FileText, Clock, Wallet } from 'lucide-react';

const icons = {
  chart: BarChart3,
  car: Car,
  users: Users,
  money: DollarSign,
  invoice: FileText,
  session: Clock,
  cash: Wallet,
};

export default function EmptyState({ type = 'chart', title, subtitle }) {
  const Icon = icons[type] || BarChart3;
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon size={32} className="text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-500 mb-1">
        {title || 'Sin datos para este período'}
      </p>
      <p className="text-xs text-gray-400">
        {subtitle || 'Intenta seleccionar un rango de fechas diferente'}
      </p>
    </div>
  );
}
