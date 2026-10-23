/**
 * Auth store — Firebase Phone OTP + backend JWT
 */
import { create } from 'zustand';
import { ConfirmationResult } from 'firebase/auth';
import { sendOTP, verifyOTP } from '../services/firebase';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  rating?: number;
  user_type?: string;
}

interface AuthState {
  user:               User | null;
  isAuthenticated:    boolean;
  loading:            boolean;
  confirmationResult: ConfirmationResult | null;
  sendOtp:    (phone: string, buttonId: string) => Promise<void>;
  verifyOtp:  (otp: string, name?: string) => Promise<void>;
  logout:     () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:               null,
  isAuthenticated:    !!localStorage.getItem('safiri_token'),
  loading:            false,
  confirmationResult: null,

  sendOtp: async (phone: string, buttonId: string) => {
    set({ loading: true });
    try {
      const fullPhone = phone.startsWith('+') ? phone : `+255${phone}`;
      const confirmation = await sendOTP(fullPhone, buttonId);
      set({ confirmationResult: confirmation, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  verifyOtp: async (otp: string, name?: string) => {
    set({ loading: true });
    const { confirmationResult } = get();
    if (!confirmationResult) throw new Error('No OTP session. Please request a new code.');
    try {
      const idToken = await verifyOTP(confirmationResult, otp);
      const res = await api.post('/auth/firebase-verify', {
        id_token: idToken,
        name: name || undefined,
      });
      localStorage.setItem('safiri_token', res.data.token);
      set({
        user:               res.data.user,
        isAuthenticated:    true,
        loading:            false,
        confirmationResult: null,
      });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('safiri_token');
    set({ user: null, isAuthenticated: false, confirmationResult: null });
  },

  fetchProfile: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user });
    } catch {
      // silent
    }
  },
}));
