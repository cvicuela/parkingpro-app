import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Car, CreditCard, Layers,
  ShieldCheck, Receipt, BarChart3, Settings, LogOut, X,
  Wallet, FileText, ShieldAlert, History, TrendingDown, AlertTriangle, Bell
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['operator','admin','super_admin'] },
  { to: '/clientes', icon: Users, label: 'Clientes', roles: ['operator','admin','super_admin'] },
  { to: '/vehiculos', icon: Car, label: 'Vehículos', roles: ['operator','admin','super_admin'] },
  { to: '/planes', icon: Layers, label: 'Planes', roles: ['admin','super_admin'] },
  { to: '/suscripciones', icon: CreditCard, label: 'Suscripciones', roles: ['operator','admin','super_admin'] },
  { to: '/acceso', icon: ShieldCheck, label: 'Control de Acceso', roles: ['operator','admin','super_admin'] },
  { to: '/caja', icon: Wallet, label: 'Caja', roles: ['operator','admin','super_admin'] },
  { to: '/caja/historial', icon: History, label: 'Historial Cajas', roles: ['admin','super_admin'] },
  { to: '/pagos', icon: Receipt, label: 'Pagos', roles: ['operator','admin','super_admin'] },
  { to: '/facturas', icon: FileText, label: 'Facturas', roles: ['operator','admin','super_admin'] },
  { to: '/gastos', icon: TrendingDown, label: 'Gastos', roles: ['admin','super_admin'] },
  { to: '/incidentes', icon: AlertTriangle, label: 'Incidentes', roles: ['operator','admin','super_admin'] },
  { to: '/notificaciones', icon: Bell, label: 'Notificaciones', roles: ['admin','super_admin'] },
  { to: '/reportes', icon: BarChart3, label: 'Reportes', roles: ['admin','super_admin'] },
  { to: '/auditoria', icon: ShieldAlert, label: 'Auditoría', roles: ['admin','super_admin'] },
  { to: '/config', icon: Settings, label: 'Configuración', roles: ['admin','super_admin'] },
];

export default function Sidebar({ open, onClose }) {
  const { logout, user } = useAuth();

  const visibleItems = navItems.filter(item =>
    !item.roles || !user || item.roles.includes(user.role)
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 sidebar-gradient text-white
        transform transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        flex flex-col
      `}>
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-lg">P</div>
            <span className="text-xl font-bold">ParkingPro</span>
          </div>
          <button onClick={onClose} className="md:hidden text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/20">
          {user && (
            <div className="px-4 py-2 mb-2 text-xs text-white/50">
              <p className="truncate">{user.email}</p>
              <p className="capitalize text-white/40">{user.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
