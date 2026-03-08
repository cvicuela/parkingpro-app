export const SESSION_STATUS_CONFIG = {
  active:    { label: 'Activa',     class: 'bg-green-100 text-green-700' },
  paid:      { label: 'Pagada',     class: 'bg-blue-100 text-blue-700' },
  closed:    { label: 'Cerrada',    class: 'bg-gray-100 text-gray-700' },
  abandoned: { label: 'Abandonada', class: 'bg-amber-100 text-amber-700' },
};

export default function SessionStatusBadge({ status }) {
  const config = SESSION_STATUS_CONFIG[status] || { label: status || 'Desconocido', class: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.class}`}>
      {config.label}
    </span>
  );
}
