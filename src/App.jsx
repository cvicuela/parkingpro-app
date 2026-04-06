import { lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';
import LoginPage from './pages/LoginPage';

// Lazy load all page components for smaller initial bundle
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ClientesPage = lazy(() => import('./pages/ClientesPage'));
const VehiculosPage = lazy(() => import('./pages/VehiculosPage'));
const PlanesPage = lazy(() => import('./pages/PlanesPage'));
const SuscripcionesPage = lazy(() => import('./pages/SuscripcionesPage'));
const ControlAccesoPage = lazy(() => import('./pages/ControlAccesoPage'));
const PagosPage = lazy(() => import('./pages/PagosPage'));
const ReportesPage = lazy(() => import('./pages/ReportesPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const CajaPage = lazy(() => import('./pages/CajaPage'));
const FacturasPage = lazy(() => import('./pages/FacturasPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const CajaHistorialPage = lazy(() => import('./pages/CajaHistorialPage'));
const GastosPage = lazy(() => import('./pages/GastosPage'));
const IncidentesPage = lazy(() => import('./pages/IncidentesPage'));
const DescuentosPage = lazy(() => import('./pages/DescuentosPage'));
const NotificacionesPage = lazy(() => import('./pages/NotificacionesPage'));
const TerminalesPage = lazy(() => import('./pages/TerminalesPage'));

function ProfileCompletionGuard({ children }) {
  const { user, isProfileIncomplete } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user && isProfileIncomplete() && location.pathname !== '/config') {
      toast.warn('Completa tu perfil para continuar', { toastId: 'profile-incomplete', autoClose: 6000 });
      navigate('/config', { replace: true });
    }
  }, [user, location.pathname]);

  return children;
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function PageWrapper({ name, children }) {
  return <ErrorBoundary pageName={name}>{children}</ErrorBoundary>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><ProfileCompletionGuard><Layout /></ProfileCompletionGuard></ProtectedRoute>}>
        <Route index element={<PageWrapper name="Dashboard"><DashboardPage /></PageWrapper>} />
        <Route path="clientes" element={<PageWrapper name="Clientes"><ClientesPage /></PageWrapper>} />
        <Route path="vehiculos" element={<PageWrapper name="Vehículos"><VehiculosPage /></PageWrapper>} />
        <Route path="planes" element={<PageWrapper name="Planes"><PlanesPage /></PageWrapper>} />
        <Route path="suscripciones" element={<PageWrapper name="Suscripciones"><SuscripcionesPage /></PageWrapper>} />
        <Route path="acceso" element={<PageWrapper name="Control de Acceso"><ControlAccesoPage /></PageWrapper>} />
        <Route path="caja" element={<PageWrapper name="Caja"><CajaPage /></PageWrapper>} />
        <Route path="pagos" element={<PageWrapper name="Pagos"><PagosPage /></PageWrapper>} />
        <Route path="facturas" element={<PageWrapper name="Facturas"><FacturasPage /></PageWrapper>} />
        <Route path="caja/historial" element={<ProtectedRoute roles={['admin','super_admin']}><PageWrapper name="Historial de Cajas"><CajaHistorialPage /></PageWrapper></ProtectedRoute>} />
        <Route path="gastos" element={<ProtectedRoute roles={['admin','super_admin']}><PageWrapper name="Gastos"><GastosPage /></PageWrapper></ProtectedRoute>} />
        <Route path="descuentos" element={<ProtectedRoute roles={['admin','super_admin']}><PageWrapper name="Descuentos"><DescuentosPage /></PageWrapper></ProtectedRoute>} />
        <Route path="incidentes" element={<ProtectedRoute><PageWrapper name="Incidentes"><IncidentesPage /></PageWrapper></ProtectedRoute>} />
        <Route path="notificaciones" element={<ProtectedRoute roles={['admin','super_admin']}><PageWrapper name="Notificaciones"><NotificacionesPage /></PageWrapper></ProtectedRoute>} />
        <Route path="reportes" element={<ProtectedRoute roles={['admin','super_admin']}><PageWrapper name="Reportes"><ReportesPage /></PageWrapper></ProtectedRoute>} />
        <Route path="auditoria" element={<ProtectedRoute roles={['admin','super_admin']}><PageWrapper name="Auditoría"><AuditPage /></PageWrapper></ProtectedRoute>} />
        <Route path="terminales" element={<ProtectedRoute roles={['admin','super_admin']}><PageWrapper name="Terminales"><TerminalesPage /></PageWrapper></ProtectedRoute>} />
        <Route path="config" element={<ProtectedRoute><PageWrapper name="Configuración"><ConfigPage /></PageWrapper></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="colored" />
        <OfflineIndicator />
      </AuthProvider>
    </BrowserRouter>
  );
}
