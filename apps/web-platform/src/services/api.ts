/**
 * Axios API client for Web Platform
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://skyrex-api.vercel.app/api/v1',
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
    const requestUrl = error.config?.url || '';
    const isAuthRequest = /\/auth\/(login|register|firebase-verify)$/.test(requestUrl);
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('safiri_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
