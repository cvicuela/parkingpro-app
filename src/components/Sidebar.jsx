import { memo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Car, CreditCard, Layers,
  ShieldCheck, Receipt, BarChart3, Settings, LogOut, X,
  Wallet, FileText, ShieldAlert, History, TrendingDown, AlertTriangle, Bell, Monitor,
  ChevronDown
} from 'lucide-react';

const navGroups = [
  {
    id: 'operations',
    label: 'Operaciones',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['operator','admin','super_admin'], bold: true },
      { to: '/acceso', icon: ShieldCheck, label: 'Control de Acceso', roles: ['operator','admin','super_admin'] },
      { to: '/incidentes', icon: AlertTriangle, label: 'Incidentes', roles: ['operator','admin','super_admin'] },
    ],
  },
  {
    id: 'clients',
    label: 'Clientes y Vehículos',
    items: [
      { to: '/clientes', icon: Users, label: 'Clientes', roles: ['operator','admin','super_admin'] },
      { to: '/vehiculos', icon: Car, label: 'Vehículos', roles: ['operator','admin','super_admin'] },
      { to: '/planes', icon: Layers, label: 'Planes', roles: ['admin','super_admin'] },
      { to: '/suscripciones', icon: CreditCard, label: 'Suscripciones', roles: ['operator','admin','super_admin'] },
    ],
  },
  {
    id: 'billing',
    label: 'Caja y Facturación',
    items: [
      { to: '/caja', icon: Wallet, label: 'Caja', roles: ['operator','admin','super_admin'] },
      { to: '/caja/historial', icon: History, label: 'Historial Cajas', roles: ['admin','super_admin'] },
      { to: '/pagos', icon: Receipt, label: 'Pagos', roles: ['operator','admin','super_admin'] },
      { to: '/facturas', icon: FileText, label: 'Facturas', roles: ['operator','admin','super_admin'] },
      { to: '/gastos', icon: TrendingDown, label: 'Gastos', roles: ['admin','super_admin'] },
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    items: [
      { to: '/reportes', icon: BarChart3, label: 'Reportes', roles: ['admin','super_admin'] },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    items: [
      { to: '/notificaciones', icon: Bell, label: 'Notificaciones', roles: ['admin','super_admin'] },
      { to: '/terminales', icon: Monitor, label: 'Terminales', roles: ['admin','super_admin'] },
      { to: '/auditoria', icon: ShieldAlert, label: 'Auditoría', roles: ['admin','super_admin'] },
      { to: '/config', icon: Settings, label: 'Configuración', roles: ['admin','super_admin'] },
    ],
  },
];

function NavGroup({ group, userRole, onClose, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);

  const visibleItems = group.items.filter(
    item => !item.roles || item.roles.includes(userRole)
  );

  if (visibleItems.length === 0) return null;

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`nav-group-${group.id}`}
        className="flex items-center justify-between w-full px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors"
      >
        <span>{group.label}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={`nav-group-${group.id}`} className="space-y-0.5" role="group" aria-label={group.label}>
          {visibleItems.map(({ to, icon: Icon, label, bold }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors text-sm ${
                  isActive
                    ? 'bg-white/20 text-white font-bold'
                    : bold
                      ? 'text-white font-bold hover:bg-white/10'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              <span className={bold ? 'text-[13px] tracking-wide uppercase' : ''}>{label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(function Sidebar({ open, onClose }) {
  const { logout, user } = useAuth();

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
          <button onClick={onClose} className="md:hidden text-white/80 hover:text-white" aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto" role="navigation" aria-label="Navegación principal">
          {navGroups.map((group, idx) => (
            <NavGroup
              key={group.id}
              group={group}
              userRole={user?.role}
              onClose={onClose}
              defaultOpen={idx < 3}
            />
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
});
