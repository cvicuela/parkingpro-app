import axios from 'axios';
import { offlineQueue } from './offlineQueue';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pp_token');
      localStorage.removeItem('pp_user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Queue failed mutations when offline
    if (!navigator.onLine && error.config && ['post', 'put', 'patch', 'delete'].includes(error.config.method)) {
      offlineQueue.add({
        method: error.config.method,
        url: error.config.url,
        data: error.config.data ? JSON.parse(error.config.data) : undefined
      });
      return Promise.resolve({ data: { success: true, offline: true, message: 'Guardado offline - se sincronizara al reconectar' } });
    }

    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Customers
export const customersAPI = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.patch(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Vehicles
export const vehiclesAPI = {
  list: (params) => api.get('/vehicles', { params }),
  get: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.patch(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
  findByPlate: (plate) => api.get(`/vehicles/plate/${plate}`),
};

// Plans
export const plansAPI = {
  list: () => api.get('/plans'),
  get: (id) => api.get(`/plans/${id}`),
  create: (data) => api.post('/plans', data),
  update: (id, data) => api.patch(`/plans/${id}`, data),
  delete: (id) => api.delete(`/plans/${id}`),
  occupancy: (id) => api.get(`/plans/${id}/occupancy`),
  getHourlyRates: (planId) => api.get(`/plans/hourly/rates/${planId}`),
  updateHourlyRates: (planId, rates) => api.put(`/plans/hourly/rates/${planId}`, { rates }),
  calculateHourly: (data) => api.post('/plans/hourly/calculate', data),
};

// Subscriptions
export const subscriptionsAPI = {
  list: (params) => api.get('/subscriptions', { params }),
  get: (id) => api.get(`/subscriptions/${id}`),
  create: (data) => api.post('/subscriptions', data),
  update: (id, data) => api.patch(`/subscriptions/${id}`, data),
  cancel: (id) => api.delete(`/subscriptions/${id}`),
  suspend: (id) => api.post(`/subscriptions/${id}/suspend`),
  reactivate: (id) => api.post(`/subscriptions/${id}/reactivate`),
  qr: (id) => api.get(`/subscriptions/${id}/qr`),
};

// Access Control
export const accessAPI = {
  validate: (data) => api.post('/access/validate', data),
  entry: (data) => api.post('/access/entry', data),
  exit: (data) => api.post('/access/exit', data),
  history: (params) => api.get('/access/history', { params }),
  activeSessions: () => api.get('/access/sessions/active'),
  sessionByPlate: (plate) => api.get(`/access/sessions/${plate}`),
  endSession: (id) => api.post(`/access/sessions/${id}/end`),
  sessionPayment: (id, data) => api.post(`/access/sessions/${id}/payment`, data),
};

// Payments
export const paymentsAPI = {
  list: (params) => api.get('/payments', { params }),
  get: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  refund: (id) => api.post(`/payments/${id}/refund`),
};

// Reports
export const reportsAPI = {
  dashboard: () => api.get('/reports/dashboard'),
  activeVehicles: () => api.get('/reports/active-vehicles'),
};

// Settings
export const settingsAPI = {
  list: () => api.get('/settings'),
  get: (key) => api.get(`/settings/${key}`),
  update: (key, value) => api.patch(`/settings/${key}`, { value }),
};

export default api;
