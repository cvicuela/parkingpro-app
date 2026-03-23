import { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import { toast } from 'react-toastify';
import {
  Settings, Save, RotateCw, Building2, Receipt, Shield,
  Bell, Wallet, Globe, ChevronDown, ChevronRight, Plus, Trash2
} from 'lucide-react';

const categoryConfig = {
  general: { label: 'General', icon: Building2, color: 'indigo', description: 'Datos del negocio y moneda' },
  caja: { label: 'Caja Registradora', icon: Wallet, color: 'green', description: 'Umbrales y configuración de caja' },
  facturacion: { label: 'Facturación', icon: Receipt, color: 'blue', description: 'ITBIS, NCF y comprobantes fiscales' },
  antifraude: { label: 'Antifraude', icon: Shield, color: 'red', description: 'Limites de reembolso y proteccion' },
  notificaciones: { label: 'Notificaciones', icon: Bell, color: 'amber', description: 'Email, Telegram y alertas' },
  parqueo: { label: 'Parqueo', icon: Globe, color: 'purple', description: 'Espacios, tolerancia y mora' },
};

const fieldConfig = {
  business_name: { label: 'Nombre del Negocio', type: 'text', placeholder: 'ParkingPro' },
  business_rnc: { label: 'RNC', type: 'text', placeholder: '000-000000-0' },
  business_address: { label: 'Dirección', type: 'text', placeholder: 'Av. Principal #123' },
  business_phone: { label: 'Teléfono', type: 'text', placeholder: '809-000-0000' },
  currency: { label: 'Moneda', type: 'select', options: ['DOP', 'USD', 'EUR'] },
  cash_diff_threshold: { label: 'Umbral diferencia de caja (RD$)', type: 'number', hint: 'Diferencias mayores requieren aprobación del supervisor' },
  multi_register_enabled: { label: 'Multiples cajas simultaneas', type: 'toggle' },
  tax_rate: { label: 'Tasa ITBIS', type: 'number', hint: '0.18 = 18%' },
  refund_limit_operator: { label: 'Limite reembolso por operador (RD$)', type: 'number', hint: 'Maximo que un operador puede reembolsar sin aprobación' },
  refund_daily_multiplier: { label: 'Multiplicador diario de reembolso', type: 'number', hint: 'Tope diario = limite x multiplicador' },
  notification_email_1_enabled: { hidden: true },
  notification_email_1: { label: 'Email 1 (Principal)', type: 'email', placeholder: 'admin@empresa.com', hint: 'Email principal para alertas criticas', toggleKey: 'notification_email_1_enabled' },
  notification_email_2_enabled: { hidden: true },
  notification_email_2: { label: 'Email 2 (Secundario)', type: 'email', placeholder: 'gerente@empresa.com', hint: 'Email secundario para copias', toggleKey: 'notification_email_2_enabled' },
  notification_email_3_enabled: { hidden: true },
  notification_email_3: { label: 'Email 3 (Adicional)', type: 'email', placeholder: 'supervisor@empresa.com', hint: 'Email adicional', toggleKey: 'notification_email_3_enabled' },
  notification_email_4_enabled: { hidden: true },
  notification_email_4: { label: 'Email 4 (Extra)', type: 'email', placeholder: 'alertas@empresa.com', hint: 'Email extra para alertas y reportes', toggleKey: 'notification_email_4_enabled' },
  notification_email_5_enabled: { hidden: true },
  notification_email_5: { label: 'Email 5 (Extra)', type: 'email', placeholder: 'reportes@empresa.com', hint: 'Email extra para notificaciones adicionales', toggleKey: 'notification_email_5_enabled' },
  whatsapp_enabled: { label: 'WhatsApp habilitado', type: 'toggle', hint: 'Activar notificaciones por WhatsApp' },
  email_enabled: { label: 'Email habilitado', type: 'toggle', hint: 'Activar notificaciones por correo electrónico' },
  sms_enabled: { label: 'SMS habilitado', type: 'toggle', hint: 'Activar notificaciones por SMS' },
  parking_name: { label: 'Nombre del Parqueo', type: 'text' },
  total_spaces: { label: 'Total de Espacios', type: 'number' },
  grace_period_hours: { label: 'Periodo de Gracia (horas)', type: 'number' },
  tolerance_minutes: { label: 'Tolerancia (minutos)', type: 'number' },
  late_fee: { label: 'Cargo por Mora (RD$)', type: 'number' },
  payment_retry_attempts: { label: 'Reintentos de Pago', type: 'number' },
};

export default function ConfigPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [editValues, setEditValues] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [hasChanges, setHasChanges] = useState({});

  const fetchSettings = async () => {
    try {
      const { data } = await settingsAPI.list();
      const items = data.data || data || [];
      setSettings(items);
      const vals = {};
      items.forEach(s => {
        const v = s.value;
        vals[s.key] = typeof v === 'string' ? v : (v !== null && v !== undefined ? JSON.stringify(v) : '');
      });
      setEditValues(vals);
      // Cache settings in localStorage for printService (company name, RNC, etc.)
      try { localStorage.setItem('pp_settings', JSON.stringify(vals)); } catch {}
      // Expand all categories that have settings
      const cats = {};
      items.forEach(s => { cats[s.category || 'general'] = true; });
      setExpandedCategories(cats);
    } catch (err) {
      console.error('[ConfigPage] Error loading settings:', err);
      // Try to load from localStorage cache as last resort
      try {
        const cached = JSON.parse(localStorage.getItem('pp_settings') || '{}');
        if (Object.keys(cached).length > 0) {
          setEditValues(cached);
          toast.warning('Cargando configuraciones desde caché local');
        } else {
          toast.error('Error cargando configuraciones: ' + (err.response?.data?.error || err.message || 'Servidor no disponible'));
        }
      } catch {
        toast.error('Error cargando configuraciones: ' + (err.response?.data?.error || err.message || 'Servidor no disponible'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (key) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await settingsAPI.update(key, editValues[key]);
      toast.success(`${fieldConfig[key]?.label || key} actualizado`);
      setHasChanges(prev => ({ ...prev, [key]: false }));
      // Update localStorage cache for printService
      try {
        const cached = JSON.parse(localStorage.getItem('pp_settings') || '{}');
        cached[key] = editValues[key];
        localStorage.setItem('pp_settings', JSON.stringify(cached));
      } catch {}
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar');
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleChange = (key, value) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
    const original = settings.find(s => s.key === key);
    const origVal = original ? (typeof original.value === 'string' ? original.value : JSON.stringify(original.value)) : '';
    setHasChanges(prev => ({ ...prev, [key]: value !== origVal }));
  };

  const handleSaveAll = async () => {
    const changedKeys = Object.keys(hasChanges).filter(k => hasChanges[k]);
    if (changedKeys.length === 0) {
      toast.info('No hay cambios pendientes');
      return;
    }
    for (const key of changedKeys) {
      await handleSave(key);
    }
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Preferred field order within notificaciones category
  const notificacionesOrder = [
    'email_enabled', 'resend_api_key', 'resend_from_email',
    'notification_email_1_enabled', 'notification_email_1',
    'notification_email_2_enabled', 'notification_email_2',
    'notification_email_3_enabled', 'notification_email_3',
    'notification_email_4_enabled', 'notification_email_4',
    'notification_email_5_enabled', 'notification_email_5',
    'telegram_enabled',
    'telegram_phone_1', 'telegram_phone_2', 'telegram_phone_3',
    'sms_enabled', 'whatsapp_enabled',
    'alert_email', 'alert_email_2',
  ];

  const grouped = {};
  settings.forEach(s => {
    const cat = s.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });

  // Sort notificaciones by explicit order
  if (grouped.notificaciones) {
    grouped.notificaciones.sort((a, b) => {
      const ia = notificacionesOrder.indexOf(a.key);
      const ib = notificacionesOrder.indexOf(b.key);
      if (ia === -1 && ib === -1) return a.key.localeCompare(b.key);
      if (ia === -1) return 1;
      if (ib === -1) return 1;
      return ia - ib;
    });
  }

  // Add uncategorized settings to 'parqueo' or 'general'
  const categoryOrder = ['general', 'caja', 'facturacion', 'antifraude', 'notificaciones', 'parqueo'];

  const changedCount = Object.values(hasChanges).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const renderField = (setting) => {
    const key = setting.key;
    const config = fieldConfig[key] || { label: key, type: 'text' };
    const value = editValues[key] ?? '';
    const changed = hasChanges[key];

    // Skip hidden fields (rendered inline with their parent)
    if (config.hidden) return null;

    // Email field with inline blue toggle
    if (config.toggleKey) {
      const toggleVal = editValues[config.toggleKey] ?? 'false';
      const isOn = toggleVal === 'true' || toggleVal === true;
      const toggleChanged = hasChanges[config.toggleKey];
      const anyChanged = changed || toggleChanged;
      const anySaving = saving[key] || saving[config.toggleKey];

      const handleSaveBoth = async () => {
        if (changed) await handleSave(key);
        if (toggleChanged) await handleSave(config.toggleKey);
      };

      return (
        <div key={key} className="flex items-center justify-between py-4 px-5 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="flex-1 mr-4">
            <p className="font-medium text-gray-800">{config.label}</p>
            {(config.hint || setting.description) && (
              <p className="text-xs text-gray-400 mt-0.5">{config.hint || setting.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={value}
              placeholder={config.placeholder || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && anyChanged) handleSaveBoth(); }}
              className={`px-3 py-1.5 border rounded-lg text-sm w-52 focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${changed ? 'border-blue-400 bg-blue-50' : 'border-gray-300'} ${!isOn ? 'opacity-50' : ''}`}
            />
            <button
              onClick={() => {
                const newVal = isOn ? 'false' : 'true';
                handleChange(config.toggleKey, newVal);
              }}
              title={isOn ? 'Desactivar email' : 'Activar email'}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${isOn ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            {anySaving ? (
              <RotateCw size={16} className="animate-spin text-blue-500" />
            ) : anyChanged ? (
              <button onClick={handleSaveBoth}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 flex items-center gap-1">
                <Save size={12} /> Guardar
              </button>
            ) : null}
          </div>
        </div>
      );
    }

    if (config.type === 'toggle') {
      const isOn = value === 'true' || value === true;
      return (
        <div key={key} className="flex items-center justify-between py-4 px-5 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="flex-1">
            <p className="font-medium text-gray-800">{config.label}</p>
            {(config.hint || setting.description) && (
              <p className="text-xs text-gray-400 mt-0.5">{config.hint || setting.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const newVal = isOn ? 'false' : 'true';
                handleChange(key, newVal);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isOn ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOn ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            {changed && (
              <button onClick={() => handleSave(key)} disabled={saving[key]}
                className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                {saving[key] ? <RotateCw size={12} className="animate-spin" /> : <Save size={12} />}
                Guardar
              </button>
            )}
          </div>
        </div>
      );
    }

    if (config.type === 'select') {
      return (
        <div key={key} className="flex items-center justify-between py-4 px-5 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="flex-1">
            <p className="font-medium text-gray-800">{config.label}</p>
            {(config.hint || setting.description) && (
              <p className="text-xs text-gray-400 mt-0.5">{config.hint || setting.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              className={`px-3 py-1.5 border rounded-lg text-sm w-32 focus:ring-2 focus:ring-indigo-500 outline-none ${changed ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'}`}
            >
              {config.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {changed && (
              <button onClick={() => handleSave(key)} disabled={saving[key]}
                className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                {saving[key] ? <RotateCw size={12} className="animate-spin" /> : <Save size={12} />}
                Guardar
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={key} className="flex items-center justify-between py-4 px-5 hover:bg-gray-50 rounded-lg transition-colors">
        <div className="flex-1 mr-4">
          <p className="font-medium text-gray-800">{config.label}</p>
          {(config.hint || setting.description) && (
            <p className="text-xs text-gray-400 mt-0.5">{config.hint || setting.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type={config.type || 'text'}
            value={value}
            placeholder={config.placeholder || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && changed) handleSave(key); }}
            className={`px-3 py-1.5 border rounded-lg text-sm w-52 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors ${changed ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'}`}
          />
          {saving[key] ? (
            <RotateCw size={16} className="animate-spin text-indigo-500" />
          ) : changed ? (
            <button onClick={() => handleSave(key)}
              className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 flex items-center gap-1">
              <Save size={12} /> Guardar
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="text-indigo-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Configuración</h2>
            <p className="text-sm text-gray-500">Administra los parámetros del sistema</p>
          </div>
        </div>
        {changedCount > 0 && (
          <button
            onClick={handleSaveAll}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium shadow-sm"
          >
            <Save size={16} />
            Guardar todo ({changedCount})
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total ajustes', value: settings.length, color: 'indigo' },
          { label: 'Categorias', value: Object.keys(grouped).length, color: 'blue' },
          { label: 'Pendientes', value: changedCount, color: changedCount > 0 ? 'amber' : 'green' },
          { label: 'Estado', value: changedCount > 0 ? 'Con cambios' : 'Sincronizado', color: changedCount > 0 ? 'amber' : 'green' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-3`}>
            <p className={`text-xs text-${color}-600 font-medium uppercase`}>{label}</p>
            <p className={`text-lg font-bold text-${color}-700`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Settings by Category */}
      {settings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Settings size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin configuraciones</h3>
          <p className="text-gray-500">No se encontraron configuraciones en la base de datos.</p>
        </div>
      ) : (
        categoryOrder.filter(cat => grouped[cat]?.length > 0).map(cat => {
          const catConf = categoryConfig[cat] || { label: cat, icon: Settings, color: 'gray', description: '' };
          const CatIcon = catConf.icon;
          const expanded = expandedCategories[cat];
          const catSettings = grouped[cat] || [];
          const catChanges = catSettings.filter(s => hasChanges[s.key]).length;

          return (
            <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-${catConf.color}-100 flex items-center justify-center`}>
                    <CatIcon size={20} className={`text-${catConf.color}-600`} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-800">{catConf.label}</h3>
                    <p className="text-xs text-gray-400">{catConf.description} ({catSettings.length} ajustes)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {catChanges > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                      {catChanges} cambio{catChanges > 1 ? 's' : ''}
                    </span>
                  )}
                  {expanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                </div>
              </button>

              {expanded && (
                <div className="border-t divide-y divide-gray-50">
                  {catSettings.map(setting => renderField(setting))}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Categories without settings */}
      {categoryOrder.filter(cat => !grouped[cat] || grouped[cat].length === 0).length > 0 && (
        Object.keys(grouped).filter(cat => !categoryOrder.includes(cat)).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => toggleCategory('_other')}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Settings size={20} className="text-gray-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-800">Otros</h3>
                  <p className="text-xs text-gray-400">Configuraciónes adicionales</p>
                </div>
              </div>
              {expandedCategories._other ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
            </button>
            {expandedCategories._other && (
              <div className="border-t divide-y divide-gray-50">
                {Object.keys(grouped).filter(cat => !categoryOrder.includes(cat)).flatMap(cat => grouped[cat]).map(setting => renderField(setting))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
