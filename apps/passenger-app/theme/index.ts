import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

export const lightTheme = {
  background: '#ffffff',
  surface: '#f8f9fa',
  card: '#ffffff',
  text: '#1c1c1e',
  textSecondary: '#8e8e93',
  primary: '#34c759',
  primaryDark: '#28a745',
  border: '#f0f0f0',
  inputBg: '#f2f2f7',
  danger: '#ff3b30',
  warning: '#ff9500',
  success: '#34c759',
  mapBg: '#e8f5e9',
  tabBar: '#ffffff',
  statusBar: 'dark' as const,
};

export const darkTheme = {
  background: '#000000',
  surface: '#1c1c1e',
  card: '#2c2c2e',
  text: '#ffffff',
  textSecondary: '#8e8e93',
  primary: '#30d158',
  primaryDark: '#28a745',
  border: '#38383a',
  inputBg: '#2c2c2e',
  danger: '#ff453a',
  warning: '#ff9f0a',
  success: '#30d158',
  mapBg: '#1c1c1e',
  tabBar: '#1c1c1e',
  statusBar: 'light' as const,
};

export type Theme = typeof lightTheme;

let currentTheme: ThemeMode = 'light';
let listeners: (() => void)[] = [];

export const themeManager = {
  getTheme(): Theme {
    return currentTheme === 'dark' ? darkTheme : lightTheme;
  },

  getMode(): ThemeMode {
    return currentTheme;
  },

  async setMode(mode: ThemeMode) {
    currentTheme = mode;
    await AsyncStorage.setItem('@dalasmart:theme', mode);
    listeners.forEach(fn => fn());
  },

  async toggle() {
    const newMode = currentTheme === 'light' ? 'dark' : 'light';
    await this.setMode(newMode);
  },

  async loadSaved() {
    const saved = await AsyncStorage.getItem('@dalasmart:theme');
    if (saved === 'dark' || saved === 'light') currentTheme = saved;
  },

  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  },
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(themeManager.getTheme());
  const [mode, setMode] = useState<ThemeMode>(themeManager.getMode());

  useEffect(() => {
    const unsub = themeManager.subscribe(() => {
      setTheme(themeManager.getTheme());
      setMode(themeManager.getMode());
    });
    return unsub;
  }, []);

  return { theme, mode, toggle: () => themeManager.toggle() };
}
