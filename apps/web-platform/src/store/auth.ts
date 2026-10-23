/**
 * Auth store — Google Sign-In + Firebase Phone OTP + backend JWT
 */
import { create } from 'zustand';
import { ConfirmationResult } from 'firebase/auth';
import { sendOTP, verifyOTP, signInWithGoogle } from '../services/firebase';
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
  sendOtp:     (phone: string) => Promise<void>;
  verifyOtp:   (otp: string, name?: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout:      () => void;
  fetchProfile: () => Promise<void>;
}

// Helper: exchange Firebase ID token for our backend JWT
async function exchangeToken(idToken: string, name?: string, email?: string) {
  const res = await api.post('/auth/firebase-verify', {
    id_token: idToken,
    name:     name  || undefined,
    email:    email || undefined,
  });
  localStorage.setItem('safiri_token', res.data.token);
  return res.data.user;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:               null,
  isAuthenticated:    !!localStorage.getItem('safiri_token'),
  loading:            false,
  confirmationResult: null,

  // ── Google Sign-In ──────────────────────────────────────────────────────────
  loginGoogle: async () => {
    set({ loading: true });
    try {
      const idToken = await signInWithGoogle();
      // Decode name/email from token for auto-registration
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      const user = await exchangeToken(idToken, payload.name, payload.email);
      set({ user, isAuthenticated: true, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  // ── Phone OTP: Step 1 ───────────────────────────────────────────────────────
  sendOtp: async (phone: string) => {
    set({ loading: true });
    try {
      const fullPhone = phone.startsWith('+') ? phone : `+255${phone}`;
      const confirmation = await sendOTP(fullPhone);
      set({ confirmationResult: confirmation, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  // ── Phone OTP: Step 2 ───────────────────────────────────────────────────────
  verifyOtp: async (otp: string, name?: string) => {
    set({ loading: true });
    const { confirmationResult } = get();
    if (!confirmationResult) throw new Error('No OTP session. Please request a new code.');
    try {
      const idToken = await verifyOTP(confirmationResult, otp);
      const user = await exchangeToken(idToken, name);
      set({ user, isAuthenticated: true, loading: false, confirmationResult: null });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  // ── Logout ──────────────────────────────────────────────────────────────────
  logout: () => {
    localStorage.removeItem('safiri_token');
    set({ user: null, isAuthenticated: false, confirmationResult: null });
  },

  // ── Fetch Profile ───────────────────────────────────────────────────────────
  fetchProfile: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user });
    } catch { /* silent */ }
  },
}));
