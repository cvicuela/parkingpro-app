const dateFormatter = new Intl.DateTimeFormat('es-DO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-DO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('es-DO', {
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(date) {
  if (!date) return '-';
  return dateFormatter.format(new Date(date));
}

export function formatDateTime(date) {
  if (!date) return '-';
  return dateTimeFormatter.format(new Date(date));
}

export function formatTime(date) {
  if (!date) return '-';
  return timeFormatter.format(new Date(date));
}
