import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import React from 'react';

// Layout uses useAuth and useTranslation; mock both
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    token: 'admin-token',
    setToken: vi.fn(),
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => {
      // Return human-readable labels matching NAV_ITEMS labelKeys in Layout.tsx
      const map: Record<string, string> = {
        nav_overview: 'Overview',
        nav_users: 'Users',
        nav_drivers: 'Drivers',
        nav_fleet: 'Fleet',
        nav_trips: 'Trips',
        nav_finance: 'Finance',
        nav_pricing: 'Pricing',
        nav_promotions: 'Promotions',
        nav_analytics: 'Analytics',
        nav_support: 'Support',
        nav_staff: 'Staff',
        nav_passengers: 'Passengers',
        nav_settings: 'Settings',
        nav_logout: 'Logout',
        nav_live_map: 'Live Map',
      };
      return map[k] ?? k;
    },
  }),
}));

// Mock all pages to avoid deep rendering
const MockPage = () => <div />;
vi.mock('../pages/Dashboard', () => ({ default: MockPage }));
vi.mock('../pages/Users', () => ({ default: MockPage }));
vi.mock('../pages/Drivers', () => ({ default: MockPage }));
vi.mock('../pages/Fleet', () => ({ default: MockPage }));
vi.mock('../pages/Trips', () => ({ default: MockPage }));
vi.mock('../pages/Finance', () => ({ default: MockPage }));
vi.mock('../pages/Pricing', () => ({ default: MockPage }));
vi.mock('../pages/Promotions', () => ({ default: MockPage }));
vi.mock('../pages/Analytics', () => ({ default: MockPage }));
vi.mock('../pages/Support', () => ({ default: MockPage }));
vi.mock('../pages/StaffRoles', () => ({ default: MockPage }));
vi.mock('../pages/Passengers', () => ({ default: MockPage }));
vi.mock('../pages/Settings', () => ({ default: MockPage }));
vi.mock('../pages/Login', () => ({ default: MockPage }));
vi.mock('../components/RequireAuth', () => ({
  default: ({ children }: any) => children,
}));

import Layout from '../components/Layout';

describe('Admin Panel Layout navigation', () => {
  it('renders sidebar with Overview link', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('renders sidebar with Drivers link', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    );
    expect(screen.getByText('Drivers')).toBeInTheDocument();
  });

  it('renders sidebar with all main nav items', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    );
    expect(screen.getByText('Trips')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders logout button', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>
    );
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
});
