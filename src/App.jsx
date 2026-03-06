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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
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
        <Route path="pagos" element={<PagosPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="config" element={<ConfigPage />} />
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
