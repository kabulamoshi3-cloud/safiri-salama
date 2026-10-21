import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  to: string;
  labelKey: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',            labelKey: 'nav_dashboard',  icon: '📊' },
  { to: '/drivers',     labelKey: 'nav_drivers',    icon: '🚗' },
  { to: '/passengers',  labelKey: 'nav_passengers', icon: '👤' },
  { to: '/trips',       labelKey: 'nav_trips',      icon: '📍' },
  { to: '/settings',    labelKey: 'nav_settings',   icon: '⚙️' },
];

export default function Layout() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 'var(--sidebar-width)',
          minWidth: 'var(--sidebar-width)',
          background: 'var(--color-sidebar-bg)',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--color-sidebar-border)',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: '20px 16px',
            borderBottom: '1px solid var(--color-sidebar-border)',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--color-accent)',
              letterSpacing: '-0.5px',
            }}
          >
            🚕 DalaSmart
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-sidebar-text)',
              marginTop: '2px',
              opacity: 0.6,
            }}
          >
            Admin Panel
          </div>
        </div>

        {/* Navigation */}
        <nav
          style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                color: isActive
                  ? 'var(--color-accent)'
                  : 'var(--color-sidebar-text)',
                background: isActive ? 'var(--color-accent-light)' : 'transparent',
                borderLeft: isActive
                  ? '3px solid var(--color-accent)'
                  : '3px solid transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: '14px',
                transition: 'all 0.15s',
                textDecoration: 'none',
              })}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div
          style={{
            padding: '12px',
            borderTop: '1px solid var(--color-sidebar-border)',
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid var(--color-sidebar-border)',
              borderRadius: '6px',
              color: 'var(--color-sidebar-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <span aria-hidden="true">🚪</span>
            {t('nav_logout')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            background: 'var(--color-content-bg)',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
