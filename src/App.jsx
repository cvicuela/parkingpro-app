import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientesPage from './pages/ClientesPage';
import VehiculosPage from './pages/VehiculosPage';
import PlanesPage from './pages/PlanesPage';
import SuscripcionesPage from './pages/SuscripcionesPage';
import ControlAccesoPage from './pages/ControlAccesoPage';
import PagosPage from './pages/PagosPage';
import ReportesPage from './pages/ReportesPage';
import ConfigPage from './pages/ConfigPage';
import CajaPage from './pages/CajaPage';
import FacturasPage from './pages/FacturasPage';
import AuditPage from './pages/AuditPage';
import CajaHistorialPage from './pages/CajaHistorialPage';
import GastosPage from './pages/GastosPage';
import IncidentesPage from './pages/IncidentesPage';
import NotificacionesPage from './pages/NotificacionesPage';
import TerminalesPage from './pages/TerminalesPage';

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
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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
        <Route path="incidentes" element={<ProtectedRoute><PageWrapper name="Incidentes"><IncidentesPage /></PageWrapper></ProtectedRoute>} />
        <Route path="notificaciones" element={<ProtectedRoute roles={['admin','super_admin']}><PageWrapper name="Notificaciones"><NotificacionesPage /></PageWrapper></ProtectedRoute>} />
        <Route path="reportes" element={<ProtectedRoute roles={['admin','super_admin']}><PageWrapper name="Reportes"><ReportesPage /></PageWrapper></ProtectedRoute>} />
        <Route path="auditoria" element={<ProtectedRoute roles={['admin','super_admin']}><PageWrapper name="Auditoría"><AuditPage /></PageWrapper></ProtectedRoute>} />
        <Route path="terminales" element={<ProtectedRoute roles={['admin','super_admin']}><PageWrapper name="Terminales"><TerminalesPage /></PageWrapper></ProtectedRoute>} />
        <Route path="config" element={<ProtectedRoute roles={['admin','super_admin']}><PageWrapper name="Configuración"><ConfigPage /></PageWrapper></ProtectedRoute>} />
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
      </AuthProvider>
    </BrowserRouter>
  );
}
