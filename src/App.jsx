import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
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

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="vehiculos" element={<VehiculosPage />} />
        <Route path="planes" element={<PlanesPage />} />
        <Route path="suscripciones" element={<SuscripcionesPage />} />
        <Route path="acceso" element={<ControlAccesoPage />} />
        <Route path="caja" element={<CajaPage />} />
        <Route path="pagos" element={<PagosPage />} />
        <Route path="facturas" element={<FacturasPage />} />
        <Route path="caja/historial" element={<ProtectedRoute roles={['admin','super_admin']}><CajaHistorialPage /></ProtectedRoute>} />
        <Route path="gastos" element={<ProtectedRoute roles={['admin','super_admin']}><GastosPage /></ProtectedRoute>} />
        <Route path="incidentes" element={<ProtectedRoute><IncidentesPage /></ProtectedRoute>} />
        <Route path="notificaciones" element={<ProtectedRoute roles={['admin','super_admin']}><NotificacionesPage /></ProtectedRoute>} />
        <Route path="reportes" element={<ProtectedRoute roles={['admin','super_admin']}><ReportesPage /></ProtectedRoute>} />
        <Route path="auditoria" element={<ProtectedRoute roles={['admin','super_admin']}><AuditPage /></ProtectedRoute>} />
        <Route path="config" element={<ProtectedRoute roles={['admin','super_admin']}><ConfigPage /></ProtectedRoute>} />
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
