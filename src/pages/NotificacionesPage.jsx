import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  Bell, Send, Mail, MessageCircle, Smartphone, CheckCircle,
  XCircle, Clock, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Plus, X
} from 'lucide-react';
import { notificationsAPI } from '../services/api';

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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-sm text-gray-500 mt-1">Historial y envío de notificaciones a clientes</p>
        </div>
        <button onClick={() => setShowSendModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> Nueva Notificación
        </button>
      </div>

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

function SendNotificationModal({ onClose, onSent }) {
  const [form, setForm] = useState({
    channel: 'whatsapp',
    recipient: '',
    subject: '',
    body: '',
    type: 'manual',
  });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!form.recipient || !form.body) {
      toast.error('Destinatario y mensaje son requeridos');
      return;
    }
    try {
      setSending(true);
      await notificationsAPI.send(form);
      toast.success('Notificación encolada');
      onSent();
      onClose();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Nueva Notificación</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Canal</label>
            <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">
              {form.channel === 'email' ? 'Email' : 'Teléfono'}
            </label>
            <input type={form.channel === 'email' ? 'email' : 'tel'}
              value={form.recipient}
              onChange={e => setForm({ ...form, recipient: e.target.value })}
              placeholder={form.channel === 'email' ? 'cliente@email.com' : '+18091234567'}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
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
              <option value="subscription_expiry">Vencimiento suscripción</option>
              <option value="promotion">Promoción</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
            <Send size={14} /> {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
