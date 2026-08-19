import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Theme {
  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    background: string;
    surface: string;
    error: string;
    success: string;
    warning: string;
    text: string;
    textSecondary: string;
    border: string;
    disabled: string;
    white: string;
    black: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: { fontSize: number; fontWeight: string };
    h2: { fontSize: number; fontWeight: string };
    h3: { fontSize: number; fontWeight: string };
    body: { fontSize: number; fontWeight: string };
    caption: { fontSize: number; fontWeight: string };
  };
}

const lightTheme: Theme = {
  colors: {
    primary: '#FF6B35',
    primaryDark: '#E55A2A',
    secondary: '#004E89',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    error: '#DC3545',
    success: '#28A745',
    warning: '#FFC107',
    text: '#212529',
    textSecondary: '#6C757D',
    border: '#DEE2E6',
    disabled: '#CED4DA',
    white: '#FFFFFF',
    black: '#000000',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' },
    h2: { fontSize: 24, fontWeight: 'bold' },
    h3: { fontSize: 18, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: 'normal' },
    caption: { fontSize: 14, fontWeight: 'normal' },
  },
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ theme: lightTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
