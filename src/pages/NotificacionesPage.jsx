import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  Bell, Send, Mail, MessageCircle, Smartphone, CheckCircle,
  XCircle, Clock, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Plus, X, FileText, AlertTriangle, CreditCard, CalendarClock,
  Zap, Eye
} from 'lucide-react';
import { notificationsAPI } from '../services/api';
import PushNotificationToggle from '../components/PushNotificationToggle';
import { sendPushNotification } from '../services/pushService';

const CHANNEL_CONFIG = {
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'green' },
  email: { icon: Mail, label: 'Email', color: 'blue' },
  sms: { icon: Smartphone, label: 'SMS', color: 'purple' },
  push: { icon: Bell, label: 'Push', color: 'orange' },
};

const STATUS_CONFIG = {
  sent: { icon: CheckCircle, label: 'Enviado', color: 'green' },
  failed: { icon: XCircle, label: 'Fallido', color: 'red' },
  pending: { icon: Clock, label: 'Pendiente', color: 'yellow' },
};

const TEMPLATE_ICONS = {
  cash_alert: AlertTriangle,
  payment_confirm: CreditCard,
  subscription_expiry: CalendarClock,
};

const TEMPLATE_COLORS = {
  cash_alert: 'red',
  payment_confirm: 'emerald',
  subscription_expiry: 'amber',
};

