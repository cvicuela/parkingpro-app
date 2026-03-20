import { toast } from 'react-toastify';

const errorMap = {
  'Failed to fetch': 'Sin conexión al servidor.',
  'NetworkError': 'Error de red.',
  'Token no proporcionado': 'Sesión expirada.',
  'Sesión expirada o inválida': 'Sesión expirada.',
  'Token inválido': 'Sesión inválida.',
  'Acceso denegado': 'No tiene permisos.',
  'PGRST': 'Error del servidor.',
};

export const getErrorMessage = (error) => {
  const msg = error?.message || error?.error || String(error);
  for (const [key, value] of Object.entries(errorMap)) {
    if (msg.includes(key)) return value;
  }
  return msg || 'Error inesperado';
};

export const showError = (error, context = '') => {
  const msg = getErrorMessage(error);
  toast.error(context ? `${context}: ${msg}` : msg);
};

export const withRetry = async (fn, { maxRetries = 3, delay = 1000, backoff = 2 } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (error) {
      lastError = error;
      if ((error?.message || '').match(/Token|Acceso|sesión/i)) throw error;
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, delay * Math.pow(backoff, attempt)));
    }
  }
  throw lastError;
};
