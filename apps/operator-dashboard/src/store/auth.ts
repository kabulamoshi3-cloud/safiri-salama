/**
 * Auth store using Zustand — Operator Dashboard
 */

import { create } from 'zustand';
import api from '../services/api';

interface Operator {
  id: string;
  name: string;
  phone: string;
  email: string;
  fleet_name: string;
  status: string;
}

interface AuthState {
  operator: Operator | null;
  isAuthenticated: boolean;
  loading: boolean;
  token: string | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  operator: null,
  isAuthenticated: !!localStorage.getItem('operator_token'),
  loading: false,
  token: localStorage.getItem('operator_token'),

  login: async (phone: string, password: string) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', { phone, password });
      localStorage.setItem('operator_token', res.data.token);
      set({
        operator: res.data.operator,
        isAuthenticated: true,
        loading: false,
        token: res.data.token,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('operator_token');
    set({ operator: null, isAuthenticated: false, token: null });
  },

  fetchProfile: async () => {
    try {
      const res = await api.get('/operators/me');
      set({ operator: res.data });
    } catch {
      // ignore
    }
  },
}));