function StatCard({ label, value, icon: Icon, color = 'gray' }) {
  const colors = {
    green: 'bg-green-50 text-green-700', blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700', yellow: 'bg-yellow-50 text-yellow-700',
    gray: 'bg-gray-50 text-gray-700', purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const limit = 20;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        notificationsAPI.list({
          channel: filterChannel || null,
          status: filterStatus || null,
          limit,
          offset: page * limit,
        }),
        notificationsAPI.stats(),
      ]);
      const listData = listRes.data?.data || {};
      setNotifications(listData.notifications || []);
      setTotal(listData.total || 0);
      setStats(statsRes.data?.data || null);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filterChannel, filterStatus, page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleProcessQueue = async () => {
    try {
      setProcessing(true);
      const res = await notificationsAPI.processQueue();
      const processed = res.data?.data?.processed || 0;
      toast.success(`${processed} email(s) procesado(s)`);
      loadData();
    } catch (err) {
      toast.error('Error procesando cola: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-sm text-gray-500 mt-1">Historial y envio de notificaciones a clientes</p>
        </div>
        <div className="flex gap-2">
          {stats?.pending > 0 && (
            <button onClick={handleProcessQueue} disabled={processing}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-sm">
              <Zap size={16} className={processing ? 'animate-pulse' : ''} />
              {processing ? 'Procesando...' : `Procesar ${stats.pending} pendiente(s)`}
            </button>
          )}
          <button onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
            <Plus size={16} /> Nueva Notificacion
          </button>
        </div>
      </div>

      {/* Push Notification Toggle */}
      <PushNotificationToggle />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Total" value={stats.total} icon={Bell} color="gray" />
          <StatCard label="Enviadas" value={stats.sent} icon={CheckCircle} color="green" />
          <StatCard label="Fallidas" value={stats.failed} icon={XCircle} color="red" />
          <StatCard label="WhatsApp" value={stats.by_channel?.whatsapp || 0} icon={MessageCircle} color="green" />
          <StatCard label="Email" value={stats.by_channel?.email || 0} icon={Mail} color="blue" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap items-center gap-3">
        <Filter size={16} className="text-gray-400" />
        <select value={filterChannel} onChange={e => { setFilterChannel(e.target.value); setPage(0); }}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los canales</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="push">Push</option>
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          <option value="sent">Enviados</option>
          <option value="failed">Fallidos</option>
          <option value="pending">Pendientes</option>
        </select>
        <button onClick={loadData} disabled={loading}
          className="ml-auto flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Canal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Destinatario</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Asunto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Bell size={40} className="mx-auto mb-3 text-gray-200" />
                    <p>No hay notificaciones</p>
                  </td>
                </tr>
              ) : notifications.map(n => {
                const ch = CHANNEL_CONFIG[n.channel] || CHANNEL_CONFIG.push;
                const st = STATUS_CONFIG[n.status] || STATUS_CONFIG.pending;
                const ChIcon = ch.icon;
                const StIcon = st.icon;
                return (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-${ch.color}-600`}>
                        <ChIcon size={14} /> {ch.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{n.recipient}</p>
                      {n.customer_name && (
                        <p className="text-xs text-gray-400">{n.customer_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate max-w-[200px]">{n.subject || n.body_preview || '-'}</p>
                      {n.template_id && (
                        <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-indigo-500">
                          <FileText size={10} /> {n.template_id}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{n.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${st.color}-100 text-${st.color}-700`}>
                        <StIcon size={12} /> {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(n.created_at).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">
              Mostrando {page * limit + 1}-{Math.min((page + 1) * limit, total)} de {total}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <SendNotificationModal onClose={() => setShowSendModal(false)} onSent={loadData} />
      )}
    </div>
  );
}

// ─── SEND MODAL WITH TEMPLATE SUPPORT ────────────────────────────────────────

const TEMPLATE_FIELDS = {
  cash_alert: [
    { key: 'registerName', label: 'Nombre de caja', placeholder: 'Caja Principal', type: 'text' },
    { key: 'operatorName', label: 'Operador', placeholder: 'Juan Perez', type: 'text' },
    { key: 'expectedBalance', label: 'Saldo esperado (RD$)', placeholder: '15000', type: 'number' },
    { key: 'countedBalance', label: 'Saldo contado (RD$)', placeholder: '14500', type: 'number' },
    { key: 'difference', label: 'Diferencia (RD$)', placeholder: '-500', type: 'number' },
  ],
  payment_confirm: [
    { key: 'customerName', label: 'Cliente', placeholder: 'Maria Garcia', type: 'text' },
    { key: 'planName', label: 'Plan / Concepto', placeholder: 'Plan Mensual', type: 'text' },
    { key: 'totalAmount', label: 'Monto total (RD$)', placeholder: '3500', type: 'number' },
    { key: 'subtotal', label: 'Subtotal (RD$)', placeholder: '2966.10', type: 'number' },
    { key: 'taxAmount', label: 'ITBIS (RD$)', placeholder: '533.90', type: 'number' },
    { key: 'paymentMethod', label: 'Metodo de pago', placeholder: 'Efectivo', type: 'text' },
    { key: 'vehiclePlate', label: 'Placa (opcional)', placeholder: 'A123456', type: 'text' },
  ],
  subscription_expiry: [
    { key: 'customerName', label: 'Cliente', placeholder: 'Carlos Ramirez', type: 'text' },
    { key: 'planName', label: 'Plan', placeholder: 'Plan Mensual Premium', type: 'text' },
    { key: 'expiryDate', label: 'Fecha de vencimiento', placeholder: '15/04/2026', type: 'text' },
    { key: 'daysRemaining', label: 'Dias restantes', placeholder: '5', type: 'number' },
    { key: 'pricePerPeriod', label: 'Precio (RD$)', placeholder: '4500', type: 'number' },
    { key: 'vehiclePlate', label: 'Placa (opcional)', placeholder: 'B789012', type: 'text' },
    { key: 'isExpired', label: 'Ya vencida?', type: 'toggle' },
  ],
};

const TEMPLATE_META = [
  { id: 'cash_alert', name: 'Alerta de Cuadre de Caja', desc: 'Notifica diferencias en cierre de caja', color: 'red' },
  { id: 'payment_confirm', name: 'Confirmacion de Pago', desc: 'Recibo de pago para clientes', color: 'emerald' },
  { id: 'subscription_expiry', name: 'Vencimiento de Suscripcion', desc: 'Recordatorio de renovacion', color: 'amber' },
];

function SendNotificationModal({ onClose, onSent }) {
  const [mode, setMode] = useState('manual'); // 'manual' | 'template'
  const [form, setForm] = useState({
    channel: 'email',
    recipient: '',
    subject: '',
    body: '',
    type: 'manual',
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateData, setTemplateData] = useState({});
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const handleSend = async () => {
    if (form.channel === 'push' && mode === 'manual') {
      if (!form.subject || !form.body) {
        toast.error('Titulo y mensaje son requeridos');
        return;
      }
      try {
        setSending(true);
        const result = await sendPushNotification({
          title: form.subject,
          body: form.body,
          target: form.pushTarget || 'all',
          userId: form.pushUserId || undefined,
          role: form.pushRole || undefined,
          url: form.pushUrl || undefined,
          tag: form.pushTag || undefined,
        });
        if (result.success) {
          toast.success('Push notification enviada');
          onSent();
          onClose();
        } else {
          toast.error('Error: ' + (result.error || 'Error desconocido'));
        }
      } catch (err) {
        toast.error('Error: ' + (err.response?.data?.error || err.message));
      } finally {
        setSending(false);
      }
      return;
    }

    if (mode === 'template') {
      if (!selectedTemplate) {
        toast.error('Selecciona un template');
        return;
      }
      if (!form.recipient) {
        toast.error('Destinatario es requerido');
        return;
      }
      try {
        setSending(true);
        // Parse numeric fields
        const parsedData = { ...templateData };
        TEMPLATE_FIELDS[selectedTemplate]?.forEach(f => {
          if (f.type === 'number' && parsedData[f.key]) {
            parsedData[f.key] = parseFloat(parsedData[f.key]);
          }
          if (f.type === 'toggle') {
            parsedData[f.key] = parsedData[f.key] === true || parsedData[f.key] === 'true';
          }
        });

        await notificationsAPI.send({
          channel: 'email',
          recipient: form.recipient,
          templateId: selectedTemplate,
          templateData: parsedData,
          type: selectedTemplate,
        });
        toast.success('Email con template enviado');
        onSent();
        onClose();
      } catch (err) {
        toast.error('Error: ' + (err.response?.data?.error || err.message));
      } finally {
        setSending(false);
      }
    } else {
      if (!form.recipient || !form.body) {
        toast.error('Destinatario y mensaje son requeridos');
        return;
      }
      try {
        setSending(true);
        await notificationsAPI.send(form);
        toast.success('Notificacion enviada');
        onSent();
        onClose();
      } catch (err) {
        toast.error('Error: ' + (err.response?.data?.error || err.message));
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h3 className="text-lg font-semibold">Nueva Notificacion</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setMode('manual')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <Send size={14} className="inline mr-2" />Mensaje Manual
            </button>
            <button onClick={() => setMode('template')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${mode === 'template' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <FileText size={14} className="inline mr-2" />Usar Template
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Recipient (shown for non-push channels) */}
          {(mode === 'template' || form.channel !== 'push') && (
            <div>
              <label className="text-sm font-medium text-gray-700">
                {mode === 'template' ? 'Email destinatario' : (form.channel === 'email' ? 'Email' : 'Telefono')}
              </label>
              <input type={mode === 'template' || form.channel === 'email' ? 'email' : 'tel'}
                value={form.recipient}
                onChange={e => setForm({ ...form, recipient: e.target.value })}
                placeholder={mode === 'template' || form.channel === 'email' ? 'cliente@email.com' : '+18091234567'}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          )}

          {mode === 'manual' ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Canal</label>
                <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="push">Push</option>
                </select>
              </div>
              {form.channel === 'push' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Destino</label>
                    <select value={form.pushTarget || 'all'}
                      onChange={e => setForm({ ...form, pushTarget: e.target.value })}
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="all">Todos los usuarios</option>
                      <option value="role">Por rol</option>
                      <option value="user">Usuario especifico</option>
                    </select>
                  </div>
                  {form.pushTarget === 'role' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Rol</label>
                      <select value={form.pushRole || ''}
                        onChange={e => setForm({ ...form, pushRole: e.target.value })}
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                        <option value="">Seleccionar rol</option>
                        <option value="admin">Administrador</option>
                        <option value="operator">Operador</option>
                        <option value="supervisor">Supervisor</option>
                      </select>
                    </div>
                  )}
                  {form.pushTarget === 'user' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">ID de Usuario</label>
                      <input type="text" value={form.pushUserId || ''}
                        onChange={e => setForm({ ...form, pushUserId: e.target.value })}
                        placeholder="ID del usuario"
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Titulo</label>
                    <input type="text" value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                      placeholder="Titulo de la notificacion"
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">URL (opcional)</label>
                    <input type="text" value={form.pushUrl || ''}
                      onChange={e => setForm({ ...form, pushUrl: e.target.value })}
                      placeholder="/dashboard"
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </>
              )}
              {form.channel === 'email' && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Asunto</label>
                  <input type="text" value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Mensaje</label>
                <textarea value={form.body} rows={4}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  placeholder="Escriba el mensaje..."
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="manual">Manual</option>
                  <option value="payment_reminder">Recordatorio de pago</option>
                  <option value="subscription_expiry">Vencimiento suscripcion</option>
                  <option value="promotion">Promocion</option>
                  <option value="general">General</option>
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Template Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Seleccionar Template</label>
                <div className="grid grid-cols-1 gap-3">
                  {TEMPLATE_META.map(t => {
                    const TIcon = TEMPLATE_ICONS[t.id] || FileText;
                    const isSelected = selectedTemplate === t.id;
                    const colorMap = {
                      red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: 'bg-red-100 text-red-600' },
                      emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', icon: 'bg-emerald-100 text-emerald-600' },
                      amber: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', icon: 'bg-amber-100 text-amber-600' },
                    };
                    const c = colorMap[t.color] || colorMap.amber;
                    return (
                      <button key={t.id} onClick={() => { setSelectedTemplate(t.id); setTemplateData({}); }}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${isSelected ? `${c.bg} ${c.border}` : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className={`p-2 rounded-lg ${isSelected ? c.icon : 'bg-gray-100 text-gray-500'}`}>
                          <TIcon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${isSelected ? c.text : 'text-gray-800'}`}>{t.name}</p>
                          <p className="text-xs text-gray-500 truncate">{t.desc}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle size={18} className={c.text} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Template Fields */}
              {selectedTemplate && TEMPLATE_FIELDS[selectedTemplate] && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm font-medium text-gray-700 border-t pt-3">Datos del Template</p>
                  <div className="grid grid-cols-2 gap-3">
                    {TEMPLATE_FIELDS[selectedTemplate].map(f => (
                      <div key={f.key} className={f.type === 'toggle' ? 'col-span-2' : ''}>
                        <label className="text-xs font-medium text-gray-600">{f.label}</label>
                        {f.type === 'toggle' ? (
                          <label className="mt-1 flex items-center gap-2 cursor-pointer">
                            <input type="checkbox"
                              checked={templateData[f.key] === true}
                              onChange={e => setTemplateData({ ...templateData, [f.key]: e.target.checked })}
                              className="w-4 h-4 rounded text-indigo-600" />
                            <span className="text-sm text-gray-600">Si</span>
                          </label>
                        ) : (
                          <input type={f.type === 'number' ? 'number' : 'text'}
                            step={f.type === 'number' ? '0.01' : undefined}
                            value={templateData[f.key] || ''}
                            onChange={e => setTemplateData({ ...templateData, [f.key]: e.target.value })}
                            placeholder={f.placeholder}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
            <Send size={14} /> {sending ? 'Enviando...' : (mode === 'template' ? 'Enviar con Template' : 'Enviar')}
          </button>
        </div>
      </div>
    </div>
  );
}
