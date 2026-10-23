/**
 * Auth store
 * - Phone + Password (register / login)
 * - Google Sign-In
 */
import { create } from 'zustand';
import { signInWithGoogle } from '../services/firebase';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  user_type?: string;
}

interface AuthState {
  user:            User | null;
  isAuthenticated: boolean;
  loading:         boolean;
  register:     (phone: string, password: string, name: string) => Promise<void>;
  login:        (phone: string, password: string) => Promise<void>;
  loginGoogle:  () => Promise<void>;
  logout:       () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  isAuthenticated: !!localStorage.getItem('safiri_token'),
  loading:         false,

  // ── Register ────────────────────────────────────────────────────────────────
  register: async (phone, password, name) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/register', { phone, password, name });
      localStorage.setItem('safiri_token', res.data.token);
      set({ user: res.data.user, isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ loading: false });
      throw new Error(err?.response?.data?.error || 'Registration failed');
    }
  },

  // ── Login ───────────────────────────────────────────────────────────────────
  login: async (phone, password) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', { phone, password });
      localStorage.setItem('safiri_token', res.data.token);
      set({ user: res.data.user, isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ loading: false });
      throw new Error(err?.response?.data?.error || 'Login failed');
    }
  },

  // ── Google Sign-In ──────────────────────────────────────────────────────────
  loginGoogle: async () => {
    set({ loading: true });
    try {
      const idToken = await signInWithGoogle();
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      const res = await api.post('/auth/firebase-verify', {
        id_token: idToken,
        name:  payload.name,
        email: payload.email,
      });
      localStorage.setItem('safiri_token', res.data.token);
      set({ user: res.data.user, isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ loading: false });
      throw err;
    }
  },

  // ── Logout ──────────────────────────────────────────────────────────────────
  logout: () => {
    localStorage.removeItem('safiri_token');
    set({ user: null, isAuthenticated: false });
  },

  // ── Fetch Profile ───────────────────────────────────────────────────────────
  fetchProfile: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user });
    } catch { /* silent */ }
  },
}));
