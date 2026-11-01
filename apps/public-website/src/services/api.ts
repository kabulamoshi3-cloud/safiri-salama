import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://safiri-salama.vercel.app/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Use same key as web-platform so tokens are shared across both apps on same domain
  const token = localStorage.getItem('safiri_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
