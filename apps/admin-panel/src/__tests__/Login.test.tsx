import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock the login function from api.ts — exact export name from services/api.ts
vi.mock('../services/api', () => ({
  login: vi.fn(),
}));

// Mock i18next — Login.tsx uses useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Mock AuthContext — Login.tsx calls setToken on success
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    setToken: vi.fn(),
    token: null,
    isAuthenticated: false,
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import Login from '../pages/Login';
import * as api from '../services/api';

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders phone input field', () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    // Login.tsx has <input id="phone" type="tel" placeholder="+255 7xx xxx xxx">
    expect(screen.getByPlaceholderText('+255 7xx xxx xxx')).toBeInTheDocument();
  });

  it('renders password input field', () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByLabelText('password')).toBeInTheDocument();
  });

  it('shows login_error when non-admin user logs in', async () => {
    (api.login as any).mockResolvedValue({
      token: 'tok',
      user: { id: '1', userType: 'passenger', name: 'Test', phone: '', status: 'active' },
    });
    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('+255 7xx xxx xxx'), {
      target: { value: '+255700000000' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      // Login.tsx sets setError(t('login_error')) — with mocked t, it becomes 'login_error'
      expect(screen.getByRole('alert')).toHaveTextContent('login_error');
    });
  });

  it('does not navigate to / when non-admin user logs in', async () => {
    (api.login as any).mockResolvedValue({
      token: 'tok',
      user: { id: '1', userType: 'passenger', name: 'Test', phone: '', status: 'active' },
    });
    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('+255 7xx xxx xxx'), {
      target: { value: '+255700000000' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('calls login API with provided credentials', async () => {
    (api.login as any).mockResolvedValue({
      token: 'admin-token',
      user: { id: '1', userType: 'admin', name: 'Admin User', phone: '', status: 'active' },
    });
    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('+255 7xx xxx xxx'), {
      target: { value: '+255700000001' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: 'adminpass' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('+255700000001', 'adminpass');
    });
  });
});
