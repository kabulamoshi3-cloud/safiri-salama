import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIClient } from '../services/api/client';
import type { User } from '../types/shared';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (phoneNumber: string, password: string) => Promise<void>;
  register: (
    name: string,
    phoneNumber: string,
    password: string,
    licenseNumber: string,
    plateNumber: string,
    vehicleType: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@skyrex:token';
const USER_KEY = '@skyrex:user';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    phone?: string;
    phone_number?: string;
    name: string;
    email?: string;
    userType?: User['type'];
    user_type?: User['type'];
  };
}

function normalizeUser(user: AuthResponse['user']): User {
  return {
    id: user.id,
    phone: user.phone_number || user.phone || '',
    name: user.name,
    email: user.email,
    type: user.userType || user.user_type || 'driver',
  };
}

async function saveAuth(response: AuthResponse) {
  const normalizedUser = normalizeUser(response.user);
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, response.token),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(normalizedUser)),
  ]);
  return normalizedUser;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phoneNumber: string, password: string) => {
    try {
      const response = await APIClient.post<AuthResponse>('/auth/login', {
        phone: phoneNumber.trim(),
        password,
      });
      const normalizedUser = await saveAuth(response);
      setToken(response.token);
      setUser(normalizedUser);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (
    name: string,
    phoneNumber: string,
    password: string,
    licenseNumber: string,
    plateNumber: string,
    vehicleType: string
  ) => {
    try {
      const response = await APIClient.post<AuthResponse>('/auth/register', {
        name: name.trim(),
        phone: phoneNumber.trim(),
        password,
        user_type: 'driver',
        license_number: licenseNumber.trim(),
        plate_number: plateNumber.trim(),
        vehicle_type: vehicleType,
      });
      const normalizedUser = await saveAuth(response);
      setToken(response.token);
      setUser(normalizedUser);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

