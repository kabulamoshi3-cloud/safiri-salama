import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://skyrex-api.vercel.app/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('safiri_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
