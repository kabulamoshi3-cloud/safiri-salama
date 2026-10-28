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
  register:     (phone: string, password: string, name: string, email?: string) => Promise<void>;
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
  register: async (phone, password, name, email) => {
    set({ loading: true });
    try {
      const body: Record<string, string> = { phone, password, name };
      if (email?.trim()) body.email = email.trim();
      const res = await api.post('/auth/register', body);
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

      // Safely decode name/email from token
      let name = '';
      let email = '';
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        name  = payload.name  || payload.email || '';
        email = payload.email || '';
      } catch { /* ignore decode errors */ }

      const res = await api.post('/auth/firebase-verify', {
        id_token: idToken,
        name,
        email,
      });
      localStorage.setItem('safiri_token', res.data.token);
      set({ user: res.data.user, isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ loading: false });
      // Rethrow with clean message
      const code = err?.code || '';
      const msg  = err?.response?.data?.error || err?.message || 'Google sign-in failed';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw new Error('__CANCELLED__'); // signal to UI to stay silent
      }
      if (code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized. Please contact support.');
      }
      if (code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by your browser. Please allow popups for this site.');
      }
      throw new Error(msg);
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
