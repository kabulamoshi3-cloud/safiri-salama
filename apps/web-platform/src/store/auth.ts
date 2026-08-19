/**
 * Auth store for Web Platform (Zustand)
 * Handles phone + OTP login flow
 */

import { create } from 'zustand';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  rating?: number;
}

interface Subscription {
  has_subscription: boolean;
  plan_name?: string;
  discount_percentage?: number;
  renews_at?: string;
}

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  loading: boolean;
  /** Step 1: send OTP */
  login: (phone: string) => Promise<void>;
  /** Step 2: verify OTP and store token */
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:           null,
  subscription:   null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading:        false,

  login: async (phone) => {
    set({ loading: true });
    try {
      await api.post('/auth/send-otp', { phone_number: `+254${phone}` });
    } finally {
      set({ loading: false });
    }
  },

  verifyOtp: async (phone, otp) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/verify-otp', {
        phone_number: `+254${phone}`,
        otp,
      });
      localStorage.setItem('token', res.data.token);
      set({ user: res.data.user, isAuthenticated: true, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, subscription: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const res = await api.get('/users/me');
      set({ user: res.data });
    } catch {/* silent */}
  },

  fetchSubscription: async () => {
    try {
      const res = await api.get('/subscription/status');
      set({ subscription: res.data });
    } catch {/* silent */}
  },
}));
