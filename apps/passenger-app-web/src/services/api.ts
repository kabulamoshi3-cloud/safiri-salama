import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://safiriharaka-api.vercel.app/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('safiri_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    const isAuthRoute = /\/auth\/(login|register|firebase-verify)$/.test(url);
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('safiri_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
