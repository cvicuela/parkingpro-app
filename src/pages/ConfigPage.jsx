import { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Settings, Save, RotateCw } from 'lucide-react';

const settingLabels = {
  parking_name: { label: 'Nombre del Parqueo', type: 'text' },
  total_spaces: { label: 'Total de Espacios', type: 'number' },
  grace_period_hours: { label: 'Periodo de Gracia (horas)', type: 'number' },
  payment_retry_attempts: { label: 'Reintentos de Pago', type: 'number' },
  late_fee: { label: 'Cargo por Mora (RD$)', type: 'number' },
  tolerance_minutes: { label: 'Tolerancia (minutos)', type: 'number' },
  tax_rate: { label: 'Tasa de Impuesto (ITBIS)', type: 'number' },
};

export default function ConfigPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  const fetchSettings = async () => {
    try {
      const { data } = await settingsAPI.list();
      setSettings(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleUpdate = async (key, value) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await settingsAPI.update(key, value);
      toast.success(`${key} actualizado`);
      fetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="text-indigo-600" size={28} />
        <h2 className="text-2xl font-bold text-gray-800">Configuracion</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {settings.length === 0 ? (
          <div className="p-8">
            <p className="text-gray-500 text-center mb-4">No se encontraron configuraciones en el servidor.</p>
            <p className="text-sm text-gray-400 text-center">
              Los ajustes se configuran a traves de las variables de entorno del backend (.env).
            </p>

            <div className="mt-6 space-y-3">
              {Object.entries(settingLabels).map(([key, config]) => (
                <div key={key} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-700">{config.label}</p>
                    <p className="text-xs text-gray-400">{key}</p>
                  </div>
                  <span className="text-sm text-gray-500">Configurado en .env</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          settings.map((setting) => {
            const config = settingLabels[setting.key] || { label: setting.key, type: 'text' };
            const value = typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value);

            return (
              <div key={setting.id || setting.key} className="flex items-center justify-between py-4 px-6">
                <div>
                  <p className="font-medium text-gray-700">{config.label}</p>
                  <p className="text-xs text-gray-400">{setting.description || setting.key}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={config.type}
                    defaultValue={value}
                    className="px-3 py-1.5 border rounded-lg text-sm w-48 focus:ring-2 focus:ring-indigo-500 outline-none"
                    onBlur={(e) => {
                      if (e.target.value !== value) {
                        handleUpdate(setting.key, config.type === 'number' ? parseFloat(e.target.value) : e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdate(setting.key, config.type === 'number' ? parseFloat(e.target.value) : e.target.value);
                      }
                    }}
                  />
                  {saving[setting.key] && <RotateCw size={14} className="animate-spin text-indigo-500" />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
