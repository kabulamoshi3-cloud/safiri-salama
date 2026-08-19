/**
 * Auth store using Zustand
 */

import { create } from 'zustand';
import api from '../services/api';

interface Driver {
  id: string;
  name: string;
  phone_number: string;
  email: string;
  vehicle_plate: string;
  avatar_url: string;
  rating: number;
  status: 'active' | 'inactive' | 'suspended';
}

interface AuthState {
  driver: Driver | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  driver: null,
  isAuthenticated: !!localStorage.getItem('driver_token'),
  loading: false,

  login: async (phone: string, password: string) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/driver/login', { phone_number: phone, password });
      localStorage.setItem('driver_token', res.data.token);
      set({ driver: res.data.driver, isAuthenticated: true, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('driver_token');
    set({ driver: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const res = await api.get('/drivers/me');
      set({ driver: res.data });
    } catch {
      // ignore
    }
  },
}));
