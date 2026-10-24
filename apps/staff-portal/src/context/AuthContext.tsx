import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

const TOKEN_KEY = 'staff_token';

export type UserRole = 'admin' | 'operator' | 'super_admin';

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
}

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  userProfile: UserProfile | null;
  setToken: (token: string) => void;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  );
  const [role, setRole] = useState<UserRole | null>(
    () => (localStorage.getItem('staff_role') as UserRole) || null
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const setToken = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setTokenState(newToken);
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const BASE_URL =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
      'http://localhost:3000/api/v1';
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.error || 'Login failed');
    }

    const data = await response.json();
    const newToken = data.token;
    const userType = data.user?.userType || data.user?.type;
    
    if (!userType) {
      throw new Error('Login response missing user type field');
    }
    
    const detectedRole: UserRole =
      userType === 'operator'
        ? 'operator'
        : userType === 'super_admin' || userType === 'superadmin'
        ? 'super_admin'
        : 'admin';

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem('staff_role', detectedRole);
    setTokenState(newToken);
    setRole(detectedRole);
    setUserProfile({
      name: data.user?.name || '',
      phone: data.user?.phone || phone,
      email: data.user?.email || '',
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('staff_role');
    setTokenState(null);
    setRole(null);
    setUserProfile(null);
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!token || !role) return;

    const BASE_URL =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
      'http://localhost:3000/api/v1';
    const endpoint = role === 'operator' ? '/operators/me' : '/admin/profile';

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile({
          name: data.name || data.user?.name || '',
          phone: data.phone || data.user?.phone || '',
          email: data.email || data.user?.email || '',
        });
      }
    } catch {
      // ignore fetch errors
    }
  }, [token, role]);

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        role,
        userProfile,
        setToken,
        login,
        logout,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default AuthContext;
