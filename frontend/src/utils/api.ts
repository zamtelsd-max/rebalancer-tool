import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3006/api/v1';

export const api = axios.create({ baseURL: API_BASE, timeout: 30000 });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('rb_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401 && !window.location.hash.includes('/login')) {
    localStorage.removeItem('rb_token');
    localStorage.removeItem('rb_user');
    window.location.hash = '#/login';
  }
  return Promise.reject(err);
});

export default api;
