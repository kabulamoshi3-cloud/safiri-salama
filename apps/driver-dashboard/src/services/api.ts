/**
 * Axios API client for Driver Dashboard
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('driver_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally - redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('driver_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
