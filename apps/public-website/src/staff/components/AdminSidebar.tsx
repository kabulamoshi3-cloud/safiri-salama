import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserProfile, UserRole } from '../context/AuthContext';

interface NavItem {
  to: string;
  labelKey: string;
  icon: string;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/admin',            labelKey: 'nav_overview',    icon: '📊' },
  { to: '/admin/users',      labelKey: 'nav_users',       icon: '👤' },
  { to: '/admin/drivers',    labelKey: 'nav_drivers',     icon: '🚗' },
  { to: '/admin/fleet',      labelKey: 'nav_fleet',       icon: '🚙' },
  { to: '/admin/trips',      labelKey: 'nav_trips',       icon: '📍' },
  { to: '/admin/finance',    labelKey: 'nav_finance',     icon: '💰' },
  { to: '/admin/pricing',    labelKey: 'nav_pricing',     icon: '💵' },
  { to: '/admin/promotions', labelKey: 'nav_promotions',  icon: '🎁' },
  { to: '/admin/analytics',  labelKey: 'nav_analytics',   icon: '📈' },
  { to: '/admin/support',    labelKey: 'nav_support',     icon: '💬' },
  { to: '/admin/staff',      labelKey: 'nav_staff',       icon: '👥' },
  { to: '/admin/settings',   labelKey: 'nav_settings',    icon: '⚙️' },
];

const OPS_NAV_ITEMS: NavItem[] = [
  { to: '/ops',              labelKey: 'nav_live_overview',  icon: '🗺️' },
  { to: '/ops/dispatch',     labelKey: 'nav_dispatch',       icon: '📡' },
  { to: '/ops/live-map',     labelKey: 'nav_live_map',       icon: '🌍' },
  { to: '/ops/active-trips', labelKey: 'nav_active_trips',   icon: '🚦' },
  { to: '/ops/drivers',      labelKey: 'nav_drivers',        icon: '🚗' },
  { to: '/ops/incidents',    labelKey: 'nav_incidents',      icon: '⚠️' },
  { to: '/ops/cancellations',labelKey: 'nav_cancellations',  icon: '❌' },
  { to: '/ops/demand-supply',labelKey: 'nav_demand_supply',  icon: '📊' },
  { to: '/ops/support-queue',labelKey: 'nav_support_queue',  icon: '💬' },
  { to: '/ops/service-alerts',labelKey: 'nav_service_alerts',icon: '🔔' },
  { to: '/ops/fleet',        labelKey: 'nav_fleet',          icon: '🚙' },
  { to: '/ops/earnings',     labelKey: 'nav_earnings',       icon: '💵' },
  { to: '/ops/reports',      labelKey: 'nav_reports',        icon: '📈' },
];

interface AdminSidebarProps {
  userProfile: UserProfile | null;
  onLogout: () => void;
  role?: UserRole;
}

export default function AdminSidebar({ userProfile, onLogout, role }: AdminSidebarProps) {
  const { t } = useTranslation();
  const isSuperAdmin = role === 'super_admin';

  const renderNavItem = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/admin' || item.to === '/ops'}
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
  );

  return (
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
          🚕 Safiri Haraka
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
        {isSuperAdmin && (
          <div style={{ padding: '4px 16px 2px', fontSize: '10px', fontWeight: 600, color: 'var(--color-sidebar-text)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Admin
          </div>
        )}
        {ADMIN_NAV_ITEMS.map(renderNavItem)}

        {isSuperAdmin && (
          <>
            <div style={{ height: '1px', background: 'var(--color-sidebar-border)', margin: '8px 16px' }} />
            <div style={{ padding: '4px 16px 2px', fontSize: '10px', fontWeight: 600, color: 'var(--color-sidebar-text)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Operations
            </div>
            {OPS_NAV_ITEMS.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* Logout */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid var(--color-sidebar-border)',
        }}
      >
        <button
          onClick={onLogout}
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
  );
}
