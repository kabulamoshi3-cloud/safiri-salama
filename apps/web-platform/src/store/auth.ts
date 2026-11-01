/**
 * Auth store — SkyRex Web Platform
 * Phone + Password register/login + Google Sign-In
 */
import { create } from 'zustand';
import { signInWithGoogle } from '../services/firebase';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  userType?: string;
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

const TOKEN_KEY = 'safiri_token';

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  loading:         false,

  // ── Register ──────────────────────────────────────────────────────────────
  register: async (phone, password, name, email) => {
    set({ loading: true });
    try {
      const body: Record<string, string> = {
        phone,
        password,
        name,
        user_type: 'passenger', // always passenger from web app
      };
      if (email?.trim()) body.email = email.trim();

      const res = await api.post('/auth/register', body);
      localStorage.setItem(TOKEN_KEY, res.data.token);
      set({ user: res.data.user, isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ loading: false });
      const msg = err?.response?.data?.error || 'Registration failed. Please try again.';
      throw new Error(msg);
    }
  },

  // ── Login ─────────────────────────────────────────────────────────────────
  login: async (phone, password) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', { phone, password });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      set({ user: res.data.user, isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ loading: false });
      const status = err?.response?.status;
      if (status === 401) throw new Error('Incorrect phone number or password.');
      if (status === 403) throw new Error('Account suspended. Contact support.');
      if (!err.response) throw new Error('Cannot connect to server. Check your internet.');
      throw new Error(err?.response?.data?.error || 'Login failed. Please try again.');
    }
  },

  // ── Google Sign-In ────────────────────────────────────────────────────────
  loginGoogle: async () => {
    set({ loading: true });
    try {
      const idToken = await signInWithGoogle();

      let name = '';
      let email = '';
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        name  = payload.name  || payload.email || '';
        email = payload.email || '';
      } catch { /* ignore decode errors */ }

      const res = await api.post('/auth/firebase-verify', { id_token: idToken, name, email });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      set({ user: res.data.user, isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ loading: false });
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw new Error('__CANCELLED__');
      }
      if (code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized for Google Sign-In. Contact support.');
      }
      if (code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }
      throw new Error(err?.response?.data?.error || err?.message || 'Google sign-in failed.');
    }
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, isAuthenticated: false });
  },

  // ── Fetch Profile ─────────────────────────────────────────────────────────
  fetchProfile: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user, isAuthenticated: true });
    } catch {
      // Token expired or invalid — clear it
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, isAuthenticated: false });
    }
  },
}));
