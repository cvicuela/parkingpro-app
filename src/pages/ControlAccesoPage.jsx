import { useState, useEffect, useCallback } from 'react';
import { accessAPI, plansAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { toast } from 'react-toastify';
import {
  LogIn, LogOut, Search, Car, Clock, DollarSign, CheckCircle,
  XCircle, AlertTriangle, RefreshCw, QrCode, Printer, X, Filter, Wifi
} from 'lucide-react';
import SessionStatusBadge, { SESSION_STATUS_CONFIG } from '../components/SessionStatusBadge';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function OccupancyPanel({ plans }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-gray-700 mb-3">Ocupacion en Tiempo Real</h3>
      <div className="space-y-3">
        {plans.map((p) => {
          const pct = p.max_capacity > 0 ? Math.round((p.current_occupancy / p.max_capacity) * 100) : 0;
          const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';
          return (
            <div key={p.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{p.name}</span>
                <span className="font-medium">{p.current_occupancy}/{p.max_capacity}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all duration-300 ${color}`}
                  style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ValidationResult({ result, onRegisterEntry, onRegisterExit, onPay, loading }) {
  if (!result) return null;

  const isAllowed = result.allowed;

  return (
    <div className={`rounded-xl p-4 ${isAllowed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        {isAllowed ? <CheckCircle className="text-green-600" size={24} /> : <XCircle className="text-red-600" size={24} />}
        <span className={`font-semibold text-lg ${isAllowed ? 'text-green-800' : 'text-red-800'}`}>
          {result.message}
        </span>
      </div>

      {result.accessType === 'subscription' && result.subscription && (
        <div className="mt-2 space-y-1 text-sm text-gray-600">
          <p><strong>Cliente:</strong> {result.subscription.customer_name}</p>
          <p><strong>Plan:</strong> {result.subscription.plan_name}</p>
          <p><strong>Placa:</strong> {result.subscription.vehicle_plate}</p>
          <p><strong>Valido hasta:</strong> {new Date(result.subscription.valid_until).toLocaleDateString('es-DO')}</p>
        </div>
      )}

      {result.accessType === 'hourly' && result.rates && (
        <div className="mt-2">
          <p className="text-sm text-gray-600 mb-1"><strong>Tarifas por hora:</strong></p>
          <div className="flex gap-2 flex-wrap">
            {result.rates.map((r) => (
              <span key={r.hour_number} className="text-xs bg-white px-2 py-1 rounded border">
                {r.description}: RD$ {r.rate}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.payment && (
        <div className="mt-3 bg-white rounded-lg p-3">
          <p className="font-semibold text-lg text-gray-800">
            Total: RD$ {result.payment.amount?.toFixed(2)}
          </p>
          {result.payment.breakdown?.map((b, i) => (
            <p key={i} className="text-sm text-gray-500">Hora {b.hour}: RD$ {b.rate}</p>
          ))}
          {result.payment.is_free && (
            <p className="text-sm text-green-600 font-medium">Gratis (tolerancia)</p>
          )}
        </div>
      )}

      {result.reason && !isAllowed && (
        <p className="mt-2 text-sm text-red-600">{result.suggestedAction}</p>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex gap-2 flex-wrap">
        {isAllowed && result.nextStep === 'register_entry_event' && (
          <button onClick={onRegisterEntry} disabled={loading}
            className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            <LogIn size={16} /> Registrar Entrada
          </button>
        )}
        {isAllowed && result.nextStep === 'start_parking_session' && (
          <button onClick={onRegisterEntry} disabled={loading}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <LogIn size={16} /> Iniciar Sesion por Hora
          </button>
        )}
        {isAllowed && result.nextStep === 'register_exit_event' && (
          <button onClick={onRegisterExit} disabled={loading}
            className="flex items-center gap-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
            <LogOut size={16} /> Registrar Salida
          </button>
        )}
        {isAllowed && result.nextStep === 'process_payment' && (
          <button onClick={onPay} disabled={loading}
            className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            <DollarSign size={16} /> Cobrar y Registrar Salida
          </button>
        )}
        {isAllowed && result.nextStep === 'end_session' && (
          <button onClick={onRegisterExit} disabled={loading}
            className="flex items-center gap-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">
            <LogOut size={16} /> Registrar Salida Gratis
          </button>
        )}
      </div>
    </div>
  );
}

export default function ControlAccesoPage() {
  const [plate, setPlate] = useState('');
  const [accessType, setAccessType] = useState('entry');
  const [validationResult, setValidationResult] = useState(null);
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [qrModal, setQrModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');

  const fetchOccupancy = useCallback(async () => {
    try {
      const sessionFetcher = statusFilter === 'active'
        ? accessAPI.activeSessions()
        : accessAPI.allSessions({ status: statusFilter || undefined });
      const [plansRes, sessionsRes] = await Promise.allSettled([
        plansAPI.list(),
        sessionFetcher
      ]);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data.data || plansRes.value.data || []);
      if (sessionsRes.status === 'fulfilled') setSessions(sessionsRes.value.data.data || sessionsRes.value.data || []);
    } catch {} finally { setLoadingSessions(false); }
  }, [statusFilter]);

  useEffect(() => {
    fetchOccupancy();
    const interval = setInterval(fetchOccupancy, 2000);

    const socket = connectSocket();
    socket.on('occupancy_update', (data) => {
      if (data.plans) setPlans(data.plans);
    });

    return () => {
      clearInterval(interval);
      disconnectSocket();
    };
  }, [fetchOccupancy]);

  const handleValidate = async () => {
    if (!plate.trim()) { toast.warning('Ingresa una placa'); return; }
    setLoading(true);
    setValidationResult(null);
    try {
      const { data } = await accessAPI.validate({
        vehiclePlate: plate.toUpperCase().trim(),
        type: accessType
      });
      setValidationResult(data.data || data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al validar');
    } finally { setLoading(false); }
  };

  const handleRegisterEntry = async () => {
    setLoading(true);
    try {
      const { data } = await accessAPI.entry({
        vehiclePlate: plate.toUpperCase().trim(),
        validationResult
      });
      toast.success('Entrada registrada');
      if (data.qrCode) {
        setQrModal({
          qr: data.qrCode,
          plate: plate.toUpperCase().trim(),
          time: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
          type: validationResult?.accessType === 'subscription' ? 'Suscripcion' : 'Por hora',
          plan: validationResult?.subscription?.plan_name || validationResult?.plan?.name || ''
        });
      }
      setPlate('');
      setValidationResult(null);
      fetchOccupancy();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar entrada');
    } finally { setLoading(false); }
  };

  const handleRegisterExit = async () => {
    setLoading(true);
    try {
      await accessAPI.exit({
        vehiclePlate: plate.toUpperCase().trim(),
        validationResult
      });
      toast.success('Salida registrada');
      setPlate('');
      setValidationResult(null);
      fetchOccupancy();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar salida');
    } finally { setLoading(false); }
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      if (validationResult?.session?.id) {
        await accessAPI.sessionPayment(validationResult.session.id, {
          amount: validationResult.payment.amount,
          provider: 'cash'
        });
      }
      await accessAPI.exit({
        vehiclePlate: plate.toUpperCase().trim(),
        validationResult
      });
      toast.success(`Pago registrado: RD$ ${validationResult.payment.amount.toFixed(2)}`);
      setPlate('');
      setValidationResult(null);
      fetchOccupancy();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al procesar pago');
    } finally { setLoading(false); }
  };

  const handleEndSession = async (sessionId) => {
    try {
      await accessAPI.endSession(sessionId);
      toast.success('Sesion finalizada');
      fetchOccupancy();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al finalizar sesion');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Control de Acceso</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Access validation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Plate input */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex gap-3 mb-3">
              <button onClick={() => setAccessType('entry')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  accessType === 'entry' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                <LogIn size={18} /> Entrada
              </button>
              <button onClick={() => setAccessType('exit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  accessType === 'exit' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                <LogOut size={18} /> Salida
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                  placeholder="Ingresa la placa del vehiculo..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-mono uppercase"
                />
              </div>
              <button onClick={handleValidate} disabled={loading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                {loading ? <RefreshCw size={20} className="animate-spin" /> : 'Validar'}
              </button>
            </div>
          </div>

          {/* Validation result */}
          <ValidationResult
            result={validationResult}
            onRegisterEntry={handleRegisterEntry}
            onRegisterExit={handleRegisterExit}
            onPay={handlePay}
            loading={loading}
          />

          {/* Active sessions table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Sesiones ({sessions.length})</h3>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="active">Activas</option>
                  <option value="paid">Pagadas</option>
                  <option value="closed">Cerradas</option>
                  <option value="abandoned">Abandonadas</option>
                  <option value="">Todas</option>
                </select>
                <button onClick={fetchOccupancy} className="text-gray-400 hover:text-gray-600">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
            {sessions.length === 0 ? (
              <p className="p-6 text-center text-gray-400">No hay sesiones{statusFilter ? ` ${SESSION_STATUS_CONFIG[statusFilter]?.label?.toLowerCase() || statusFilter}s` : ''}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-sm text-gray-500">
                    <tr>
                      <th className="py-2 px-4">Placa</th>
                      <th className="py-2 px-4">Estado</th>
                      <th className="py-2 px-4">Acceso</th>
                      <th className="py-2 px-4">Entrada</th>
                      <th className="py-2 px-4">Duracion</th>
                      <th className="py-2 px-4">Monto</th>
                      <th className="py-2 px-4">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => {
                      const mins = Math.round(s.minutes_elapsed || 0);
                      const sessionStatus = s.status || 'active';
                      return (
                        <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4 font-mono font-medium">{s.vehicle_plate}</td>
                          <td className="py-2 px-4">
                            <SessionStatusBadge status={sessionStatus} />
                          </td>
                          <td className="py-2 px-4">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                              s.access_method === 'rfid' ? 'bg-indigo-100 text-indigo-700' :
                              s.access_method === 'qr' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {s.access_method === 'rfid' ? <><Wifi size={10} /> RFID</> :
                               s.access_method === 'qr' ? 'QR' : 'Manual'}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-sm">
                            {new Date(s.entry_time).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2 px-4 text-sm">
                            {Math.floor(mins / 60)}h {mins % 60}m
                          </td>
                          <td className="py-2 px-4 text-sm font-medium text-green-600">
                            RD$ {(s.current_amount || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-4">
                            {sessionStatus === 'active' && (
                              <button onClick={() => handleEndSession(s.id)}
                                className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200">
                                Finalizar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Occupancy panel */}
        <div>
          <OccupancyPanel plans={plans} />
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <QrCode className="text-indigo-600" size={24} />
                <h3 className="text-lg font-bold text-gray-800">Ticket de Entrada</h3>
              </div>
              <button onClick={() => setQrModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="text-center space-y-3">
              <img src={qrModal.qr} alt="QR Code" className="mx-auto w-56 h-56" />
              <div className="space-y-1">
                <p className="text-2xl font-mono font-bold text-indigo-700">{qrModal.plate}</p>
                <p className="text-sm text-gray-500">Entrada: {qrModal.time}</p>
                <p className="text-sm text-gray-500">{qrModal.type} {qrModal.plan && `- ${qrModal.plan}`}</p>
              </div>
              <button
                onClick={() => {
                  const w = window.open('', '_blank');
                  w.document.write(`<html><head><title>Ticket ${escapeHtml(qrModal.plate)}</title><style>body{text-align:center;font-family:sans-serif;padding:20px}img{width:250px}h1{font-size:28px;margin:10px 0}</style></head><body><h1>${escapeHtml(qrModal.plate)}</h1><img src="${escapeHtml(qrModal.qr)}" /><p>Entrada: ${escapeHtml(qrModal.time)}</p><p>${escapeHtml(qrModal.type)} ${qrModal.plan ? '- ' + escapeHtml(qrModal.plan) : ''}</p><p style="margin-top:20px;font-size:12px;color:#999">ParkingPro</p><script>setTimeout(()=>window.print(),300)</script></body></html>`);
                  w.document.close();
                }}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Printer size={16} /> Imprimir Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
