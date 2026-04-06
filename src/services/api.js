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
      await offlineQueue.enqueue({
        url:     error.config.url,
        method:  error.config.method,
        data:    error.config.data ? JSON.parse(error.config.data) : undefined,
        headers: error.config.headers ? { Authorization: error.config.headers.Authorization } : {},
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
  updateProfile: (data) => api.patch('/auth/profile', data),
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
  allSessions: (params) => api.get('/access/sessions', { params }),
  sessionByPlate: (plate) => api.get(`/access/sessions/${plate}`),
  endSession: (id) => api.post(`/access/sessions/${id}/end`),
  sessionPayment: (id, data) => api.post(`/access/sessions/${id}/payment`, data),
  abandonSession: (id) => api.post(`/access/sessions/${id}/abandon`),
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
  executiveSummary: () => api.get('/reports/executive-summary'),
  revenue: (params) => api.get('/reports/revenue', { params }),
  revenueByOperator: (params) => api.get('/reports/revenue-by-operator', { params }),
  cashReconciliation: (params) => api.get('/reports/cash-reconciliation', { params }),
  customers: (params) => api.get('/reports/customers', { params }),
  occupancy: (params) => api.get('/reports/occupancy', { params }),
  sessions: (params) => api.get('/reports/sessions', { params }),
  invoicesReport: (params) => api.get('/reports/invoices', { params }),
  incidents: (params) => api.get('/reports/incidents', { params }),
  revenueDaily: (params) => api.get('/reports/revenue-daily', { params }),
  todaySummary: () => api.get('/reports/today-summary'),
  occupancyByHour: (params) => api.get('/reports/occupancy-by-hour', { params }),
  revenueByMethod: (params) => api.get('/reports/revenue-by-method', { params }),
  topCustomers: (params) => api.get('/reports/top-customers', { params }),
  exportCsv: (type, params) => api.get(`/reports/export/${type}`, { params: { ...params, format: 'json' } }),
};

// Settings
export const settingsAPI = {
  list: () => api.get('/settings'),
  get: (key) => api.get(`/settings/${key}`),
  update: (key, value) => api.patch(`/settings/${key}`, { value }),
};

export default api;

// Cash Registers
export const cashAPI = {
  open: (data) => api.post('/cash-registers/open', data),
  active: () => api.get('/cash-registers/active'),
  close: (id, data) => api.post(`/cash-registers/${id}/close`, data),
  approve: (id, data) => api.post(`/cash-registers/${id}/approve`, data),
  transactions: (id) => api.get(`/cash-registers/${id}/transactions`),
  history: (params) => api.get('/cash-registers/history', { params }),
  limits: () => api.get('/cash-registers/limits'),
};

// Invoices
export const invoicesAPI = {
  list: (params) => api.get('/invoices', { params }),
  get: (id) => api.get(`/invoices/${id}`),
  stats: (params) => api.get('/invoices/stats', { params }),
  fromPayment: (paymentId) => api.post(`/invoices/from-payment/${paymentId}`),
};

// Audit Log
export const auditAPI = {
  list: (params) => api.get('/audit', { params }),
  actions: () => api.get('/audit/actions'),
};

// RFID Cards
export const rfidAPI = {
  list: (params) => api.get('/rfid/cards', { params }),
  poolStats: () => api.get('/rfid/cards/pool-stats'),
  get: (id) => api.get(`/rfid/cards/${id}`),
  register: (data) => api.post('/rfid/cards', data),
  assignPermanent: (cardId, data) => api.post(`/rfid/cards/${cardId}/assign-permanent`, data),
  assignTemporary: (cardId, data) => api.post(`/rfid/cards/${cardId}/assign-temporary`, data),
  returnCard: (cardId) => api.post(`/rfid/cards/${cardId}/return`),
  reportLost: (cardId) => api.post(`/rfid/cards/${cardId}/report-lost`),
  disable: (cardId) => api.post(`/rfid/cards/${cardId}/disable`),
  enable: (cardId) => api.post(`/rfid/cards/${cardId}/enable`),
  unlink: (cardId) => api.post(`/rfid/cards/${cardId}/unlink`),
  resolve: (cardUid) => api.get(`/rfid/resolve/${cardUid}`),
};

// Expenses
export const expensesAPI = {
  list: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  stats: (params) => api.get('/expenses/stats', { params }),
};

// Incidents
export const incidentsAPI = {
  list: (params) => api.get('/incidents', { params }),
  create: (data) => api.post('/incidents', data),
  resolve: (id, data) => api.put(`/incidents/${id}/resolve`, data),
};

// Discounts
export const discountsAPI = {
  list: (params) => api.get('/discounts', { params }),
  get: (id) => api.get(`/discounts/${id}`),
  create: (data) => api.post('/discounts', data),
  update: (id, data) => api.patch(`/discounts/${id}`, data),
  delete: (id) => api.delete(`/discounts/${id}`),
};

// Billing (extended)
export const billingAPI = {
  runCycle: () => api.post('/billing/run-cycle'),
  listRuns: (limit = 20) => api.get('/billing/runs', { params: { limit } }),
  calculatePrepaid: (subscriptionId, months, discountId = null) =>
    api.post('/billing/calculate-prepaid', { subscriptionId, months, discountId }),
  generatePrepaid: (subscriptionId, months, discountId = null, paymentMethod = 'cash', notes = null) =>
    api.post('/billing/generate-prepaid', { subscriptionId, months, discountId, paymentMethod, notes }),
  forecast: (days = 30) => api.get('/billing/forecast', { params: { days } }),
  autoSuspend: () => api.post('/billing/auto-suspend'),
};

// Terminals
export const terminalsAPI = {
  list: () => api.get('/terminals'),
  create: (data) => api.post('/terminals', data),
  update: (id, data) => api.put(`/terminals/${id}`, data),
  delete: (id) => api.delete(`/terminals/${id}`),
  stats: () => api.get('/terminals/stats'),
};

// RPC (generic)
export const rpcAPI = {
  call: (fn, params = {}) => api.post(`/rpc/${fn}`, params),
};

// Notifications
export const notificationsAPI = {
  list: (params) => api.get('/notifications', { params }),
  stats: () => api.get('/notifications/stats'),
  send: (data) => api.post('/notifications', data),
  templates: () => api.get('/notifications/templates'),
  sendAlert: (data) => api.post('/notifications/send-alert', data),
  processQueue: () => api.post('/notifications/process-queue'),
  pushVapidKey: () => api.get('/notifications/push/vapid-key'),
  pushSubscribe: (subscription) => api.post('/notifications/push/subscribe', { subscription }),
  pushUnsubscribe: (endpoint) => api.post('/notifications/push/unsubscribe', { endpoint }),
  pushStatus: () => api.get('/notifications/push/status'),
  pushSend: (data) => api.post('/notifications/push/send', data),
};
